const { Command } = require("discord.js-commando")
const { getOrCreateMusic } = require("../../classes/Helpers")

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
    const music = getOrCreateMusic(msg)
    music.state.playTime += music.dispatcherExec(d => d.streamTime) || 0
    music.state.tempo = args.speed
    music.play("after")
    msg.react(args.speed === 1 ? "🔄" : args.speed > 1 ? "💨" : "🐌")
  }
}