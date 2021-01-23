const { Command } = require("discord.js-commando")
const { escapeMarkdown } = require("../../helpers")
const config = require("../../config.json")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "stats",
      aliases: ["st", "stat"],
      group: "music",
      memberName: "stats",
      description: "Get stats for the currently playing song",
      args: [
        {
          key: "subject",
          prompt: "Stats for currently playing or all time",
          type: "string",
          oneOf: ["current", "all"],
          default: "current",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = msg.guild.music
    const item = music.state.queue[0]

    if (args.subject === "current" && (!item || !item.youTubeId)) {
      msg.react("🖕")
      return
    }

    if (args.subject === "current") {
      const videoDetails = msg.client.db.getYouTubeStatsForVideo(msg.guild.id, item.youTubeId)

      msg.reply({
        embed: {
          color: 0xf2711c,
          title: "Lucille Stats 📊",
          author: {
            name: msg.member.displayName,
            icon_url: msg.author.displayAvatarURL(),
          },
          fields: [
            {
              name: "Showing Stats For",
              value: msg.guild.customEmojis.youtube + " " + escapeMarkdown(videoDetails.videoTitle),
            },
            {
              name: "Times Played",
              value: `🔢 ${videoDetails.count}`,
              inline: true,
            },
            {
              name: "First Played",
              value: `⬅️ ${videoDetails.firstPlayed}`,
              inline: true,
            },
            {
              name: "Last Played",
              value: `➡️ ${videoDetails.lastPlayed}`,
              inline: true,
            },
          ],
          footer: {
            text: config.discord.footer,
            icon_url: config.discord.authorAvatarUrl,
          },
        },
      })
    }
    else {
      msg.reply("Coming Soon™️")
    }
  }
}