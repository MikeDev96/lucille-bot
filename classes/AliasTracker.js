const low = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")

module.exports = class AliasTracker {
  constructor (client) {
    this.client = client
    this.monitor = {}
    this.initDB()
  }

  initDB () {
    const adapter = new FileSync("aliases.json")
    this.db = low(adapter)
    this.db.defaults({ aliases: [] })
      .write()
  }

  writeAlias (alias, aliascommand) {
    aliascommand = aliascommand.split("&")

    aliascommand = aliascommand.filter(cmd => cmd !== "")

    if (aliascommand.length) {
      this.db.get("aliases")
        .push({
          alias: alias,
          command: aliascommand,
        })
        .write()
    }
  }

  removeAlias (alias) {
    this.db.get("aliases")
      .remove({ alias: alias })
      .write()
  }

  listAliases () {
    return this.db.get("aliases").value()
  }

  checkForAlias (alias) {
    return this.db.get("aliases")
      .filter({ alias: alias })
      .take(1)
      .value()
  }
}