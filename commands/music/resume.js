const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "resume",
      aliases: ["unpause"],
      group: "music",
      memberName: "resume",
      description: "Resumes the current paused song",
      guildOnly: true,
    })
  }

  async run (msg) {
    if (msg.channel.guild.lucille) {
      msg.channel.guild.lucille.state.pauser = ""
      msg.channel.guild.lucille.dispatcherExec(d => d.resume())
      msg.channel.guild.lucille.updateEmbed()
      msg.react("▶️")
    }
  }
}