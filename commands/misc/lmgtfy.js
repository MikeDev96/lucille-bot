const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "letmegooglethatforyou",
      aliases: ["lmgtfy"],
      group: "misc",
      memberName: "lmgtfy",
      description: "A response to a snooty response to someone asking for help",
      args: [],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (encodeURI("https://www.google.co.uk/search?q=" + args).length > 1999) {
      args = "That was too big"
      msg.reply(`The person was just asking for help, ${msg.author.username} you wet egg. ${encodeURI("https://www.google.co.uk/search?q=" + args)}`)
    }
    else {
      msg.reply(`The person was just asking for help, ${msg.author.username} you wet egg. ${encodeURI("https://www.google.co.uk/search?q=" + args)}`)
    }
  }
}