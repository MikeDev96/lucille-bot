const { assign } = require("lodash")
const low = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")

module.exports = class {
  constructor (client) {
    this.client = client
    this.monitor = {}
    this.initDB()
  }

  initDB () {
    const adapter = new FileSync("stocks.json")
    this.db = low(adapter)

    this.db.defaults({ stocks: [] })
      .write()
  }

  checkForStock (symbol) {
    return this.db.get("stocks")
      .filter({ symbol: symbol })
      .take(1)
      .value()
  }

  writeStock (symbol) {
    this.db.get("stocks")
      .push({
        symbol: symbol,
        users: [],
      })
      .write()
  }

  checkForUser (symbol, user) {
    var stockItem = this.db.get("stocks")
      .filter({ symbol: symbol })
      .take(1)
      .value()

    return (stockItem[0].users.includes(user))
  }

  addUser (symbol, user) {
    var stockExists = this.checkForStock(symbol)

    if (!stockExists.length) {
      this.writeStock(symbol)
    }

    var userExists = this.checkForUser(symbol, user)

    if (userExists) {
      return false
    }
    else {
      const data = this.db.get("stocks")
        .filter({ symbol: symbol })
        .take(1)
        .value()

      data[0].users.push(user)

      this.db.get("stocks")
        .find({ symbol: symbol })
        .assign(data[0])
        .write()

      return true
    }
  }

  removeUser (symbol, user) {
    var stockExists = this.checkForStock(symbol)

    if (!stockExists.length) {
      this.writeStock(symbol)
    }

    var userExists = this.checkForUser(symbol, user)

    if (userExists) {
      const data = this.db.get("stocks")
        .find(e => {
          return e.symbol.includes(symbol) && (e.users.includes(user))
        })
        .value()

      const indexOfUser = data.users.indexOf(user)

      if (data.users.length === 1) {
        var allData = this.db.get("stocks").value()
        var stockIndex = allData.indexOf(data)

        if (stockIndex > -1) allData.splice(stockIndex, 1)

        this.db.get("stock")
          .assign(allData)
          .write()
      }
      else {
        if (indexOfUser > -1) data[0].users.splice(indexOfUser, 1)

        this.db.get("stocks")
          .find({ symbol: symbol })
        assign(data)
          .write()
      }

      this.db.get("stocks")
        .find({ symbol: symbol })
        .assign(data)
        .write()

      return true
    }
    else {
      return false
    }
  }

  listStocks (user) {
    return this.db.get("stocks")
      .filter({ users: [user] })
      .value()
  }
}