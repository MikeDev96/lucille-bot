const EventEmitter = require("events")
const { DateTime } = require("luxon")

const timeValidationRegex = /(?:[0-1]\d|2[0-3]):(?:[0-5]\d)(?::(?:[0-5]\d))?/

class DailyTracker extends EventEmitter {
  constructor (client, startTime) {
    super()

    this.db = client.db
    this.startTime = startTime

    this.initResetTimer()
  }

  initResetTimer () {
    // no need to check if it exists because we just work out the duration anyway
    let nextResetTime = this.db.setSetting("", "Daily.nextReset", Date.now() + this.getDuration(), "number") // 86400000

    setTimeout(() => {
      nextResetTime = this.db.setSetting("", "Daily.nextReset", Date.now() + this.getDuration(), "number")

      this.emit("reset")
      this.initResetTimer()
    }, nextResetTime - Date.now())
  }

  // probably could make this a global thing
  getDuration () {
    const time = timeValidationRegex.test(this.startTime)
    if (time) {
      const nowUtc = DateTime.utc()
      let targetUtc = DateTime.fromISO(this.startTime, { zone: "Europe/London" }).toUTC()

      if (nowUtc.valueOf() >= targetUtc.valueOf()) {
        targetUtc = targetUtc.plus({ days: 1 })
      }

      return targetUtc.diff(nowUtc, "milliseconds").milliseconds + 1000
    }

    return 86400000
  }
}

module.exports = DailyTracker