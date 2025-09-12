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
}