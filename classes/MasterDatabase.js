const SQLite = require("better-sqlite3")

module.exports = class {
  constructor () {
    this.db = new SQLite("main.db", { readonly: false })
    this.initTables()
  }

  // probably needs some proper ERD setting up..
  initTables () {
    // PenisSize command
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS PenisSize (
        Id          INTEGER PRIMARY KEY AUTOINCREMENT,
        UserId      TEXT,
        ServerId    TEXT, 
        Size        INTEGER,

        DailyPP     INTEGER DEFAULT -1
      );
    `)

      // DISPLAY NAME
      .exec(`
       CREATE TABLE IF NOT EXISTS UserInfo (
          UserId      TEXT,
          ServerId    TEXT,
          DisplayName TEXT,
          PRIMARY KEY (UserId, ServerId)
        ) 
      `)

      .exec(`
       CREATE TABLE IF NOT EXISTS Settings (
          Id        INTEGER PRIMARY KEY AUTOINCREMENT,
          ServerId  TEXT,
          Key       TEXT,
          Value     TEXT,
          DataType  TEXT
        ) 
      `)

      .exec(`
       CREATE TABLE IF NOT EXISTS ConnectFour (
          Id          INTEGER PRIMARY KEY AUTOINCREMENT,
          ServerId    TEXT,
          PlayerOne   TEXT,
          PlayerTwo   TEXT,
          Winner      TEXT
        )
      `)

      .exec(`
       CREATE TABLE IF NOT EXISTS TicTacToe (
          Id          INTEGER PRIMARY KEY AUTOINCREMENT,
          ServerId    TEXT,
          PlayerOne   TEXT,
          PlayerTwo   TEXT,
          Winner      TEXT
        )
      `)

    // probably should use some sort of versioning? maybe user_version
    if (!this.columnExists("PenisSize", "DailyPP")) {
      this.db.exec("ALTER TABLE PenisSize ADD COLUMN DailyPP INTEGER DEFAULT -1")
      console.log("Added DailyPP to PenisSize.")
    }

    console.log("Master database initialised")
  }

  columnExists (tblName, clmName) {
    const rslts = this.runQuery("SELECT * FROM pragma_table_info(?) WHERE [name] = ?", tblName, clmName)
    return rslts.length > 0
  }

  /**
   * Query is expected to run without returning any data
   * @param {string} query - Parameter based SQL query
   * @param  {...any} params - Params provided to the query
   */
  run (query, ...params) {
    const stmt = this.db.prepare(query)
    const result = stmt.run(...params)
    return result
  }

  /**
   * Query is expected to an array of results
   * @param {string} query - Parameter based SQL query
   * @param  {...any} params - Params provided to the query
   */
  runQuery (query, ...params) {
    const stmt = this.db.prepare(query)
    const result = stmt.all(...params)
    return result
  }

  /**
   * Query is expected to return 1 result
   * @param {string} query - Parameter based SQL query
   * @param  {...any} params - Params provided to the query
   */
  runScalarQuery (query, ...params) {
    const stmt = this.db.prepare(query)
    const result = stmt.get(...params)
    return result
  }

  /**
   * Used for getting the Authors penis size, not server wide
   * @param {string} user - Discord author id
   */
  getPenisSize (user, server, permPP, dailyPP) {
    const rslts = this.runScalarQuery("SELECT Size, DailyPP FROM PenisSize WHERE UserId = ? AND ServerId = ?", user, server)

    // if rslts is undefined we didn't find a user in the db so insert one.
    if (!rslts) {
      this.run("INSERT INTO PenisSize ([UserId], [ServerId], [Size], [DailyPP]) VALUES (?, ?, ?, ?)", user, server, permPP, dailyPP)
      return permPP === -1 ? dailyPP : permPP
    }
    else {
      if (rslts.Size === -1 && permPP !== -1) {
        this.run("UPDATE PenisSize SET Size = ? WHERE UserId = ? AND ServerId = ?", permPP, user, server)
        return permPP
      }

      if (rslts.DailyPP === -1 && dailyPP !== -1) {
        this.run("UPDATE PenisSize SET DailyPP = ? WHERE UserId = ? AND ServerId = ?", dailyPP, user, server)
        return dailyPP
      }
    }

    return permPP !== -1 ? rslts.Size : rslts.DailyPP
  }

  getAllPenisSize (serverId) {
    const rslts = this.runQuery("SELECT * FROM PenisSize ps INNER JOIN UserInfo ui ON ps.UserId = ui.UserId WHERE ui.ServerId = @serverId and ps.ServerId = @serverId", { serverId: serverId })
    return !rslts ? [] : rslts
  }

  resetDailyPPSize (serverId) {
    const rslts = this.run("UPDATE PenisSize SET [DailyPP] = -1 WHERE [ServerId] = ?", serverId)
    return rslts.changes > 0
  }

  updateUser (userId, serverId, displayName) {
    const rslts = this.runScalarQuery("SELECT [UserId] FROM UserInfo WHERE [UserId] = ? AND [ServerId] = ?", userId, serverId)
    if (rslts) {
      this.run("UPDATE UserInfo SET [DisplayName] = ? WHERE [UserId] = ? AND [ServerId] = ?", displayName, userId, serverId)
    }
    else {
      this.run("INSERT INTO UserInfo ([UserId], [ServerId], [DisplayName]) VALUES (?, ?, ?)", userId, serverId, displayName)
    }
  }

  getDisplayName (userId, serverId) {
    return this.runScalarQuery("SELECT [DisplayName] FROM UserInfo WHERE [UserId] = ? AND [ServerId] = ?", userId, serverId)
  }

  insertConnectFourWinner (serverId, playerOne, playerTwo, winner) {
    this.run("INSERT INTO ConnectFour ([ServerId], [PlayerOne], [PlayerTwo], [Winner]) VALUES (?, ?, ?, ?)", serverId, playerOne, playerTwo, winner)
  }

  insertTicTacToeWinner (serverId, playerOne, playerTwo, winner) {
    this.run("INSERT INTO TicTacToe ([ServerId], [PlayerOne], [PlayerTwo], [Winner]) VALUES (?, ?, ?, ?)", serverId, playerOne, playerTwo, winner)
  }

  getGameWins (tbl, serverId) {
    return this.runQuery(`
SELECT [PlayerOne] as 'PlayerId', [Winner]
FROM ${tbl}
WHERE [ServerId] = @server 
  AND [PlayerOne] <> [PlayerTwo]
UNION ALL
SELECT [PlayerTwo] as 'PlayerId', [Winner]
FROM ${tbl}
WHERE [ServerId] = @server
  AND [PlayerOne] <> [PlayerTwo]`, { server: serverId })
  }

  getSetting (serverId, key, $default = undefined) {
    const rslts = this.runScalarQuery("SELECT [Value], [DataType] FROM Settings WHERE [ServerId] = ?", serverId)

    if (!rslts) {
      return $default
    }

    switch (rslts.DataType) {
      case "int":
      case "integer":
      case "numeric": {
        const int = parseInt(rslts.Value)
        if (isNaN(int)) {
          return int
        }
        break
      }

      case "number": {
        const num = Number(rslts.Value)
        if (isNaN(num)) {
          return num
        }
        break
      }

      default:
        console.log("[getSetting]: Unhandled DataType - " + rslts.DataType)
    }

    return rslts.Value
  }

  setSetting (serverId, key, value, dataType) {
    const rslts = this.runScalarQuery("SELECT [Value], [DataType] FROM Settings WHERE [ServerId] = ?", serverId)

    if (rslts) {
      this.run("UPDATE Settings SET [Value] = ?, [DataType] = ? WHERE [ServerId] = ? AND [Key] = ?", value, dataType, serverId, key)
    }
    else {
      this.run("INSERT INTO Settings ([ServerId], [Key], [Value], [DataType]) VALUES (?, ?, ?, ?)", serverId, key, value, dataType)
    }

    return value
  }
}