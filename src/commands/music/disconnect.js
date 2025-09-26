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

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "🛑 Disconnect Command Help",
          description: "Stop the bot and disconnect from voice channel!",
          color: 0xff0000,
          fields: [
            {
              name: "🚪 Usage",
              value: `\`${prefix}disconnect\`\nStop and disconnect the bot\n\`${prefix}fuckoff\`\nAlias\n\`${prefix}leave\`\nAlias\n\`${prefix}altf4\`\nAlias`,
              inline: false
            },
            {
              name: "🎵 What It Does",
              value: "• Stops the current song\n• Clears the entire queue\n• Disconnects from voice channel\n• Resets bot state",
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• Bot must be connected to use this\n• Cannot be undone\n• Use 'summon' to reconnect\n• Multiple aliases available",
              inline: false
            }
          ],
          footer: {
            text: "Goodbye! 👋",
          },
        },
      ],
    }
  }
}