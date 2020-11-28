const { Command } = require("discord.js-commando")
const { getOrCreateMusic } = require("../../classes/Helpers")

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
    const music = getOrCreateMusic(msg)
    if (music && music.state && music.state.voiceConnection) {
      msg.react("🛑")
      music.state.voiceConnection.disconnect()
    }
  }
}