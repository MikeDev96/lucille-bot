const { Command } = require("discord.js-commando")
const { isEmpty } = require("lodash")
const { discord } = require("../../config")
const countdown = require("countdown")


module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "imposter",
            aliases: ["i"],
            group: "fun",
            memberName: "imposter",
            description: "Imposter",
            args: [
                {
                    key: "arg1",
                    prompt: "Arg1",
                    type: "string",
                    default: "",
                },
            ],
            guildOnly: true,
        })
    }

    run(msg, args) {
        // if user types ;i help | ;i <> help etc...
        if (Object.values(args).filter(x => x.toLowerCase() === "help").length > 0) {
            msg.reply(this.getHelpMessage(msg.client.commandPrefix))
            return
        }

        var countDown = countdown(new Date(2021, 0, 30).setHours(18)).toString()
        countDown = countDown.replace(/, /g, "\n").replace(/ and /g, "\n")

        const embed = {
            embed: {
                color: 0x0099ff,
                title: "Imposter Release",
                description: "We're counting down the days, are you?",
                author: {
                    name: msg.member.displayName,
                    icon_url: msg.author.displayAvatarURL(),
                },
                fields: [
                    {
                        name: "Countdown",
                        value: countDown,
                    },
                    {
                        name: "Updates",
                        value: `[imposter.haribo.dev](https://imposter.haribo.dev)`
                    },
                ],
                footer: {
                    text: discord.footer,
                },
            },
        }
        msg.reply(embed)
        return
    }

    getHelpMessage(prefix) {
        return `
    __**${prefix}Imposter command:**__    
    \`${prefix}imposter\` - calculates how long until the release date!`
    }

    static imposterReleaseCountdown(client, guild) {
        var countDown = countdown(new Date(2021, 0, 30).setHours(18)).toString()
        countDown = countDown.replace(/, /g, "\n").replace(/ and /g, "\n")

        const dailyEmbed = {
            embed: {
                title: `Imposter Release`,
                description: "We're counting down the days, are you?",
                color: 4187927,
                author: {
                    name: "Lucille Games",
                    icon_url: client.user.displayAvatarURL(),
                },

                fields: [
                    {
                        name: "Countdown",
                        value: countDown,
                    },
                    {
                        name: "Updates",
                        value: `[imposter.haribo.dev](https://imposter.haribo.dev)`
                    },
                ],
                footer: {
                    text: discord.footer,
                },
            },
        }

        const firstGuildChannel = guild.channels.cache.filter(channel => channel.type === "text").first()

        firstGuildChannel.send(dailyEmbed)
    }
}