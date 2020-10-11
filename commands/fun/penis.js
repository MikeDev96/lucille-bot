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

  run(msg, _args) {
    const realLength = Math.ceil(Math.random() * 15)
    msg.reply(`8=${"=".repeat(realLength)}D${realLength === 15 ? " ~ ~ ~" : ""}`)
  }
}