import parse from "parse-duration"
import { msToTimestamp } from "../../helpers.js"
import Command from "../../models/Command.js"

export default class extends Command {
  constructor () {
    super({
      name: "timer",
      aliases: ["settimer"],
      group: "misc",
      memberName: "timer",
      description: "Set a timer",
      args: [
        {
          key: "duration",
          prompt: "How long",
          type: "string",
          validate: val => {
            const ms = parse(val)
            if (!ms) {
              return "Duration is invalid, try again"
            }
            if (ms >= (24 * 60 * 60 * 1000)) {
              return "Duration must be less than 1 day"
            }

            return true
          },
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    msg.react("⌛")

    const duration = parse(args.duration)
    const reply = await msg.channel.send(`\`${msg.member.displayName}\` set a timer!\n${msToTimestamp(duration)}`)

    const startTimestamp = new Date().getTime()

    const handle = setInterval(() => {
      const currentTimestamp = new Date().getTime()
      const elapsed = currentTimestamp - startTimestamp
      const elapsedRounded = Math.round(elapsed / 1000) * 1000
      reply.edit(`\`${msg.member.displayName}\` set a timer!\n${msToTimestamp(duration - elapsedRounded)}`)
    }, 5000)

    setTimeout(async () => {
      clearInterval(handle)
      reply.delete()
      const finishMsg = await msg.channel.send(`\`${msg.member.displayName}\`'s timer has finished!`)
      finishMsg.react("⌛")
    }, duration)
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "⏰ Timer Command Help",
          description: "Set a countdown timer with live updates!",
          color: 0x32cd32,
          fields: [
            {
              name: "⏲️ Usage",
              value: `\`${prefix}timer <duration>\`\nSet a countdown timer\n\`${prefix}settimer <duration>\`\nAlias\nExample: \`${prefix}timer 1h 30m\``,
              inline: false
            },
            {
              name: "⏱️ Duration Formats",
              value: "• Hours: '1h', '2h 30m'\n• Minutes: '45m', '1h 15m'\n• Seconds: '30s', '1m 30s'\n• Days: '1d', '2d 5h' (max 1 day)",
              inline: false
            },
            {
              name: "💡 Features",
              value: "• Live countdown updates every 5 seconds\n• Timer message deletes when finished\n• Notification when timer completes\n• Maximum duration: 24 hours",
              inline: false
            }
          ],
          footer: {
            text: "Time's ticking! ⏰",
          },
        },
      ],
    }
  }
}