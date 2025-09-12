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
    if (!isInBotsVoiceChannel(LucilleClient.Instance, msg)) {
      msg.react("🖕")
      return
    }
    
    if (!music.player || music.player.state.status === 'idle') {
      msg.reply("❌ Nothing is currently playing to pause")
      return
    }
    
    try {
      music.setState({ pauser: msg.author.id })
      music.player.pause()
      music.updateEmbed()
      msg.react("⏸️")
    } catch (error) {
      console.error("Pause command error:", error)
      msg.reply(`❌ Failed to pause: ${error.message}`)
    }
  }
}