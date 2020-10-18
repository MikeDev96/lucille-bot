const { Command } = require("discord.js-commando")
const { isEmpty } = require("lodash")
const { discord } = require("../../config")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "pp",
      aliases: ["penis"],
      group: "fun",
      memberName: "pp",
      description: "Penis Length",
      args: [
        {
          key: "arg1",
          prompt: "`Perm` sets a permenant `penis` size that is unchangable. Goodluck!",
          type: "string",
          default: "",
        },

        {
          key: "arg2",
          prompt: `
${client.commandPrefix}pp perm \`@Mention\` gets the pp size.,
${client.commandPrefix}pp perm \`lb\` gets the pp leaderboard, see whose rocking the biggest shlong!`,
          type: "string",
          default: "",
        },
      ],
      guildOnly: true,
    })
  }

  run (msg, args) {
    // if user types !pp help | !pp <> help etc...
    if (Object.values(args).filter(x => x.toLowerCase() === "help").length > 0) {
      msg.reply(this.getHelpMessage(msg.client.commandPrefix))
      return
    }

    const a1 = args.arg1.toLowerCase()
    const a2 = args.arg2.toLowerCase()

    // Rather than if's ill just determine the type here
    const isPerm = a1 === "perm" && a2 === ""
    const isDaily = a1 === "daily" && a2 === ""
    const isPermLeaderboard = a1 === "perm" && ["lb", "leaderboard", "score", "scoreboard"].includes(a2)
    const isDailyLeaderboard = a1 === "daily" && ["lb", "leaderboard", "score", "scoreboard"].includes(a2)

    // Incorrect args
    if ((a1 !== "" || a2 !== "") && !isPerm && !isPermLeaderboard && !isDaily && !isDailyLeaderboard) {
      msg.reply(this.getHelpMessage(msg.client.commandPrefix))
      return
    }

    // get the pp length
    const ppLength = this.getSize(isPerm, isDaily, msg.author.id, msg.guild.id)

    // Update the users display name
    this.client.db.updateUser(msg.author.id, msg.guild.id, msg.member.displayName)

    if (isPermLeaderboard || isDailyLeaderboard) {
      const lbEmbed = this.getLeaderboard(msg, isDailyLeaderboard)
      if (lbEmbed) msg.reply(lbEmbed)
      else msg.reply("Nothing to show")
    }
    else {
      msg.reply(`${this.getLocalised(ppLength)}${isPerm ? "  (Your everlasting pp size)" : ""}`)
    }
  }

  getLocalised (ppLength) {
    return `8=${"=".repeat(ppLength)}D${ppLength === 15 ? " ~ ~ ~" : ""}`
  }

  getSize (isPerm, isDaily, authorId, guildId) {
    let realLength = Math.ceil(Math.random() * 15)

    if (isPerm) {
      realLength = this.client.db.getPenisSize(authorId, guildId, realLength, -1)
    }

    if (isDaily) {
      realLength = this.client.db.getPenisSize(authorId, guildId, -1, realLength)
    }

    return realLength
  }

  getLeaderboard (msg, isDaily) {
    const all = this.client.db.getAllPenisSize(msg.guild.id)
    const fields = all.sort((pp1, pp2) => pp2.Size - pp1.Size)
      .filter(pp => {
        if (isDaily && pp.DailyPP && pp.DailyPP !== -1) {
          return true
        }

        if (!isDaily && pp.Size && pp.Size !== -1) {
          return true
        }

        return false
      })
      .map(pp =>
        `\`${(pp.DisplayName !== null ? pp.DisplayName : this.client.users.cache.find(user => user.id === pp.UserId).username)}\`\r\n${this.getLocalised(isDaily ? pp.DailyPP : pp.Size)}\r\n`,
      ).join("\r\n")

    if (isEmpty(fields)) {
      return undefined
    }

    return {
      embed: {
        title: `PP ${isDaily ? "Daily" : "Perm"} Leaderboard`,
        description: "See where you stack up against the competition.",
        color: 4187927,
        author: {
          name: msg.member.displayName,
          icon_url: msg.author.displayAvatarURL(),
        },

        fields: [
          {
            name: msg.guild.name,
            value: fields,
          },
        ],
        footer: {
          text: discord.footer,
        },
      },
    }
  }

  getHelpMessage (prefix) {
    return `
__**!PP command:**__    
\`${prefix}pp\` - Random (RDM) pp size.
\`${prefix}pp\` \`perm\` - RDM permenant pp size
\`${prefix}pp\` \`perm\` \`lb\` - Leaderboard for permanent pp.`
  }

  static ppResetDaily (client, guild) {
    const fields = client.db.getAllPenisSize(guild.id)
      .filter(pp => pp.DailyPP !== -1)
      .sort((pp1, pp2) => pp2.Size - pp1.Size)
      .map(pp =>
        `\`${(pp.DisplayName !== null ? pp.DisplayName : guild.users.cache.find(user => user.id === pp.UserId).username)}\`\r\n8=${"=".repeat(pp.DailyPP)}D${pp.DailyPP === 15 ? " ~ ~ ~" : ""}\r\n`,
      ).join("\r\n")

    if (fields === "") {
      return
    }

    const dailyEmbed = {
      embed: {
        title: `PP Daily Leaderboard`,
        description: "The daily reset is here and now its time to see where you placed!",
        color: 4187927,
        author: {
          name: "PP Daily Message",
          icon_url: client.user.displayAvatarURL(),
        },

        fields: [
          {
            name: "Daily PP",
            value: fields,
          },
        ],
        footer: {
          text: discord.footer,
        },
      },
    }

    const firstGuildChannel = guild.channels.cache.filter(channel => channel.type === "text").first()

    firstGuildChannel.send(dailyEmbed)

    client.db.resetDailyPPSize(guild.id)
  }
}