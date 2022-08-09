import Commando from "discord.js-commando"
import { shuffle } from "../../helpers.js"
const { Command } = Commando

export default class extends Command {
  constructor (client) {
    super(client, {
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
    const music = msg.guild.music
    const shuffledTracks = music.state.queue.splice(1)
    shuffle(shuffledTracks)
    music.state.queue.push(...shuffledTracks)
    music.setState({ queue: music.state.queue })
    music.updateEmbed()
    msg.react("🔀")
  }
}