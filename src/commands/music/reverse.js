import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
      name: "reverse",
      aliases: ["rev"],
      group: "music",
      memberName: "reverse",
      description: "Reverses the queue including the current playing track.",
      args: [],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    music.state.queue.reverse()
    music.setState({ queue: music.state.queue })
    music.play("after")
    msg.react("◀️")
  }
}