import { exec } from "child_process"
import Command from "../../classes/Command.js"

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

    exec("pm2 reload lucille", err => {
      if (err) {
        msg.react("❌")
        console.error(err.message)
      }
    })
  }
}