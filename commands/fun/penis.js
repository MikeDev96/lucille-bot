const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor(client) {
    super(client, {
      name: "penis",
      aliases: ["pp"],
      group: "fun",
      memberName: "penis",
      description: "Penis Length",
      args: [],
      guildOnly: true,
    })
  }

  run(msg, args) {
    msg.reply(`8=${"=".repeat(Math.floor(Math.random() * 15))}D`)
  }

}


