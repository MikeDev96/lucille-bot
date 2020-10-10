const { Command } = require("discord.js-commando")
const { run } = require("../music/play")

// Basically the jumpqueue command but plays WAP
module.exports = class WapCommand extends Command {
  constructor (client) {
    super(client, {
      name: "wap",
      memberName: "wap",
      description: "Plays the good version of WAP",
      group: "fun",
      aliases: [],
    })
  }

  async run (msg, _args) {
    run(msg, {
      input: "wap zane",
    }, 1)
  }
}