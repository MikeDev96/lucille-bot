const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "bassboost",
      aliases: ["bb", "bass"],
      group: "music",
      memberName: "bassboost",
      description: "Changes the bass boost",
      args: [
        {
          key: "amount",
          prompt: "Amount of bass boost",
          type: "string",
          oneOf: ["off", "low", "med", "high", "insane", "wtfbbq"],
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (msg.channel.guild.lucille) {
      msg.channel.guild.lucille.state.playTime += msg.channel.guild.lucille.dispatcherExec(d => d.streamTime) || 0
      msg.channel.guild.lucille.state.bassBoost = bassBoostToAmountMap[args.amount]
      msg.channel.guild.lucille.play()
      msg.react("🎸")
    }
  }
}

const bassBoostToAmountMap = {
  off: 0,
  low: 5,
  med: 10,
  high: 15,
  insane: 20,
  wtfbbq: 50,
}

const amountToBassBoostMap = {
  0: "Off",
  5: "Low",
  10: "Med",
  15: "High",
  20: "Insane",
  50: "WTFBBQ",
}

module.exports.amountToBassBoostMap = amountToBassBoostMap