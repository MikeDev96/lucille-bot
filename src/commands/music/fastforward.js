import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"
import parse from "parse-duration"

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
          key: "duration",
          prompt: "Timestamp to fast forward by in any format",
          type: "string",
          validate: val => {
            const ms = parse(val)
            if (!ms) {
              return "Duration is invalid, try again"
            }

            return true
          },
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    const duration = parse(args.duration)
    music.syncTime(duration)
    music.play("after")
    msg.react("⏩")
  }
}