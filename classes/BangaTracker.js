const low = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")

module.exports = class {
  constructor (client) {
    this.client = client
    this.monitor = {}
    this.initDB()
  }

  initDB () {
    const adapter = new FileSync("banga.json")
    this.db = low(adapter)

    this.db.defaults({ bangers: [], poopers: [] })
      .write()
  }

  writeBanga (spotifyUri, banger, user) {
    this.db.get("bangers")
      .push({
        song: banger,
        users: [user],
        spotifyUri: spotifyUri || "",
      })
      .write()
  }

  checkForBanga (banger) {
    return this.db.get("bangers")
      .filter({ song: banger })
      .take(1)
      .value()
  }

  updateUsers (banger, user) {
    const data = this.db.get("bangers")
      .filter({ song: banger })
      .take(1)
      .value()

    data[0].users.push(user)

    this.db.get("bangers")
      .find({ song: banger })
      .assign(data[0])
      .write()
  }

  removeBanga (banger, user) {
    const data = this.db.get("bangers")
      .find(e => {
        return e.song.toLowerCase().includes(banger.toLowerCase()) && (e.users.indexOf(user) > -1)
      })
      .value()

    const index = data.users.indexOf(user)

    if (index > -1) data.users.splice(index, 1)

    this.db.get("bangers")
      .find({ song: banger })
      .assign(data)
      .write()
  }

  findBanga (banger, user) {
    let data = this.db.get("bangers")
      .find(e => {
        return e.song.toLowerCase().includes(banger.toLowerCase()) && (e.users.indexOf(user) > -1)
      })
      .value()

    if (!data) data = { song: null }

    return data.song
  }

  listBangas (user) {
    return this.db.get("bangers")
      .filter({ users: [user] })
      .value()
  }
}