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
          key: "strength",
          prompt: "Enter a sponsor skip strength",
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
      msg.reply(this.getHelpMessage(msg.client.commandPrefix))
      return
    }

    if (args.strength !== "none" && args.strength !== "low" && args.strength !== "med" && args.strength !== "all") {
      msg.reply("Invalid strength. Please choose from `none`, `low`, `med`, `all`.")
      return
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

    const res = await axios({
      method: "POST",
      url: `${process.env.YOUSYNC_API_URL}/api/room?username=${this.client.user.username}&video=${video}`,
      data: categories,
    })

    if (res && res.status === 200) {
      msg.reply(`${process.env.YOUSYNC_URL}/room/${res.data.id}`)
    }
  }

  getHelpMessage (prefix) {
    return `
__**${prefix}YouSync command:**__    
\`${prefix}ys\` \`sponsor strength\` \`link\` - Where strength can be \`none\`, \`low\`, \`med\`, \`all\`.`
  }
}	