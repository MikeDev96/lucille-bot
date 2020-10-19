const EventEmitter = require("events")
const { DateTime } = require("luxon")

const timeValidationRegex = /(?:[0-1]\d|2[0-3]):(?:[0-5]\d)(?::(?:[0-5]\d))?/

class DailyTracker extends EventEmitter {
  constructor (client, startTime) {
    super()

    this.db = client.db

    const time = timeValidationRegex.test(startTime)
    if (time) {
      const nowUtc = DateTime.utc()
      let targetUtc = DateTime.fromISO(startTime, { zone: "Europe/London" }).toUTC()

      if (nowUtc.valueOf() >= targetUtc.valueOf()) {
        targetUtc = targetUtc.plus({ days: 1 })
      }

      this.startTime = targetUtc.diff(nowUtc, "milliseconds").milliseconds + 1000
    }

    this.initResetTimer()
  }

  initResetTimer () {
    const msDay = 86400000
    let nextResetTime = this.db.getSetting("", "Daily.nextReset")
    if (!nextResetTime) {
      nextResetTime = this.db.setSetting("", "Daily.nextReset", Date.now() + this.startTime, "number") // 86400000
    }

    setTimeout(() => {
      nextResetTime = this.db.setSetting("", "Daily.nextReset", Date.now() + msDay, "number")

      this.emit("reset")

      this.initResetTimer()
    }, nextResetTime - Date.now())
  }
}

module.exports = DailyTracker