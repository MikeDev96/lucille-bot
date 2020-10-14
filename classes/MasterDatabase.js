const sqlite = require("better-sqlite3")

module.exports = class {
  constructor() {
    this.db = new sqlite("main.db", { readonly: false })
    this.initTables()
  }

  // probably needs some proper ERD setting up..
  initTables() {
    // PenisSize command
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS PenisSize (
        Id          INTEGER PRIMARY KEY AUTOINCREMENT,
        UserId	 		TEXT,
        ServerId    TEXT, 
        Size		    INTEGER
      ) 
    `)

      // DISPLAY NAME
      .exec(`
       CREATE TABLE IF NOT EXISTS UserInfo (
          UserId	 		TEXT,
          ServerId    TEXT,
          DisplayName TEXT,
          PRIMARY KEY (UserId, ServerId)
        ) 
      `)

    console.log("main.db ready")
  }

  /**
   * Query is expected to run without returning any data
   * @param {string} query - Parameter based SQL query 
   * @param  {...any} params - Params provided to the query
   */
  run(query, ...params) {
    const stmt = this.db.prepare(query)
    const result = stmt.run(...params)
    return result
  }

  /**
   * Query is expected to an array of results
   * @param {string} query - Parameter based SQL query 
   * @param  {...any} params - Params provided to the query
   */
  runQuery(query, ...params) {
    const stmt = this.db.prepare(query)
    const result = stmt.all(...params)
    return result
  }

  /**
   * Query is expected to return 1 result
   * @param {string} query - Parameter based SQL query 
   * @param  {...any} params - Params provided to the query
   */
  runScalarQuery(query, ...params) {
    const stmt = this.db.prepare(query)
    const result = stmt.get(...params)
    return result
  }

  /**
   * Used for getting the Authors penis size, not server wide
   * @param {string} user - Discord author id 
   */
  getPenisSize(user, server, $default) {
    const rslts = this.runScalarQuery("SELECT Size FROM PenisSize WHERE UserId = ? AND ServerId = ?", user, server)

    // if rslts is undefined we didn't find a user in the db so insert one.
    if (!rslts) {
      this.run("INSERT INTO PenisSize ([UserId], [ServerId], [Size]) VALUES (?, ?, ?)", user, server, $default)
      return $default
    }

    return rslts.Size
  }

  getAllPenisSize(serverId) {
    const rslts = this.runQuery("SELECT * FROM PenisSize ps INNER JOIN UserInfo ui ON ps.UserId = ui.UserId WHERE ui.ServerId = ?", serverId)
    return !rslts ? [] : rslts;
  }

  updateUser(userId, serverId, displayName) {
    const rslts = this.runScalarQuery("SELECT [UserId] FROM UserInfo WHERE [UserId] = ? AND [ServerId] = ?", userId, serverId)
    if (rslts) {
      this.run("UPDATE UserInfo SET [DisplayName] = ? WHERE [UserId] = ? AND [ServerId] = ?", displayName, userId, serverId)
    } else {
      this.run("INSERT INTO UserInfo ([UserId], [ServerId], [DisplayName]) VALUES (?, ?, ?)", userId, serverId, displayName)
    }
  }

  getDisplayName(userId, serverId) {
    return this.runScalarQuery("SELECT [DisplayName] FROM UserInfo WHERE [UserId] = ? AND [ServerId] = ?", userId, serverId)
  }
}