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
      msg.react("🖕")
      return
    }

    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    music.summon(msg.member.voice.channel, true)
    await music.play()

    msg.react("🧞")
  }
}