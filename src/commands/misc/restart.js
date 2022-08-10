import Commando from "discord.js-commando"
import { exec } from "child_process"
const { Command } = Commando

export default class extends Command {
  constructor (client) {
    super(client, {
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
    }
    else {
      msg.react("🔄")

      exec("pm2 reload lucille", err => {
        if (err) {
          msg.react("❌")
          console.error(err.message)
        }
      })
    }
  }
}