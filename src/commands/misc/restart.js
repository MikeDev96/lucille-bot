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
}