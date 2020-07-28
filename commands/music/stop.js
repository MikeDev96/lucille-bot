const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "stop",
      aliases: ["fuckoff", "shlata"],
      group: "music",
      memberName: "stop",
      description: "Stops the bot in it's tracks",
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (msg.channel.guild.lucille && msg.channel.guild.lucille.state && msg.channel.guild.lucille.state.voiceConnection) {
      msg.react("🛑")
      msg.channel.guild.lucille.state.voiceConnection.disconnect()
    }
  }
}