class VoiceDb {
  constructor (db) {
    this.db = db
    this.init()
  }

  init () {
    this.db.db.exec(`
      CREATE TABLE IF NOT EXISTS VoiceStats
      (
        ServerId    TEXT,
        UserId      TEXT,
        SelfMute    INTEGER,
        SelfDeaf    INTEGER,
        ServerMute  INTEGER,
        ServerDeaf  INTEGER,
        Afk         INTEGER,
        SelfMuteMax INTEGER,
        SelfDeafMax INTEGER,
        AfkMax      INTEGER,
        Active      INTEGER,
        Status      STRING,
        Speaking    INTEGER,
        SpeakingMax INTEGER,
        PRIMARY KEY (ServerId, UserId)
      )
    `)

    try {
      this.db.db.exec(`SELECT Status FROM VoiceStats`)
    }
    catch {
      this.db.db.exec(`ALTER TABLE VoiceStats ADD COLUMN Status STRING DEFAULT 'show'`)
    }

    try {
      this.db.db.exec(`SELECT Active FROM VoiceStats`)
    }
    catch (error) {
      this.db.db.exec(`ALTER TABLE VoiceStats ADD COLUMN Active INTEGER DEFAULT 0`)
    }

    try {
      this.db.db.exec(`SELECT Speaking FROM VoiceStats`)
    }
    catch (error) {
      this.db.db.exec(`ALTER TABLE VoiceStats ADD COLUMN Speaking INTEGER DEFAULT 0`)
    }

    try {
      this.db.db.exec(`SELECT SpeakingMax FROM VoiceStats`)
    }
    catch (error) {
      this.db.db.exec(`ALTER TABLE VoiceStats ADD COLUMN SpeakingMax INTEGER DEFAULT 0`)
    }
  }

  updateActiveTimeForUser (serverId, userId, time) {
    this.db.run(`
      UPDATE VoiceStats
      SET
        Active = Active + ?
      WHERE ServerId = ?
        AND UserId = ?
    `, time, serverId, userId)
  }

  updateVoiceStatsForUser (serverId, userId, changes) {
    this.db.run(`
      INSERT INTO VoiceStats VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(ServerId, UserId) DO UPDATE
      SET
        SelfMute = SelfMute + ?,
        SelfDeaf = SelfDeaf + ?,
        ServerMute = ServerMute + ?,
        ServerDeaf = ServerDeaf + ?,
        Afk = Afk + ?,
        SelfMuteMax = CASE WHEN ? > SelfMuteMax THEN ? ELSE SelfMuteMax END,
        SelfDeafMax = CASE WHEN ? > SelfDeafMax THEN ? ELSE SelfDeafMax END,
        AfkMax = CASE WHEN ? > AfkMax THEN ? ELSE AfkMax END,
        Active = Active + ?
      WHERE ServerId = ?
        AND UserId = ?
    `, serverId, userId, changes.selfMute, changes.selfDeaf, changes.serverMute, changes.serverDeaf, changes.afk, changes.selfMute, changes.selfDeaf, changes.afk, changes.active, "show", 0, 0,
    changes.selfMute, changes.selfDeaf, changes.serverMute, changes.serverDeaf, changes.afk, changes.selfMute, changes.selfMute, changes.selfDeaf, changes.selfDeaf, changes.afk, changes.afk, changes.active, serverId, userId)
  }

  disableVoiceStatsForUser (serverId, userId) {
    this.db.run(`UPDATE VoiceStats
      SET
        SelfMute = NULL,
        SelfDeaf = NULL,
        ServerMute = NULL,
        ServerDeaf = NULL,
        Afk = NULL,
        SelfMuteMax = NULL,
        SelfDeafMax = NULL,
        AfkMax = NULL,
        Active = NULL,
        Speaking = NULL,
        SpeakingMax = NULL
      WHERE ServerId = ${serverId} AND UserId = ${userId}`)
  }

  enableVoiceStatsForUser (serverId, userId) {
    this.db.run(`UPDATE VoiceStats
      SET
        SelfMute = 0,
        SelfDeaf = 0,
        ServerMute = 0,
        ServerDeaf = 0,
        Afk = 0,
        SelfMuteMax = 0,
        SelfDeafMax = 0,
        AfkMax = 0,
        Active = 0,
        Speaking = 0,
        SpeakingMax = 0
      WHERE ServerId = ? AND UserId = ?
    `, serverId, userId)
  }

  getStatusForUser (serverId, userId) {
    const response = this.db.runQuery(`
      SELECT Status FROM VoiceStats WHERE ServerId = ? AND UserId = ?
    `, serverId, userId)

    return response[0]?.Status
  }

  updateStatus (serverId, userId, status) {
    this.db.run(`UPDATE VoiceStats SET Status='${status}' WHERE ServerId = ${serverId} AND UserId = ${userId}`)
  }

  getVoiceStatsForServer (serverId) {
    return this.db.runQuery(`SELECT * FROM VoiceStats WHERE ServerId = ${serverId} AND Status = 'show'`)
  }

  getVoiceStatForUser (serverId, userId, statType) {
    return this.db.runQuery(`
      SELECT ${statType} FROM VoiceStats WHERE ServerId = ? AND UserId = ?
    `, serverId, userId)
  }

  getVoiceStatForServer (serverId, statType) {
    return this.db.runQuery(`
      SELECT ${statType}, UserId FROM VoiceStats WHERE ServerId = ? AND Status = 'show' AND ${statType} IS NOT NULL
    `, serverId)
  }

  updateSpeech (serverId, userId, duration) {
    this.db.run(`
      INSERT INTO VoiceStats VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'show', ?, ?)
      ON CONFLICT(ServerId, UserId) DO UPDATE
      SET
        Speaking = Speaking + ?,
        SpeakingMax = CASE WHEN ? > SpeakingMax THEN ? ELSE SpeakingMax END
      WHERE ServerId = ?
        AND UserId = ?
        AND Status != 'off'
    `, serverId, userId, duration, duration, duration, duration, duration, serverId, userId)
  }
}

export default VoiceDb