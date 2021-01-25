const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
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
    const music = msg.guild.music
    music.state.queue.reverse()
    music.setState({ queue: music.state.queue })
    music.play("after")
    msg.react("◀️")
  }
}