const { Command } = require("discord.js-commando")
const { getMusic } = require("../../messageHelpers")

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
    const music = getMusic(msg)
    let amount = 0
    const match = args.amount.match(/^(\d{1,2}):(\d{1,2})$/)
    if (match) {
      amount = parseInt(match[1]) * 60 + parseInt(match[2])
    }
    else {
      amount = parseInt(args.amount)
    }

    const position = music.state.playTime + music.dispatcherExec(d => d.streamTime)
    music.state.playTime = Math.max(position - amount * 1000, 0)
    music.play()
    msg.react("⏪")
  }
}