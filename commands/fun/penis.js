const { Command } = require("discord.js-commando")
const { discord } = require("../../config")

module.exports = class extends Command {
  constructor(client) {
    super(client, {
      name: "penis",
      aliases: ["pp"],
      group: "fun",
      memberName: "penis",
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
!pp perm \`@Mention\` gets the pp size.,
!pp perm \`lb\` gets the pp leaderboard, see whose rocking the biggest shlong!`,
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
      msg.reply(this.getHelpMessage())
      return;
    }

    const a1 = args.arg1.toLowerCase(), a2 = args.arg2.toLowerCase()

    // Rather than if's ill just determine the type here
    const isPerm = a1 === "perm" && a2 === ""
    const isPermLeaderboard = a1 === "perm" && ["lb", "leaderboard", "score", "scoreboard"].includes(a2)

    // Incorrect args
    if ((a1 !== "" || a2 !== "") && !isPerm && !isPermLeaderboard) {
      msg.reply(this.getHelpMessage())
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
          ...all.sort((pp1, pp2) => pp1.Size >= pp2.Size)
            .map(pp => (
              {
                name: pp.DisplayName !== null
                  ? pp.DisplayName
                  : this.client.users.cache.find(user => user.id === pp.UserId).username,
                value: this.getLocalised(pp.Size)
              }))
        ],
        footer: {
          text: discord.footer,
        },
      }
    }
  }

  getHelpMessage() {
    return `
__**!PP command:**__    
\`!pp\` - Random (RDM) pp size.
\`!pp\` \`perm\` - RDM permenant pp size
\`!pp\` \`perm\` \`lb\` - Leaderboard for permanent pp.`
  }
}