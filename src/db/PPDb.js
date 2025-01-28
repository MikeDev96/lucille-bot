class PPDb {
  constructor (db) {
    this.db = db
    this.init()
  }

  init () {
    this.db.db.exec(`
      CREATE TABLE IF NOT EXISTS PenisSize (
        Id          INTEGER PRIMARY KEY AUTOINCREMENT,
        UserId      TEXT,
        ServerId    TEXT, 
        Size        INTEGER,
        DailyPP     INTEGER DEFAULT -1
      );
    `)

    // probably should use some sort of versioning? maybe user_version
    if (!this.db.columnExists("PenisSize", "DailyPP")) {
      this.db.db.exec("ALTER TABLE PenisSize ADD COLUMN DailyPP INTEGER DEFAULT -1")
      console.log("Added DailyPP to PenisSize.")
    }
  }

  /**
   * Used for getting the Authors penis size, not server wide
   * @param {string} user - Discord author id
   */
  getPenisSize (user, server, permPP, dailyPP) {
    const rslts = this.db.runScalarQuery("SELECT Size, DailyPP FROM PenisSize WHERE UserId = @user AND ServerId = @server", { user, server })

    // if rslts is undefined we didn't find a user in the db so insert one.
    if (!rslts) {
      this.db.run("INSERT INTO PenisSize ([UserId], [ServerId], [Size], [DailyPP]) VALUES (@user, @server, @permPP, @dailyPP)", { user, server, permPP, dailyPP })
      return permPP === -1 ? dailyPP : permPP
    }
    else {
      if (rslts.Size === -1 && permPP !== -1) {
        this.db.run("UPDATE PenisSize SET Size = @permPP WHERE UserId = @user AND ServerId = @server", { permPP, user, server })
        return permPP
      }

      if (rslts.DailyPP === -1 && dailyPP !== -1) {
        this.db.run("UPDATE PenisSize SET DailyPP = @dailyPP WHERE UserId = @user AND ServerId = @server", { dailyPP, user, server })
        return dailyPP
      }
    }

    return permPP !== -1 ? rslts.Size : rslts.DailyPP
  }

  getAllPenisSize (serverId) {
    const rslts = this.db.runQuery("SELECT * FROM PenisSize ps INNER JOIN UserInfo ui ON ps.UserId = ui.UserId WHERE ui.ServerId = @serverId and ps.ServerId = @serverId", { serverId })
    return !rslts ? [] : rslts
  }

  resetDailyPPSize (serverId) {
    const rslts = this.db.run("UPDATE PenisSize SET [DailyPP] = -1 WHERE [ServerId] = @serverId", { serverId })
    return rslts.changes > 0
  }
}

export default PPDb