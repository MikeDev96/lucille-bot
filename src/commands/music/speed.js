import Command from "../../classes/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
      name: "speed",
      aliases: ["spd"],
      group: "music",
      memberName: "speed",
      description: "Changes the speed of the player.",
      args: [
        {
          key: "speed",
          prompt: "Speed multiplier",
          type: "float",
          oneOf: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    music.syncTime()
    music.setState({ tempo: args.speed })
    music.play("after")
    msg.react(args.speed === 1 ? "🔄" : args.speed > 1 ? "💨" : "🐌")
  }
}