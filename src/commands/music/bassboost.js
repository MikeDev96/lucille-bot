import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"
import debug from "../../utils/debug.js"

export default class extends Command {
  constructor () {
    super({
      name: "bassboost",
      aliases: ["bb", "bass"],
      group: "music",
      memberName: "bassboost",
      description: "Changes the bass boost",
      args: [
        {
          key: "amount",
          prompt: "Amount of bass boost",
          type: "string",
          oneOf: Object.keys(bassBoostToAmountMap),
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    try {
      const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
      const bassBoostValue = bassBoostToAmountMap[args.amount.toLowerCase()]
      
      debug.command(`Bass boost command: ${args.amount} -> ${bassBoostValue}`)
      debug.music(`Current bass boost state: ${music.state.bassBoost}`)
      
      if (bassBoostValue === undefined) {
        debug.error(`Invalid bass boost value: ${args.amount}`)
        return msg.reply(`Invalid bass boost level: ${args.amount}`)
      }
      
      music.syncTime()
      music.setState({ bassBoost: bassBoostValue })
      
      debug.music(`New bass boost state: ${music.state.bassBoost}`)
      
      // Only try to play if there's something in the queue
      if (music.state.queue.length > 0) {
        await music.play("after")
        msg.react("🎸")
      } else {
        msg.react("🎸")
        msg.reply(`Bass boost set to **${bassBoostValue > 0 ? `${bassBoostValue}dB` : 'Off'}** - will apply to next track`)
      }
    } catch (error) {
      debug.error("Bass boost error:", error)
      msg.reply(`Error applying bass boost: ${error.message}`)
    }
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "🎸 Bass Boost Command Help",
          description: "Enhance the bass in your music with different intensity levels!",
          color: 0x1db954,
          fields: [
            {
              name: "🎵 Bass Levels",
              value: `\`${prefix}bassboost off\` - No bass boost (0dB)\n\`${prefix}bassboost low\` - Light boost (5dB)\n\`${prefix}bassboost med\` - Medium boost (10dB)\n\`${prefix}bassboost high\` - Strong boost (15dB)\n\`${prefix}bassboost insane\` - Extreme boost (20dB)\n\`${prefix}bassboost wtfbbq\` - Maximum boost (50dB)`,
              inline: false
            },
            {
              name: "🎯 Aliases",
              value: `\`${prefix}bb\`, \`${prefix}bass\``,
              inline: true
            },
            {
              name: "💡 Usage Tips",
              value: "• Bass boost applies to the current track if playing\n• If no music is playing, it will apply to the next track\n• Higher levels may cause distortion\n• Use `off` to disable bass boost",
              inline: false
            }
          ],
          footer: {
            text: "Requires music to be playing • Bass boost affects audio quality",
          },
        },
      ],
    }
  }
}

const bassBoostToAmountMap = {
  off: 0,
  low: 5,
  med: 10,
  high: 15,
  insane: 20,
  wtfbbq: 50
}

export { bassBoostToAmountMap }