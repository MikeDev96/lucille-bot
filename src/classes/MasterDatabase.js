import SQLite from "better-sqlite3"
import CalendarDb from "../db/CalendarDb.js"
import PPDB from "../db/PPDB.js"
import AliasTracker from "./AliasTracker.js"
import BangaTracker from "./BangaTracker.js"
import StocksPortfolio from "./StocksPortfolio.js"
import VoiceTracker from "./VoiceTracker.js"

class MasterDatabase {
  constructor () {
    this.db = new SQLite("main.db", { readonly: false })
    this.initTables()
  }

  // probably needs some proper ERD setting up..
  initTables () {
    // PenisSize command
    this.db
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

      .exec(`
       CREATE TABLE IF NOT EXISTS YouTubeVideos (
          VideoId     TEXT PRIMARY KEY,
          VideoTitle  TEXT
        )
      `)

      .exec(`
       CREATE TABLE IF NOT EXISTS YouTubeHistory (
          VideoId     TEXT,
          UserId      TEXT,
          ServerId    TEXT,
          Timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      .exec(`
       CREATE TABLE IF NOT EXISTS MusicState (
          ServerId    TEXT PRIMARY KEY,
          State       TEXT
        )
      `)

    // probably should use some sort of versioning? maybe user_version
    if (!this.columnExists("PenisSize", "DailyPP")) {
      this.db.exec("ALTER TABLE PenisSize ADD COLUMN DailyPP INTEGER DEFAULT -1")
      console.log("Added DailyPP to PenisSize.")
    }

    this.db.exec("DELETE FROM YouTubeVideos WHERE VideoId IS NULL")
    this.db.exec("DELETE FROM YouTubeHistory WHERE VideoId IS NULL")
    this.db.exec("DROP TABLE IF EXISTS YouTubeLinks")

    this.initAlias()
    this.initBanga()
    this.initVoiceStats()
    this.initStocks()
    this.initCalendarDb()
    this.initPPDB()

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
  AND [PlayerOne] <> '713072255487443017'
UNION ALL
SELECT [PlayerTwo] as 'PlayerId', [Winner]
FROM ${tbl}
WHERE [ServerId] = @server
  AND [PlayerOne] <> [PlayerTwo]
  AND [PlayerTwo] <> '713072255487443017'`, { server: serverId })
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

  saveYouTubeVideo (videoId, videoTitle) {
    if (this.runScalarQuery("SELECT [VideoId] FROM YouTubeVideos WHERE [VideoId] = ?", videoId)) {
      this.run("UPDATE YouTubeVideos SET [VideoTitle] = ? WHERE [VideoId] = ?", videoTitle, videoId)
    }
    else {
      this.run("INSERT INTO YouTubeVideos (VideoId, VideoTitle) VALUES (?, ?)", videoId, videoTitle)
    }
  }

  insertYouTubeHistory (videoId, userId, serverId) {
    this.run("INSERT INTO YouTubeHistory ([VideoId], [UserId], [ServerId]) VALUES (?, ?, ?)", videoId, userId, serverId)
  }

  getYouTubeStatsForVideo (serverId, videoId) {
    return this.runScalarQuery(`
      SELECT
        yv.VideoTitle AS videoTitle,
        COUNT(yv.VideoId) AS count,
        MIN(Timestamp) AS firstPlayed,
        MAX(Timestamp) AS lastPlayed
      FROM YouTubeVideos yv
      JOIN YouTubeHistory ys
      ON ys.ServerId = ?
        AND ys.VideoId = yv.VideoId
      WHERE yv.VideoId = ?
      GROUP BY yv.VideoId
    `, serverId, videoId)
  }

  getYouTubeStatsForAll (serverId) {
    return this.runQuery(`
      SELECT
        yv.VideoTitle AS videoTitle,
        COUNT(yv.VideoId) AS count,
        MIN(Timestamp) AS firstPlayed,
        MAX(Timestamp) AS lastPlayed
      FROM YouTubeVideos yv
      JOIN YouTubeHistory ys
      ON ys.ServerId = $serverId
        AND ys.VideoId = yv.VideoId
      GROUP BY yv.VideoId
      ORDER BY count DESC
      LIMIT 5
    `, { serverId })
  }

  saveMusicState (serverId, state) {
    if (this.runScalarQuery("SELECT ServerId FROM MusicState WHERE ServerId = ?", serverId)) {
      this.run("UPDATE MusicState SET State = ? WHERE ServerId = ?", state, serverId)
    }
    else {
      this.run("INSERT INTO MusicState (ServerId, State) VALUES (?, ?)", serverId, state)
    }
  }

  getMusicState (serverId) {
    return this.runScalarQuery("SELECT State AS state FROM MusicState WHERE ServerId = ?", serverId)
  }

  getYouTubeVideoPlayCount (videoId) {
    return this.runScalarQuery(`
      SELECT COUNT(VideoId) AS count
      FROM YouTubeHistory
      WHERE VideoId = ?
    `, videoId)
  }
}

AliasTracker.applyToClass(MasterDatabase)
BangaTracker.applyToClass(MasterDatabase)
VoiceTracker.applyToClass(MasterDatabase)
StocksPortfolio.applyToClass(MasterDatabase)
CalendarDb.applyToClass(MasterDatabase)
PPDB.applyToClass(MasterDatabase)

export default MasterDatabase