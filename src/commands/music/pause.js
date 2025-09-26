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

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "⏸️ Pause Command Help",
          description: "Pause the currently playing music!",
          color: 0xffa500,
          fields: [
            {
              name: "🎵 Usage",
              value: `\`${prefix}pause\`\nPause the current song`,
              inline: false
            },
            {
              name: "⚠️ Requirements",
              value: "• Must be in the same voice channel as the bot\n• Music must be currently playing\n• Use 'resume' to continue",
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• Paused music can be resumed with 'resume'\n• Only the person who paused can resume\n• Queue continues to work while paused",
              inline: false
            }
          ],
          footer: {
            text: "Take a break! ⏸️",
          },
        },
      ],
    }
  }
}