const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "mw",
      aliases: [],
      group: "whitelist",
      memberName: "mw",
      description: "Whitelist for the !mw command",
      guildOnly: true,
    })
  }

  async run (msg, args) {

  }
}