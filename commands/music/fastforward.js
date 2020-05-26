const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "fastforward",
      aliases: ["ff", "fwd"],
      group: "music",
      memberName: "fastforward",
      description: "Fast forwards the player by the specified amount.",
      args: [
        {
          key: "amount",
          prompt: "Timestamp to fast forward by in (mm:ss) or seconds",
          type: "string",
          validate: text => {
            if (/^\d{1,2}:\d{1,2}$/.test(text)) {
              return true
            }

            if (/^\d+$/.test(text)) {
              return true
            }

            return "Invalid input"
          },
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (msg.channel.guild.lucille) {
      let amount = 0
      const match = args.amount.match(/^(\d{1,2}):(\d{1,2})$/)
      if (match) {
        amount = parseInt(match[1]) * 60 + parseInt(match[2])
      }
      else {
        amount = parseInt(args.amount)
      }

      msg.channel.guild.lucille.state.playTime += msg.channel.guild.lucille.dispatcherExec(d => d.streamTime) + amount * 1000
      msg.channel.guild.lucille.play()
      msg.react("⏩")
    }
  }
}