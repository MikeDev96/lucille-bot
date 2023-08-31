import { shouldIgnoreMessage } from "../../helpers.js"
import LucilleClient from "../../classes/LucilleClient.js"
import Command from "../../classes/Command.js"

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
    if (shouldIgnoreMessage(msg)) {
      msg.react("🖕")
      return
    }
    music.state.queue.splice(1, args.amount - 1)
    music.setState({ queue: music.state.queue })
    music.player.stop()
    msg.react("⏭️")
  }
}