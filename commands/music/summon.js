const { Command } = require("discord.js-commando")
const { getOrCreateMusic } = require("../../classes/Helpers")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "summon",
      aliases: ["sum"],
      group: "music",
      memberName: "summon",
      description: "Summons the bot",
      guildOnly: true,
    })
  }

  async run (msg, _args) {
    if (!msg.member.voice || !msg.member.voice.channel) {
      msg.react("🖕")
      return
    }

    const music = getOrCreateMusic(msg)
    music.summon(msg.member.voice.channel, true)

    msg.react("🧞")
  }
}