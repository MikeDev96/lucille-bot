import parse from "parse-duration"
import { DateTime } from "luxon"
import Command from "../../classes/Command.js"

const timeValidationRegex = /(?:[0-1]\d|2[0-3]):(?:[0-5]\d)(?::(?:[0-5]\d))?/

export default class extends Command {
  constructor () {
    super({
      name: "remind",
      aliases: ["reminder", "remindme"],
      group: "misc",
      memberName: "remind",
      description: "Set a reminder",
      args: [
        {
          key: "when",
          prompt: "When to remind you as a duration (1h 30m) or timestamp (hh:mm:ss)",
          type: "string",
          validate: val => timeValidationRegex.test(val) || !!parse(val),
        },
        {
          key: "what",
          prompt: "What to remind you",
          type: "string",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    let duration = 0

    const time = timeValidationRegex.test(args.when)
    if (time) {
      const nowUtc = DateTime.utc()
      let targetUtc = DateTime.fromISO(args.when, { zone: "Europe/London" }).toUTC()

      if (nowUtc.valueOf() >= targetUtc.valueOf()) {
        targetUtc = targetUtc.plus({ days: 1 })
      }

      duration = targetUtc.diff(nowUtc, "milliseconds").milliseconds
    }
    else {
      duration = parse(args.when)
    }

    if (duration) {
      setTimeout(() => {
        msg.reply(args.what)
      }, duration)

      msg.react("⏲️")
    }
  }
}