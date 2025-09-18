import { AudioPlayerStatus, getVoiceConnection } from "@discordjs/voice"
import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
      name: "disconnect",
      aliases: ["fuckoff", "shlata", "alt f4", "altf4", "leave"],
      group: "music",
      memberName: "disconnect",
      description: "Shlata's the bot",
      guildOnly: true,
    })
  }

  async run (msg) {
    try {
      const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
      
      if (!music.state.voiceChannel) {
        msg.reply("❌ Bot is not connected to a voice channel")
        return
      }

      msg.react("🔌")

      music.state.queue.splice(1)
      music.setState({ queue: music.state.queue })

      const isPlaying = music.player.state.status !== AudioPlayerStatus.Idle

      if (isPlaying) {
        music.setState({ summoned: false })
        music.player.stop()
      }
      else {
        getVoiceConnection(msg.guild.id)?.disconnect()
      }

      music.updateEmbed()
    }
    catch (error) {
      console.error("Disconnect command error:", error)
      msg.reply(`❌ Failed to disconnect: ${error.message}`)
    }
  }
}