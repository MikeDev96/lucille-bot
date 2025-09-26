import Command from "../../models/Command.js"

export default class LocalTime extends Command {
  constructor () {
    super({
      name: "localtime",
      aliases: ["time"],
      group: "misc",
      memberName: "time",
      description: "Returns server time",
      guildOnly: true,
    })
  }

  async run (msg, args) {
    msg.react("⏲️")

    msg.reply(new Date().toLocaleTimeString())
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "⏰ Local Time Command Help",
          description: "Get the current server time!",
          color: 0x87ceeb,
          fields: [
            {
              name: "🕐 Usage",
              value: `\`${prefix}localtime\`\nGet current server time\n\`${prefix}time\`\nShort alias`,
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• Shows time in server's local timezone\n• Useful for coordinating events\n• Simple and quick time check",
              inline: false
            }
          ],
          footer: {
            text: "Time flies! ⏰",
          },
        },
      ],
    }
  }
}