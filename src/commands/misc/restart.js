import { exec } from "child_process"
import Command from "../../models/Command.js"

export default class extends Command {
  constructor () {
    super({
      name: "restart",
      aliases: [],
      group: "misc",
      memberName: "restart",
      description: "Restarts the Lucille instance",
      args: [],
      guildOnly: true,
    })
  }

  async run (msg) {
    if (!msg.member.roles.cache.find(role => role.name === "💪 Boss Men")) {
      msg.react("🖕")
      return
    }

    msg.react("🔄")

    process.exit(0)
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "🔄 Restart Command Help",
          description: "Restart the Lucille bot instance (Admin only)",
          color: 0xff0000,
          fields: [
            {
              name: "⚠️ Admin Only",
              value: `\`${prefix}restart\`\nRestart the bot\n• Requires "💪 Boss Men" role\n• Immediately restarts the bot\n• Use with caution!`,
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• Only use when necessary\n• Bot will go offline briefly\n• All active processes will stop\n• Bot will automatically restart",
              inline: false
            }
          ],
          footer: {
            text: "Handle with care! ⚠️",
          },
        },
      ],
    }
  }
}