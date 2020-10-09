const { Command } = require("discord.js-commando")
const { run } = require("../music/play")

// Basically the jumpqueue command but plays WAP - Zane
module.exports = class CrapCommand extends Command {
  constructor (client) {
    super(client, {
      name: "crap",
      memberName: "crap",
      description: "Plays the crap version of WAP",
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