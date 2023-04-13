import Command from "../../classes/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"
import { shuffle } from "../../helpers.js"

export default class extends Command {
  constructor () {
    super({
      name: "shuffle",
      aliases: ["shuf", "shuff"],
      group: "music",
      memberName: "shuffle",
      description: "Shuffles the queue.",
      args: [],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    const shuffledTracks = music.state.queue.splice(1)
    shuffle(shuffledTracks)
    music.state.queue.push(...shuffledTracks)
    music.setState({ queue: music.state.queue })
    music.updateEmbed()
    msg.react("🔀")
  }
}