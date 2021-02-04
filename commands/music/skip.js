const { Command } = require("discord.js-commando")
const { isInBotsVoiceChannel } = require("../../helpers")

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
    if (!isInBotsVoiceChannel(msg)) {
      msg.react("🖕")
      return
    }
    music.state.queue.splice(1, args.amount - 1)
    music.setState({ queue: music.state.queue })
    music.dispatcherExec(d => d.end())
    msg.react("⏭️")
  }
}