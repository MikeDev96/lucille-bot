import Commando from "discord.js-commando"
import { isInBotsVoiceChannel } from "../../helpers.js"
const { Command } = Commando

export default class extends Command {
  constructor (client) {
    super(client, {
      name: "pause",
      aliases: [],
      group: "music",
      memberName: "pause",
      description: "Pauses the current playing song",
      guildOnly: true,
    })
  }

  async run (msg) {
    const music = msg.guild.music
    if (!isInBotsVoiceChannel(msg)) {
      msg.react("🖕")
      return
    }
    music.setState({ pauser: msg.author.id })
    music.dispatcherExec(d => d.pause())
    music.updateEmbed()
    msg.react("⏸️")
  }
}