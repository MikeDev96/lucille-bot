class ByeDb {
  initByeDb () {
    this.db.exec(`
        CREATE TABLE IF NOT EXISTS Bye
        (
          ByeId              INTEGER PRIMARY KEY AUTOINCREMENT,
          ByeStatus          INTEGER
        );
        DELETE FROM BYE
      `)
  }

  addByeStatus (byeStatus) {
    const testInsertFromDB = this.runQuery("SELECT * FROM Bye")
    if (!testInsertFromDB.length) {
      this.run("INSERT INTO Bye (ByeStatus) VALUES (?)", byeStatus)
    }
  }

  getByeStatus () {
    return this.runQuery("SELECT * FROM Bye")
  }

  removeBye () {
    this.run("DELETE FROM BYE")
  }

  static applyToClass (structure) {
    for (const prop of Object.getOwnPropertyNames(ByeDb.prototype).slice(1)) {
      Object.defineProperty(structure.prototype, prop, Object.getOwnPropertyDescriptor(ByeDb.prototype, prop))
    }
  }
}

module.exports = ByeDb