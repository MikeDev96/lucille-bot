import fetch from "node-fetch"
import LucilleClient from "../../classes/LucilleClient.js"
import Command from "../../classes/Command.js"

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
      body: categories,
    })

    if (res.ok) {
      const data = await res.json()
      msg.reply(`${process.env.YOUSYNC_URL}/room/${data.id}`)
    }
  }
}

function getHelpMessage (prefix) {
  return `
__**${prefix}YouSync command:**__    
\`${prefix}ys\` \`sponsor strength (optional)\` \`link\` - Where strength can be \`none\`, \`low\`, \`med\`, \`all\`.`
}