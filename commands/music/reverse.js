const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "reverse",
      aliases: ["rev"],
      group: "music",
      memberName: "reverse",
      description: "Reverses the queue including the current playing track.",
      args: [],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (msg.channel.guild.lucille) {
      msg.channel.guild.lucille.state.queue.reverse()
      msg.channel.guild.lucille.searchAndPlay()
      msg.react("◀️")
    }
  }
}