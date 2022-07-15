class CalendarDb {
  initCalendarDb () {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS Calendar
      (
        CalendarId        INTEGER PRIMARY KEY AUTOINCREMENT,
        Event             TEXT NOT NULL,
        RRule             TEXT NOT NULL,
        UserId            TEXT NOT NULL,
        ServerId          TEXT NOT NULL,
        CreatedTimestamp  TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  addCalendarEvent (rrule, event, userId, serverId) {
    this.run("INSERT INTO Calendar (Event, RRule, UserId, ServerId) VALUES (?, ?, ?, ?)", event, rrule, userId, serverId)
  }

  getCalendarEvents (serverId) {
    return this.runQuery("SELECT RRule AS rrule, Event AS event FROM Calendar WHERE ServerId = ?", serverId)
  }

  findCalendarEvent (serverId, event) {
    return this.runQuery("SELECT CalendarId AS calendarId, Event AS event FROM Calendar WHERE ServerId = ? AND Event LIKE ? LIMIT 1", serverId, `%${event}%`)[0]
  }

  removeCalendarEvent (calendarId) {
    this.run("DELETE FROM Calendar WHERE CalendarId = ?", calendarId)
  }

  static applyToClass (structure) {
    for (const prop of Object.getOwnPropertyNames(CalendarDb.prototype).slice(1)) {
      Object.defineProperty(structure.prototype, prop, Object.getOwnPropertyDescriptor(CalendarDb.prototype, prop))
    }
  }
}

export default CalendarDb