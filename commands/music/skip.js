const { Command } = require("discord.js-commando")

module.exports = class PlayCommand extends Command {
  constructor (client) {
    super(client, {
      name: "skip",
      aliases: [],
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
    if (msg.channel.guild.lucille) {
      msg.channel.guild.lucille.state.queue.splice(1, args.amount - 1)
      msg.channel.guild.lucille.dispatcherExec(d => d.end())
      msg.react("⏭️")
    }
  }
}