const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "speed",
      aliases: ["spd"],
      group: "music",
      memberName: "speed",
      description: "Changes the speed of the player.",
      args: [
        {
          key: "speed",
          prompt: "Speed multiplier",
          type: "float",
          oneOf: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (msg.channel.guild.lucille) {
      msg.channel.guild.lucille.state.playTime += msg.channel.guild.lucille.dispatcherExec(d => d.streamTime) || 0
      msg.channel.guild.lucille.state.tempo = args.speed
      msg.channel.guild.lucille.play()
      msg.react(args.speed === 1 ? "🔄" : args.speed > 1 ? "💨" : "🐌")
    }
  }
}