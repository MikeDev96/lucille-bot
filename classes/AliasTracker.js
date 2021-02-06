const low = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")
const fs = require("fs")

class AliasTracker {
  initAlias () {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS Alias
      (
        AliasId     INTEGER PRIMARY KEY AUTOINCREMENT,
        Name        TEXT
      )
    `)

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS AliasCommand
      (
        AliasCommandId     INTEGER PRIMARY KEY AUTOINCREMENT,
        AliasId            INTEGER,
        Command            TEXT,
        FOREIGN KEY (AliasId) REFERENCES Alias(AliasId) ON DELETE CASCADE
      )
   `)

    this.migrateAliases()
  }

  writeAlias (alias, aliascommand) {
    aliascommand = aliascommand.split("&")

    aliascommand = aliascommand.filter(cmd => cmd !== "")

    if (aliascommand.length) {
      const { lastInsertRowid } = this.run("INSERT INTO Alias (Name) VALUES (?)", alias)
      aliascommand.forEach(cmd => this.run("INSERT INTO AliasCommand (AliasId, Command) VALUES (?, ?)", lastInsertRowid, cmd))
    }
  }

  removeAlias (alias) {
    this.run("DELETE FROM Alias WHERE Name = ?", alias)
  }

  listAliases () {
    return this.reduceAliases(this.runQuery(`
      SELECT Name AS name, Command AS command
      FROM Alias a
      JOIN AliasCommand ac
      ON ac.AliasId = a.AliasId
    `))
  }

  checkForAlias (alias) {
    return this.reduceAliases(this.runQuery(`
      SELECT Name AS name, Command AS command
      FROM Alias a
      JOIN AliasCommand ac
      ON ac.AliasId = a.AliasId
      WHERE a.Name = ?
    `, alias))
  }

  reduceAliases (aliases) {
    return aliases.reduce(([map, arr], { name, command }) => {
      if (!map.has(name)) {
        map.set(name, arr.push({ alias: name, command: [] }) - 1)
      }

      arr[map.get(name)].command.push(command)

      return [map, arr]
    }, [new Map(), []])[1]
  }

  migrateAliases () {
    if (fs.existsSync("aliases.json")) {
      const adapter = new FileSync("aliases.json")
      const db = low(adapter)
      const aliases = db.get("aliases").value()
      aliases.forEach(({ alias, command }) => {
        const { lastInsertRowid } = this.run("INSERT INTO Alias (Name) VALUES (?)", alias)
        command.forEach(cmd => {
          this.run("INSERT INTO AliasCommand (AliasId, Command) VALUES (?, ?)", lastInsertRowid, cmd)
        })
      })

      fs.renameSync("aliases.json", "aliases.json.bak")
    }
  }

  static applyToClass (structure) {
    for (const prop of Object.getOwnPropertyNames(AliasTracker.prototype).slice(1)) {
      Object.defineProperty(structure.prototype, prop, Object.getOwnPropertyDescriptor(AliasTracker.prototype, prop))
    }
  }
}

module.exports = AliasTracker