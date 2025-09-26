import parse from "parse-duration"
import { DateTime } from "luxon"
import Command from "../../models/Command.js"

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

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "⏰ Remind Command Help",
          description: "Set personal reminders for yourself!",
          color: 0xffa500,
          fields: [
            {
              name: "⏲️ Usage",
              value: `\`${prefix}remind <when> <what>\`\nSet a reminder\n\`${prefix}reminder <when> <what>\`\nAlias\n\`${prefix}remindme <when> <what>\`\nAlias\nExample: \`${prefix}remind 1h 30m take a break\``,
              inline: false
            },
            {
              name: "⏱️ Time Formats",
              value: "• Duration: '1h 30m', '45s', '2d 5h'\n• Timestamp: '14:30', '09:15:30'\n• Natural: 'in 2 hours', 'tomorrow at 3pm'",
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• Reminders are personal to you\n• Bot will mention you when time is up\n• Use clear, descriptive reminder text\n• Timestamps use 24-hour format",
              inline: false
            }
          ],
          footer: {
            text: "Never forget again! 🧠",
          },
        },
      ],
    }
  }
}