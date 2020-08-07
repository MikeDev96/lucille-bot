const { Command } = require("discord.js-commando")
const axios = require("axios")

const YOUTUBE_REGEX_PATTERN = /(?:https?:\/\/www.)?youtu(?:be.com\/watch\?v=|.be\/)([\w-]+)/

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "w2g",
      aliases: [],
      group: "misc",
      memberName: "w2g",
      description: "Create a Watch2Gether room",
      args: [
        {
          key: "link",
          prompt: "Enter a YouTube link",
          type: "string",
          validate: link => {
            const isLink = YOUTUBE_REGEX_PATTERN.test(link)
            if (!isLink) {
              return "Link is invalid"
            }

            return true
          },
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const { channel, author: { username, avatarURL } } = msg

    const [, youtubeId] = args.link.match(YOUTUBE_REGEX_PATTERN) || []

    const res = await axios({
      method: "GET",
      url: `https://www.watch2gether.com/w2g_search/lookup?url=${encodeURIComponent(`//www.youtube.com/watch?v=${youtubeId}`)}`,
    })

    if (res && res.status === 200) {
      const { title, url, thumb } = res.data
      this.createW2GRoom(`https:${url}`, title, thumb, channel, username, avatarURL)
    }
  }

  async createW2GRoom (url, title, thumb, channel, username, avatar) {
    const room = await axios({
      method: "POST",
      url: "https://www.watch2gether.com/rooms/create.json",
      body: JSON.stringify({
        share: url,
        api_key: "ujwwerjjc2bwef4d",
      }),
      headers: { "Content-Type": "application/json" },
    })

    if (room && room.status === 200) {
      const roomUrl = `https://www.watch2gether.com/rooms/${room.data.streamkey}`

      await channel.send({
        embed: {
          color: 0xfacd3b,
          author: {
            name: username,
            icon_url: avatar,
          },
          title: "Watch2Gether",
          description: title,
          thumbnail: {
            url: "https://www.watch2gether.com/assets/w2g-logo-crop-11b860814603558b84aba34e184042b4905b1dd588a2612956077fc5a3d7a4db.png",
          },
          footer: {
            text: "Created with ♥ by Migul, Powered by Keef Web Services",
            icon_url: "https://cdn.discordapp.com/avatars/155065678318141440/8b109982662eac1033c824d8d61d3859.png?size=2048",
          },
          fields: [
            {
              name: "Join",
              value: `[Click Here](${roomUrl})`,
            },
          ],
          image: {
            url: thumb,
          },
        },
      })
    }
  }
}