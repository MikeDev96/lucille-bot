const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "seek",
      aliases: [],
      group: "music",
      memberName: "seek",
      description: "Seeks to a position in the track",
      args: [
        {
          key: "position",
          prompt: "Timestamp to seek to in (mm:ss) or seconds",
          type: "string",
          validate: text => {
            if (/^\d{1,2}:\d{1,2}$/.test(text)) {
              return true
            }

            if (/^\d+$/.test(text)) {
              return true
            }

            return false
          },
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = msg.guild.music
    if (!music.state.queue.length) {
      return
    }

    let position = 0
    const match = args.position.match(/^(\d{1,2}):(\d{1,2})$/)
    if (match) {
      position = parseInt(match[1]) * 60 + parseInt(match[2])
    }
    else {
      position = parseInt(args.position)
    }

    music.state.queue[0].setStartTime(position * 1000)
    music.setState({ queue: music.state.queue })
    music.play("after")
    msg.react("⏩")
  }
}