const low = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")

module.exports = class AliasTracker {
    constructor(client) {
        this.client = client
        this.monitor = {}
        this.initDB()
    }

    initDB() {
        const adapter = new FileSync("aliases.json")
        this.db = low(adapter)
        this.db.defaults({ aliases: {} })
            .write()
    }

    writeAlias(alias, aliascommand) {
        this.db.get("aliases")
            .push({
                key: alias,
                value: aliascommand
            })
            .write()
    }

    removeAlias(alias) {
        this.db.get("aliases")
            .remove({ key: alias })
            .write()
    }

    listAliases() {
        return this.db.get("aliases").value()
    }

    checkForAlias(alias) {
        return this.db.get("aliases")
            .filter({ key: alias })
            .take(1)
            .value()
    }
}