const { Command } = require("discord.js-commando")
const axios = require("axios")

const YOUTUBE_REGEX_PATTERN = /(?:https?:\/\/www.)?youtu(?:be.com\/watch\?v=|.be\/)([\w-]+)/

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "yousync",
      aliases: ["ys"],
      group: "misc",
      memberName: "yousync",
      description: "Create a YouSync room",
      args: [
        {
          key: "link",
          prompt: "Enter a YouTube link",
          type: "string",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const [, youtubeId] = args.link.match(YOUTUBE_REGEX_PATTERN) || []

    const res = await axios({
      method: "POST",
      url: `${process.env.YOUSYNC_API_URL}/api/room?username=${this.client.user.username}&video=${youtubeId}`,
    })

    if (res && res.status === 200) {
      msg.reply(`${process.env.YOUSYNC_URL}/room/${res.data.id}`)
    }
  }
}