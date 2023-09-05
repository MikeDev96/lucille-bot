import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
      name: "fastforward",
      aliases: ["ff", "fwd"],
      group: "music",
      memberName: "fastforward",
      description: "Fast forwards the player by the specified amount.",
      args: [
        {
          key: "amount",
          prompt: "Timestamp to fast forward by in (mm:ss) or seconds",
          type: "string",
          validate: text => {
            if (/^\d{1,2}:\d{1,2}$/.test(text)) {
              return true
            }

            if (/^\d+$/.test(text)) {
              return true
            }

            return "Invalid input"
          },
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    let amount = 0
    const match = args.amount.match(/^(\d{1,2}):(\d{1,2})$/)
    if (match) {
      amount = parseInt(match[1]) * 60 + parseInt(match[2])
    }
    else {
      amount = parseInt(args.amount)
    }

    music.syncTime(amount * 1000)
    music.play("after")
    msg.react("⏩")
  }
}