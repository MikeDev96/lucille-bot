const { Command } = require("discord.js-commando")

module.exports = class PlayCommand extends Command {
  constructor (client) {
    super(client, {
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
    const music = msg.guild.music
    if (music.state.queue.length) {
      music.state.queue.splice(0, args.amount)
      music.setState({ queue: music.state.queue })

      if (music.state.queue.length) {
        music.play()
      }
      else {
        music.dispatcherExec(d => d.end())
      }

      msg.react("⏭️")
    }
    else {
      msg.react("🖕")
    }
  }
}