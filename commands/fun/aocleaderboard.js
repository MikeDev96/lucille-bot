const { Command } = require("discord.js-commando")
const axios = require("axios")
const config = require('../../config.json')

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "aoc",
            aliases: [],
            group: "fun",
            memberName: "aoc",
            description: "Shows the AOC Leaderboard",
            guildOnly: true,
        })
    }

    async getLeaderboard() {

        //Query AOC - Cookie expires in 2030, so should be good for the time being
        let res = await axios.get("https://adventofcode.com/2020/leaderboard/private/view/1064962.json", {
            "headers": {
                "cookie": config.aoc.cookie
            }
        });

        let LBInfo = res.data
        const medals = ["🥇", "🥈", "🥉"]

        let leaderboard = {
            embed: {
                color: 0x0099ff,
                title: ":christmas_tree: Advent of Code leaderboard 2020 :christmas_tree:",
                description: `If you wish to join, [join here](https://adventofcode.com/2020/leaderboard/private) with this code **${config.aoc.leaderboard}**`,
                fields: [
                    // Get data filter by local score and then map through
                    ...Object.values(LBInfo.members).sort((a, b) => b.local_score - a.local_score).map((member, index) =>
                        ({
                            name: `${medals[index] || ""} ${member.name} (Score: ${member.local_score})`,
                            value: (member.stars > 0 && member.stars < 10) ? ":star:".repeat(member.stars) : `${member.stars} :star:`
                        })),
                ],
                footer: {
                    text: config.discord.footer,
                    icon_url: config.discord.authorAvatarUrl,
                }
            }
        }
        return leaderboard
    }

    async run(msg, _args) {
        let leaderboard = await this.getLeaderboard()
        msg.channel.send(leaderboard)
    }

    static aocResetDaily(guild) {

        let leaderboard = await this.getLeaderboard()

        const firstGuildChannel = guild.channels.cache.filter(channel => channel.type === "text").first()

        firstGuildChannel.send(leaderboard)
    }
}