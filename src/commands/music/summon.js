import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
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
      msg.reply("❌ You need to be in a voice channel to summon the bot")
      return
    }

    try {
      const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
      music.summon(msg.member.voice.channel)
      await music.play()
      msg.react("🧞")
    } catch (error) {
      console.error("Summon command error:", error)
      msg.reply(`❌ Failed to summon bot: ${error.message}`)
    }
  }
}