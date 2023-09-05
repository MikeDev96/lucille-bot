class BangaTracker {
  constructor (db) {
    this.db = db
    this.init()
  }

  init () {
    this.db.db.exec(`
      CREATE TABLE IF NOT EXISTS Banga
      (
        BangaId     INTEGER PRIMARY KEY AUTOINCREMENT,
        Title       INTEGER,
        SpotifyUri  TEXT
      )
    `)

    this.db.db.exec(`
      CREATE TABLE IF NOT EXISTS BangaUser
      (
        BangaId     INTEGER,
        UserId      TEXT,
        PRIMARY KEY (BangaId, UserId),
        FOREIGN KEY (BangaId) REFERENCES Banga(BangaId) ON DELETE CASCADE
      )
    `)
  }

  writeBanga (spotifyUri, banger, user) {
    const { lastInsertRowid } = this.db.run("INSERT INTO Banga (Title, SpotifyUri) VALUES (?, ?)", banger, spotifyUri || "")
    this.db.run("INSERT INTO BangaUser (BangaId, UserId) VALUES (?, ?)", lastInsertRowid, user)
  }

  checkForBanga (banger) {
    return this.reduceBangas(this.db.runQuery(`
      SELECT b.Title AS song, b.SpotifyUri AS spotifyUri, bu.UserId AS userId
      FROM Banga b
      JOIN BangaUser bu
      ON bu.BangaId = b.BangaId
      WHERE b.Title = ? COLLATE NOCASE
    `, banger))
  }

  updateBangaUsers (banger, user) {
    this.db.run(`
      INSERT INTO BangaUser VALUES
      (
        (SELECT BangaId FROM Banga WHERE Title = ?),
        ?
      )`
    , banger, user)
  }

  removeBanga (banger, user) {
    this.db.run(`
      DELETE FROM BangaUser AS bu
      WHERE bu.BangaId IN (SELECT b.BangaId FROM Banga b WHERE b.Title = ? COLLATE NOCASE)
        AND bu.UserId = ?
    `, banger, user)

    this.db.run(`
      DELETE FROM Banga AS b
      WHERE b.Title = ? COLLATE NOCASE
        AND NOT EXISTS(SELECT bu.BangaId FROM BangaUser bu WHERE bu.BangaId = b.BangaId)
    `, banger)
  }

  findBanga (banger, user) {
    let [data] = this.reduceBangas(this.db.runQuery(`
      SELECT b.Title AS song, b.SpotifyUri AS spotifyUri, bu.UserId AS userId
      FROM Banga b
      JOIN BangaUser bu
      ON bu.BangaId = b.BangaId
      WHERE b.Title = ? COLLATE NOCASE
        AND bu.UserId = ?
    `, banger, user))

    if (!data) data = { song: null }

    return data.song
  }

  listBangas (user) {
    return this.db.runQuery(`
      SELECT b.Title AS song, b.SpotifyUri AS spotifyUri
      FROM Banga b
      JOIN BangaUser bu
      ON bu.BangaId = b.BangaId
      WHERE bu.UserId = ?
    `, user)
  }

  reduceBangas (bangas) {
    return bangas.reduce(([map, arr], { song, spotifyUri, userId }) => {
      if (!map.has(song)) {
        map.set(song, arr.push({ song, spotifyUri, users: [] }) - 1)
      }

      arr[map.get(song)].users.push(userId)

      return [map, arr]
    }, [new Map(), []])[1]
  }
}

export default BangaTracker