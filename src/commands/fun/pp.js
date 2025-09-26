import { isEmpty } from "lodash-es"
import LucilleClient from "../../classes/LucilleClient.js"
import Command from "../../models/Command.js"

export default class extends Command {
  constructor () {
    super({
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
${LucilleClient.Instance.commandPrefix}pp perm \`@Mention\` gets the pp size.,
${LucilleClient.Instance.commandPrefix}pp perm \`lb\` gets the pp leaderboard, see whose rocking the biggest shlong!`,
          type: "string",
          default: "",
        },
      ],
      guildOnly: true,
    })
  }

  run (msg, args) {

    const a1 = (args.arg1 || "").toLowerCase()
    const a2 = (args.arg2 || "").toLowerCase()

    // Rather than if's ill just determine the type here
    const isPerm = ["perm", "p"].includes(a1) && a2 === ""
    const isDaily = ["daily", "d"].includes(a1) && a2 === ""
    const isPermLeaderboard = ["perm", "p"].includes(a1) && ["lb", "leaderboard", "score", "scoreboard"].includes(a2)
    const isDailyLeaderboard = ["daily", "d"].includes(a1) && ["lb", "leaderboard", "score", "scoreboard"].includes(a2)

    // Incorrect args
    if ((a1 !== "" || a2 !== "") && !isPerm && !isPermLeaderboard && !isDaily && !isDailyLeaderboard) {
      msg.reply(this.getHelpMessage(LucilleClient.Instance.commandPrefix))
      return
    }

    // get the pp length
    const ppLength = this.getSize(isPerm, isDaily, msg.author.id, msg.guild.id)

    // Update the users display name
    LucilleClient.Instance.db.updateUser(msg.author.id, msg.guild.id, msg.member.displayName)

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
    return `8${"=".repeat(ppLength)}D${ppLength === 15 ? " ~ ~ ~" : ""}`
  }

  getSize (isPerm, isDaily, authorId, guildId) {
    let realLength = Math.ceil(Math.random() * 15)

    if (isPerm) {
      realLength = LucilleClient.Instance.db.pp.getPenisSize(authorId, guildId, realLength, -1)
    }

    if (isDaily) {
      realLength = LucilleClient.Instance.db.pp.getPenisSize(authorId, guildId, -1, realLength)
    }

    return realLength
  }

  getLeaderboard (msg, isDaily) {
    const all = LucilleClient.Instance.db.pp.getAllPenisSize(msg.guild.id)
    const fields = all.sort((pp1, pp2) => {
      return !isDaily ? pp2.Size - pp1.Size : pp2.DailyPP - pp1.DailyPP
    })
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
        `\`${(pp.DisplayName !== null ? pp.DisplayName : msg.client.users.cache.find(user => user.id === pp.UserId).username)}\`\r\n${this.getLocalised(isDaily ? pp.DailyPP : pp.Size)}\r\n`,
      ).join("\r\n")

    if (isEmpty(fields)) {
      return undefined
    }

    return {
      embeds: [
        {
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
            text: process.env.DISCORD_FOOTER,
          },
        },
      ],
    }
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "🍆 PP Command Help",
          description: "Measure your virtual pp size and compete with others!",
          color: 0xff69b4,
          fields: [
            {
              name: "🎲 Random PP",
              value: `\`${prefix}pp\`\nGet a random pp size`,
              inline: true
            },
            {
              name: "🔒 Permanent PP",
              value: `\`${prefix}pp perm\`\nSet a permanent pp size (unchangable!)`,
              inline: true
            },
            {
              name: "📅 Daily PP",
              value: `\`${prefix}pp daily\`\nGet your daily pp size`,
              inline: true
            },
            {
              name: "🏆 Permanent Leaderboard",
              value: `\`${prefix}pp perm lb\`\nSee who has the biggest permanent pp`,
              inline: true
            },
            {
              name: "📊 Daily Leaderboard",
              value: `\`${prefix}pp daily lb\`\nSee today's pp champions`,
              inline: true
            },
            {
              name: "💡 Tips",
              value: "• Use `perm` to lock in your size forever\n• Daily sizes reset every day\n• Compete for the top spots!",
              inline: false
            }
          ],
          footer: {
            text: "Good luck with your measurements! 🍆",
          },
        },
      ],
    }
  }
}

export const ppResetDaily = (client, guild) => {
  const all = LucilleClient.Instance.db.pp.getAllPenisSize(guild.id)

  const groupedBySize = all.reduce((acc, cur) => {
    if (!acc.has(cur.DailyPP)) {
      acc.set(cur.DailyPP, [])
    }

    acc.get(cur.DailyPP).push(cur)
    return acc
  }, new Map())

  const medals = ["🥇", "🥈", "🥉"]
  const fields = Array.from(groupedBySize.keys())
    .filter(val => val !== -1)
    .sort((val1, val2) => val2 - val1)
    .map((val1, idx) =>
      `${medals[idx] || ""} ${groupedBySize.get(val1).map(user => "`" + (user.DisplayName !== null ? user.DisplayName : guild.users.cache.find(user => user.id === user.UserId).username) + "`").join(" & ")}
8${"=".repeat(val1)}D${val1 === 15 ? " ~ ~ ~" : ""}\r\n`,
    )
    .join("\n")

  if (!fields) {
    return
  }

  const dailyEmbed = {
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
      text: process.env.DISCORD_FOOTER,
    },
  }

  guild.systemChannel.send({ embeds: [dailyEmbed] })

  LucilleClient.Instance.db.pp.resetDailyPPSize(guild.id)
}