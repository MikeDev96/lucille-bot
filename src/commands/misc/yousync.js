import fetch from "node-fetch"
import LucilleClient from "../../classes/LucilleClient.js"
import Command from "../../models/Command.js"

const YOUTUBE_REGEX_PATTERN = /(?:https?:\/\/www.)?youtu(?:be.com\/watch\?v=|.be\/)([\w-]+)/

export default class extends Command {
  constructor () {
    super({
      name: "yousync",
      aliases: ["ys"],
      group: "misc",
      memberName: "yousync",
      description: "Create a YouSync room",
      args: [
        {
          key: "strength",
          prompt: "Enter a sponsor skip strength (optional)",
          type: "string",
          default: "low",
        },
        {
          key: "link",
          prompt: "Enter a YouTube link",
          type: "string",
          default: "",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (args.strength === "help") {
      msg.reply(getHelpMessage(LucilleClient.Instance.commandPrefix))
      return
    }

    if (!process.env.YOUSYNC_API_URL || !process.env.YOUSYNC_URL) {
      msg.reply('YouSync is not configured. Please set YOUSYNC_API_URL and YOUSYNC_URL environment variables.')
      return
    }

    if (args.strength !== "none" && args.strength !== "low" && args.strength !== "med" && args.strength !== "all") {
      if (args.strength.includes("http")) {
        args.link = args.strength
        args.strength = "low"
      }
      else {
        msg.reply("Invalid strength. Please choose from `none`, `low`, `med`, `all`.")
        return
      }
    }

    const categories = {
      sponsor: true,
      intro: false,
      outro: false,
      interaction: false,
      selfpromo: false,
      music_offtopic: false,
    }

    if (args.strength === "none") {
      categories.sponsor = false
    }
    else if (args.strength === "med") {
      categories.intro = true
      categories.outro = true
    }
    else if (args.strength === "all") {
      categories.intro = true
      categories.outro = true
      categories.interaction = true
      categories.selfpromo = true
      categories.music_offtopic = true
    }

    const videoMatch = YOUTUBE_REGEX_PATTERN.exec(args.link)
    const video = videoMatch ? encodeURIComponent(videoMatch[0]) : ""

    const res = await fetch(`${process.env.YOUSYNC_API_URL}/api/room?username=${msg.client.user.username}&video=${video}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(categories),
    })

    if (res.ok) {
      try {
        const data = await res.json()
        msg.reply(`${process.env.YOUSYNC_URL}/room/${data.id}`)
      } catch (error) {
        console.error('Error parsing JSON response:', error)
        const text = await res.text()
        console.error('Response text:', text.substring(0, 200) + '...')
        msg.reply('Error creating YouSync room. The server returned an unexpected response.')
      }
    } else {
      const errorText = await res.text()
      console.error(`YouSync API error: ${res.status} ${res.statusText}`)
      console.error('Error response:', errorText.substring(0, 200) + '...')
      msg.reply(`Error creating YouSync room: ${res.status} ${res.statusText}`)
    }
  }
}

function getHelpMessage (prefix) {
  return {
    embeds: [
      {
        title: "🎬 YouSync Command Help",
        description: "Create synchronized YouTube viewing sessions with sponsor block!",
        color: 0xff0000,
        fields: [
          {
            name: "🎥 Basic Usage",
            value: `\`${prefix}yousync <link>\`\nCreate sync session with default settings\n\`${prefix}ys <link>\`\nShort alias\nExample: \`${prefix}ys https://youtube.com/watch?v=...\``,
            inline: false
          },
          {
            name: "⚙️ Sponsor Block Levels",
            value: `\`${prefix}yousync <strength> <link>\`\nControl what gets skipped\n• \`none\` - Skip nothing\n• \`low\` - Skip sponsors only\n• \`med\` - Skip sponsors, intros, outros\n• \`all\` - Skip everything`,
            inline: false
          },
          {
            name: "💡 Tips",
            value: "• Requires YOUSYNC_API_URL and YOUSYNC_URL\n• Sessions are synchronized for all participants\n• Sponsor block helps skip unwanted content\n• Perfect for group watching!",
            inline: false
          }
        ],
        footer: {
          text: "Watch together! 🍿",
        },
      },
    ],
  }
}