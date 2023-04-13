import Command from "../../classes/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
      name: "stop",
      aliases: ["fuckoff", "shlata", "alt f4", "altf4", "leave"],
      group: "music",
      memberName: "stop",
      description: "Stops the bot in it's tracks",
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = LucilleClient.Instance.getMusicInstance(msg.guild)
    if (music && music.state && music.state.voiceConnection) {
      msg.react("🛑")
      music.state.queue.splice(0, music.state.queue.length)
      music.setState({ queue: music.state.queue })
      music.state.voiceConnection.disconnect()
    }
  }
}