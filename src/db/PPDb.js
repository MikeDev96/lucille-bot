class PPDb {
  initPPDB () {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS PenisSize (
        Id          INTEGER PRIMARY KEY AUTOINCREMENT,
        UserId      TEXT,
        ServerId    TEXT, 
        Size        INTEGER,
        DailyPP     INTEGER DEFAULT -1
      );
    `)
  }

  /**
   * Used for getting the Authors penis size, not server wide
   * @param {string} user - Discord author id
   */
  getPenisSize (user, server, permPP, dailyPP) {
    const rslts = this.runScalarQuery("SELECT Size, DailyPP FROM PenisSize WHERE UserId = @user AND ServerId = @server", { user, server })

    // if rslts is undefined we didn't find a user in the db so insert one.
    if (!rslts) {
      this.run("INSERT INTO PenisSize ([UserId], [ServerId], [Size], [DailyPP]) VALUES (@user, @server, @permPP, @dailyPP)", { user, server, permPP, dailyPP })
      return permPP === -1 ? dailyPP : permPP
    }
    else {
      if (rslts.Size === -1 && permPP !== -1) {
        this.run("UPDATE PenisSize SET Size = @permPP WHERE UserId = @user AND ServerId = @server", { permPP, user, server })
        return permPP
      }

      if (rslts.DailyPP === -1 && dailyPP !== -1) {
        this.run("UPDATE PenisSize SET DailyPP = @dailyPP WHERE UserId = @user AND ServerId = @server", { dailyPP, user, server })
        return dailyPP
      }
    }

    return permPP !== -1 ? rslts.Size : rslts.DailyPP
  }

  getAllPenisSize (serverId) {
    const rslts = this.runQuery("SELECT * FROM PenisSize ps INNER JOIN UserInfo ui ON ps.UserId = ui.UserId WHERE ui.ServerId = @serverId and ps.ServerId = @serverId", { serverId })
    return !rslts ? [] : rslts
  }

  resetDailyPPSize (serverId) {
    const rslts = this.run("UPDATE PenisSize SET [DailyPP] = -1 WHERE [ServerId] = @serverId", { serverId })
    return rslts.changes > 0
  }

  static applyToClass (structure) {
    for (const prop of Object.getOwnPropertyNames(PPDb.prototype).slice(1)) {
      Object.defineProperty(structure.prototype, prop, Object.getOwnPropertyDescriptor(PPDb.prototype, prop))
    }
  }
}

export default PPDb