import Commando from "discord.js-commando"
const { Command } = Commando

export default class extends Command {
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
    await music.summon(msg.member.voice.channel, true)
    await music.play()

    msg.react("🧞")
  }
}