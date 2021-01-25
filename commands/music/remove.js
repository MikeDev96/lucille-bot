const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "remove",
      aliases: ["rm", "rem", "delete", "del"],
      group: "music",
      memberName: "remove",
      description: "Removes a single or range of tracks from the queue.",
      args: [
        {
          key: "range",
          prompt: "Enter a queue position or a range (1-5).",
          type: "string",
          validate: text => {
            if (/^\d+-\d+$/.test(text)) {
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
    let range = [1, 1]
    const match = args.range.match(/^(\d+)\W(\d+)$/)
    if (match) {
      range = [parseInt(match[1]), parseInt(match[2])]
    }
    else {
      range = [parseInt(args.range), parseInt(args.range)]
    }

    music.state.queue.splice(range[0], (range[1] - range[0]) + 1)
    music.setState({ queue: music.state.queue })
    music.updateEmbed()

    msg.react("❌")
  }
}