const { Command } = require("discord.js-commando")
const { getMusic } = require("../../messageHelpers")

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
    const music = getMusic(msg)
    if (music && music.state && music.state.voiceConnection) {
      msg.react("🛑")
      music.state.voiceConnection.disconnect()
    }
  }
}