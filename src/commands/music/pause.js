import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"
import { isInBotsVoiceChannel } from "../../helpers.js"

export default class extends Command {
  constructor () {
    super({
      name: "pause",
      aliases: [],
      group: "music",
      memberName: "pause",
      description: "Pauses the current playing song",
      guildOnly: true,
    })
  }

  async run (msg) {
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    if (!isInBotsVoiceChannel(msg)) {
      msg.react("🖕")
      return
    }
    music.setState({ pauser: msg.author.id })
    music.player.pause()
    music.updateEmbed()
    msg.react("⏸️")
  }
}