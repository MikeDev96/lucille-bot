import Commando from "discord.js-commando"
const { Command } = Commando

export default class extends Command {
  constructor (client) {
    super(client, {
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
  const music = msg.guild.music
  music.setState({ pauser: "" })
  music.dispatcherExec(d => d.resume())
  // Resume is buggy from Node v14.16.1+ therefore restart the stream
  // https://stackoverflow.com/a/67809381
  music.play("before")
  msg.react("▶️")
}