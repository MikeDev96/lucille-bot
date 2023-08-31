import { escapeMarkdown } from "discord.js"
import Command from "../../classes/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
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

  statsFor (msg, videoDetails) {
    return [
      {
        name: "Stats For",
        value: LucilleClient.Instance.getGuildInstance(msg.guild).customEmojis.youtube + " " + escapeMarkdown(videoDetails.videoTitle),
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
    ]
  }

  async run (msg, args) {
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    const item = music.state.queue[0]

    if (args.subject === "current" && (!item || !item.youTubeId)) {
      msg.react("🖕")
      return
    }

    if (args.subject === "current") {
      const videoDetails = LucilleClient.Instance.db.getYouTubeStatsForVideo(msg.guild.id, item.youTubeId)
      if (!videoDetails) {
        msg.reply("No stats available")
        return
      }

      msg.reply({
        embeds: [
          {
            color: 0xf2711c,
            title: "Lucille Stats 📊",
            author: {
              name: msg.member.displayName,
              icon_url: msg.author.displayAvatarURL(),
            },
            fields: this.statsFor(msg, videoDetails),
            footer: {
              text: process.env.DISCORD_FOOTER,
              icon_url: process.env.DISCORD_AUTHORAVATARURL,
            },
          },
        ],
      })
    }
    else {
      const videoDetails = LucilleClient.Instance.db.getYouTubeStatsForAll(msg.guild.id)
      if (!videoDetails || videoDetails.length === 0) {
        msg.reply("No stats available")
        return
      }

      msg.reply({
        embeds: [
          {
            color: 0xf2711c,
            title: "Lucille Leaderboard Stats 📊",
            author: {
              name: msg.member.displayName,
              icon_url: msg.author.displayAvatarURL(),
            },
            fields: videoDetails.flatMap(details => this.statsFor(msg, details)),
            footer: {
              text: process.env.DISCORD_FOOTER,
              icon_url: process.env.DISCORD_AUTHORAVATARURL,
            },
          },
        ],
      })
    }
  }
}