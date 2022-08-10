class StocksPortfolio {
  initStocks () {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS Stock
      (
        StockId  INTEGER PRIMARY KEY AUTOINCREMENT,
        Symbol   TEXT    UNIQUE
      )
    `)

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS StockUser
      (
        StockUserId  INTEGER PRIMARY KEY AUTOINCREMENT,
        StockId      INTEGER,
        UserId       TEXT,
        UNIQUE (StockId, UserId),
        FOREIGN KEY (StockId) REFERENCES Stock(StockId) ON DELETE CASCADE
      )
    `)
  }

  checkForStock (symbol) {
    return this.reduceStocks(this.runQuery(`
      SELECT s.Symbol AS symbol, su.UserId AS userId
      FROM Stock s
      LEFT JOIN StockUser su
      ON su.StockId = s.StockId
      WHERE s.Symbol = ?
    `, symbol))
  }

  writeStock (symbol) {
    this.run("INSERT INTO Stock (Symbol) VALUES (?)", symbol)
  }

  checkForUser (symbol, user) {
    const stockItem = this.checkForStock(symbol)
    return (stockItem[0].users.includes(user))
  }

  addUser (symbol, user) {
    const stockExists = this.checkForStock(symbol)

    if (!stockExists.length) {
      this.writeStock(symbol)
    }

    const userExists = this.checkForUser(symbol, user)

    if (userExists) {
      return false
    }
    else {
      this.run(`INSERT INTO StockUser (StockId, UserId) VALUES ((SELECT StockId FROM Stock WHERE Symbol = ?), ?)`, symbol, user)
      return true
    }
  }

  removeUser (symbol, user) {
    const stockExists = this.checkForStock(symbol)

    if (!stockExists.length) {
      this.writeStock(symbol)
    }

    const userExists = this.checkForUser(symbol, user)

    if (userExists) {
      this.run(`
        DELETE FROM StockUser AS su
        WHERE su.StockId IN (SELECT s.StockId FROM Stock s WHERE s.Symbol = ?)
          AND su.UserId = ?
      `, symbol, user)

      this.run(`
        DELETE FROM Stock AS s
        WHERE s.Symbol = ?
          AND NOT EXISTS(SELECT su.StockId FROM StockUser su WHERE su.StockId = s.StockId)
      `, symbol)

      return true
    }
    else {
      return false
    }
  }

  listStocks (user) {
    return this.runQuery(`
      SELECT s.Symbol AS symbol
      FROM Stock s
      JOIN StockUser su
      ON su.StockId = s.StockId
      WHERE su.UserId = ?
    `, user)
  }

  reduceStocks (stocks) {
    return stocks.reduce(([map, arr], { symbol, userId }) => {
      if (!map.has(symbol)) {
        map.set(symbol, arr.push({ symbol, users: [] }) - 1)
      }

      if (userId) {
        arr[map.get(symbol)].users.push(userId)
      }

      return [map, arr]
    }, [new Map(), []])[1]
  }

  static applyToClass (structure) {
    for (const prop of Object.getOwnPropertyNames(StocksPortfolio.prototype).slice(1)) {
      Object.defineProperty(structure.prototype, prop, Object.getOwnPropertyDescriptor(StocksPortfolio.prototype, prop))
    }
  }
}

export default StocksPortfolio