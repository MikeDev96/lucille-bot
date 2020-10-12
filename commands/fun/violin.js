const { Command } = require("discord.js-commando")

module.exports = class ViolinCommand extends Command {
  constructor (client) {
    super(client, {
      name: "violin",
      memberName: "violin",
      description: "Returns the violin gif",
      group: "fun",
      aliases: ["vi"],
    })
  }

  async run (msg, _args) {
    msg.channel.send('https://tenor.com/view/sad-upset-violin-sponge-bob-mr-crab-gif-3388117')
  }
}
