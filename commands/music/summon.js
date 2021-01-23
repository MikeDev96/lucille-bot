const { Command } = require("discord.js-commando")

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

    const music = msg.guild.music
    music.summon(msg.member.voice.channel, true)

    msg.react("🧞")
  }
}