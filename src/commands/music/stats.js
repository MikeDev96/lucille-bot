import Command from "../../classes/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"
import { escapeMarkdown } from "../../helpers.js"

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

  async run (msg, args) {
    const music = LucilleClient.Instance.getMusicInstance(msg.guild)
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
            text: process.env.DISCORD_FOOTER,
            icon_url: process.env.DISCORD_AUTHORAVATARURL,
          },
        },
      })
    }
    else {
      msg.reply("Coming Soon™️")
    }
  }
}