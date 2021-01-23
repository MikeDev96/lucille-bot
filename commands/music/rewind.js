const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "rewind",
      aliases: ["rw"],
      group: "music",
      memberName: "rewind",
      description: "Rewinds the player by the specified amount.",
      args: [
        {
          key: "amount",
          prompt: "Timestamp to rewind by in (mm:ss) or seconds",
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
    const music = msg.guild.music
    let amount = 0
    const match = args.amount.match(/^(\d{1,2}):(\d{1,2})$/)
    if (match) {
      amount = parseInt(match[1]) * 60 + parseInt(match[2])
    }
    else {
      amount = parseInt(args.amount)
    }

    music.syncTime(amount * -1000)
    music.play("after")
    msg.react("⏪")
  }
}