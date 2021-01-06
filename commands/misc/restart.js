const { Command } = require("discord.js-commando")
const { exec } = require("child_process")

module.exports = class extends Command {
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