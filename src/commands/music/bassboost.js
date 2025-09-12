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
}

const bassBoostToAmountMap = {
  off: 0,
  low: 5,
  med: 10,
  high: 15,
  insane: 20,
  wtfbbq: 50
}