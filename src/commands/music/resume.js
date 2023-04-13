import Command from "../../classes/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
      name: "resume",
      aliases: ["unpause"],
      group: "music",
      memberName: "resume",
      description: "Resumes the current paused song",
      guildOnly: true,
    })
  }

  async run (msg) {
    resume(msg)
  }
}

export const resume = msg => {
  const music = LucilleClient.Instance.getMusicInstance(msg.guild)
  music.setState({ pauser: "" })
  music.player.unpause()
  // Resume is buggy from Node v14.16.1+ therefore restart the stream
  // https://stackoverflow.com/a/67809381
  // music.play("before")
  music.updateEmbed()
  msg.react("▶️")
}