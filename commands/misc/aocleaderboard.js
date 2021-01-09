const { Command } = require("discord.js-commando")
const axios = require("axios")
const config = require("../../config.json")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "aoc",
      aliases: [],
      group: "misc",
      memberName: "aoc",
      description: "Shows the AOC Leaderboard",
      guildOnly: true,
    })
  }

  async run (msg, _args) {
    if (checkValidDate()) {
      const leaderboard = await getLeaderboard()
      msg.channel.send(leaderboard)
    }
    else {
      msg.reply("Advent of Code has ended until next Christmas :(")
    }
  }

  static async aocResetDaily (guild) {
    if (checkValidDate()) {
      const leaderboard = await getLeaderboard()
      const firstGuildChannel = guild.channels.cache.filter(channel => channel.type === "text").first()
      firstGuildChannel.send(leaderboard)
    }
  }
}

function checkValidDate () {
  var date = String(new Date())
  const month = date.substring(4, 7)
  const day = parseInt(date.substring(8, 10))

  if (month === "Dec" && day <= 25) {
    return true
  }
  return false
}

// Get leaderboard function being removed from the class seems to let it be posted daily
async function getLeaderboard () {
  if (!config.aoc || !config.aoc.cookie) {
    return
  }

  // Query AOC - Cookie expires in 2030, so should be good for the time being
  const res = await axios.get(`https://adventofcode.com/${new Date().getFullYear()}/leaderboard/private/view/1064962.json`, {
    headers: {
      cookie: config.aoc.cookie,
    },
  })

  const LBInfo = res.data
  const medals = ["🥇", "🥈", "🥉"]

  const leaderboard = {
    embed: {
      color: 0x0099ff,
      title: `:christmas_tree: Advent of Code ${new Date().getFullYear()} leaderboard  :christmas_tree:`,
      description: `If you wish to join, [join here](https://adventofcode.com/${new Date().getFullYear()}/leaderboard/private) with this code **${config.aoc.leaderboard}**`,
      fields: [
        // Get data filter by local score and then map through
        ...Object.values(LBInfo.members).sort((a, b) => b.local_score - a.local_score).map((member, index) =>
          ({
            name: `${medals[index] || ""} ${member.name !== null ? member.name : "Anonymous"} (Score: ${member.local_score})`,
            value: (member.stars > 0 && member.stars < 10) ? ":star:".repeat(member.stars) : `${member.stars} :star:`,
          }),
        ),
      ],
      footer: {
        text: config.discord.footer,
        icon_url: config.discord.authorAvatarUrl,
      },
    },
  }
  return leaderboard
}