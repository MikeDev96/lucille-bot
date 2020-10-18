const { Command } = require("discord.js-commando")
const { discord } = require("../../config")

module.exports = class extends Command {
  constructor(client) {
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
          default: ""
        },

        {
          key: "arg2",
          prompt: `
${client.commandPrefix}pp perm \`@Mention\` gets the pp size.,
${client.commandPrefix}pp perm \`lb\` gets the pp leaderboard, see whose rocking the biggest shlong!`,
          type: "string",
          default: ""
        },
      ],
      guildOnly: true,
    })
  }

  run(msg, args) {
    // if user types !pp help | !pp <> help etc...
    if (Object.values(args).filter(x => x.toLowerCase() === "help").length > 0) {
      msg.reply(this.getHelpMessage(msg.client.commandPrefix))
      return;
    }

    const a1 = args.arg1.toLowerCase(), a2 = args.arg2.toLowerCase()

    // Rather than if's ill just determine the type here
    const isPerm = a1 === "perm" && a2 === ""
    const isPermLeaderboard = a1 === "perm" && ["lb", "leaderboard", "score", "scoreboard"].includes(a2)

    // Incorrect args
    if ((a1 !== "" || a2 !== "") && !isPerm && !isPermLeaderboard) {
      msg.reply(this.getHelpMessage(msg.client.commandPrefix))
      return
    }

    // get the pp length
    const ppLength = this.getSize(isPerm, msg.author.id, msg.guild.id)

    // Update the users display name
    this.client.db.updateUser(msg.author.id, msg.guild.id, msg.member.displayName)

    if (isPermLeaderboard) {
      msg.reply(this.getLeaderboard(msg))
    } else
      msg.reply(`${this.getLocalised(ppLength)}${isPerm ? "  (Your everlasting pp size)" : ""}`)
  }

  getLocalised(ppLength) {
    return `8=${"=".repeat(ppLength)}D${ppLength === 15 ? " ~ ~ ~" : ""}`
  }

  getSize(isPerm, authorId, guildId) {
    let realLength = Math.ceil(Math.random() * 15)
    return isPerm ? this.client.db.getPenisSize(authorId, guildId, realLength) : realLength
  }

  getLeaderboard(msg) {
    const all = this.client.db.getAllPenisSize(msg.guild.id)
    return {
      embed: {
        title: "PP Leaderboard",
        description: "See where you stack up against the competition.",
        color: 4187927,
        author: {
          name: msg.member.displayName,
          icon_url: msg.author.displayAvatarURL(),
        },

        fields: [
          {
            name: msg.guild.name,
            value: all.sort((pp1, pp2) => pp2.Size - pp1.Size)
              .map(pp =>
                `\`${(pp.DisplayName !== null ? pp.DisplayName : this.client.users.cache.find(user => user.id === pp.UserId).username)}\`\r\n\t\t${this.getLocalised(pp.Size)}\r\n`
              ).join("\r\n")
          }
        ],
        footer: {
          text: discord.footer,
        },
      }
    }
  }

  getHelpMessage(commandPrefix) {
    return `
__**${commandPrefix}PP command:**__    
\`${commandPrefix}pp\` - Random (RDM) pp size.
\`${commandPrefix}pp\` \`perm\` - RDM permenant pp size
\`${commandPrefix}pp\` \`perm\` \`lb\` - Leaderboard for permanent pp.`
  }
}