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
    const music = msg.guild.music
    music.setState({ pauser: msg.author.id })
    music.dispatcherExec(d => d.pause())
    music.updateEmbed()
    msg.react("⏸️")
  }
}