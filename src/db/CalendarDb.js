class CalendarDb {
  constructor (db) {
    this.db = db
    this.init()
  }

  init () {
    this.db.db.exec(`
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
    this.db.run("INSERT INTO Calendar (Event, RRule, UserId, ServerId) VALUES (?, ?, ?, ?)", event, rrule, userId, serverId)
  }

  getCalendarEvents (serverId) {
    return this.db.runQuery("SELECT RRule AS rrule, Event AS event FROM Calendar WHERE ServerId = ?", serverId)
  }

  findCalendarEvent (serverId, event) {
    return this.db.runQuery("SELECT CalendarId AS calendarId, Event AS event FROM Calendar WHERE ServerId = ? AND Event LIKE ? LIMIT 1", serverId, `%${event}%`)[0]
  }

  removeCalendarEvent (calendarId) {
    this.db.run("DELETE FROM Calendar WHERE CalendarId = ?", calendarId)
  }
}

export default CalendarDb