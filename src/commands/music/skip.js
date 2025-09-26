import { shouldIgnoreMessage } from "../../helpers.js"
import LucilleClient from "../../classes/LucilleClient.js"
import Command from "../../models/Command.js"

export default class extends Command {
  constructor () {
    super({
      name: "skip",
      aliases: ["s"],
      group: "music",
      memberName: "skip",
      description: "Skip command",
      args: [
        {
          key: "amount",
          prompt: "The amount of tracks to skip",
          type: "integer",
          default: 1,
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    if (shouldIgnoreMessage(LucilleClient.Instance, msg)) {
      msg.react("🖕")
      return
    }
    
    if (!music.state.queue || music.state.queue.length === 0) {
      msg.reply("❌ No songs in queue to skip")
      return
    }
    
    if (args.amount > music.state.queue.length) {
      msg.reply(`❌ Cannot skip ${args.amount} songs, only ${music.state.queue.length} songs in queue`)
      return
    }
    
    try {
      music.state.queue.splice(1, args.amount - 1)
      music.setState({ queue: music.state.queue })
      music.player.stop()
      msg.react("⏭️")
    } catch (error) {
      console.error("Skip command error:", error)
      msg.reply(`❌ Failed to skip songs: ${error.message}`)
    }
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "⏭️ Skip Command Help",
          description: "Skip songs in the music queue!",
          color: 0x1e90ff,
          fields: [
            {
              name: "🎵 Usage",
              value: `\`${prefix}skip\`\nSkip current song\n\`${prefix}skip <number>\`\nSkip multiple songs\n\`${prefix}s <number>\`\nShort alias\nExample: \`${prefix}skip 3\``,
              inline: false
            },
            {
              name: "⚠️ Requirements",
              value: "• Must be in the same voice channel as the bot\n• Songs must be in the queue\n• Cannot skip more songs than available",
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• Default skips 1 song\n• Use numbers to skip multiple\n• Skipped songs are removed from queue\n• Bot automatically plays next song",
              inline: false
            }
          ],
          footer: {
            text: "Skip to the good stuff! ⏭️",
          },
        },
      ],
    }
  }
}