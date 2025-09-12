import { AudioPlayerStatus, getVoiceConnection } from "@discordjs/voice"
import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
      name: "stop",
      aliases: ["fuckoff", "shlata", "alt f4", "altf4", "leave"],
      group: "music",
      memberName: "stop",
      description: "Stops the bot in it's tracks",
      guildOnly: true,
    })
  }

  async run (msg, args) {
    try {
      const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
      
      if (!music.state.voiceChannel) {
        msg.reply("❌ Bot is not connected to a voice channel")
        return
      }
      
      if (music.player.state.status !== AudioPlayerStatus.Idle) {
        msg.react("🛑")

        const connection = getVoiceConnection(msg.guild.id)
        if (connection) {
          connection.disconnect()
        }
      } else {
        msg.reply("❌ Bot is not currently playing anything")
      }
    } catch (error) {
      console.error("Stop command error:", error)
      msg.reply(`❌ Failed to stop: ${error.message}`)
    }
  }
}