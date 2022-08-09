import Commando from "discord.js-commando"
const { Command } = Commando

export default class extends Command {
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