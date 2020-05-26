const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "volume",
      aliases: ["vol"],
      group: "music",
      memberName: "volume",
      description: "Changes the volume of the player.",
      args: [
        {
          key: "volume",
          prompt: "Enter volume between 1 & 300",
          type: "integer",
          validate: num => num >= 1 && num <= 300,
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (msg.channel.guild.lucille) {
      const currentVol = msg.channel.guild.lucille.state.volume

      msg.channel.guild.lucille.state.volume = args.volume
      msg.channel.guild.lucille.dispatcherExec(d => d.setVolumeLogarithmic(args.volume / 100))
      msg.channel.guild.lucille.updateEmbed()

      msg.react(args.volume > currentVol ? "🔊" : args.volume < currentVol ? "🔉" : "🔈")
    }
  }
}