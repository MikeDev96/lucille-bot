const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "pause",
      aliases: [],
      group: "music",
      memberName: "pause",
      description: "Pauses the current playing song",
      guildOnly: true,
    })
  }

  async run (msg) {
    if (msg.channel.guild.lucille) {
      msg.channel.guild.lucille.state.pauser = msg.author.id
      msg.channel.guild.lucille.dispatcherExec(d => d.pause())
      msg.channel.guild.lucille.updateEmbed()
      msg.react("⏸️")
    }
  }
}