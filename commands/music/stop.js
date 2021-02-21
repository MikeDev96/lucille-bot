const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "stop",
      aliases: ["fuckoff", "shlata", "alt f4", "altf4"],
      group: "music",
      memberName: "stop",
      description: "Stops the bot in it's tracks",
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = msg.guild.music
    if (music && music.state && music.state.voiceConnection) {
      msg.react("🛑")
      music.state.queue.splice(0, music.state.queue.length)
      music.setState({ queue: music.state.queue })
      music.state.voiceConnection.disconnect()
    }
  }
}