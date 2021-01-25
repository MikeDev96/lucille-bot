const { Command } = require("discord.js-commando")

module.exports = class extends Command {
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

const resume = msg => {
  const music = msg.guild.music
  music.setState({ pauser: "" })
  music.dispatcherExec(d => d.resume())
  music.updateEmbed()
  msg.react("▶️")
}

module.exports.resume = resume