const { Command } = require("discord.js-commando")
const { discord } = require("../../config")
const countdown = require("countdown")
const axios = require("axios")

module.exports = class extends Command {
  constructor (client) {
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

  run (msg, args) {
    // if user types ;i help | ;i <> help etc...
    if (Object.values(args).filter(x => x.toLowerCase() === "help").length > 0) {
      msg.reply(this.getHelpMessage(msg.client.commandPrefix))
      return
    }

    axios.get("https://api.haribo.dev/imposter/versions/latest")
      .then(res => {
        if (res.data.versionNumber === "0.0.0") {
          var day = Number(res.data.releaseDate.substring(0, 2))
          var month = Number(res.data.releaseDate.substring(3, 5))
          var year = Number(res.data.releaseDate.substring(6, 10))

          var countDown = countdown(new Date(year, month - 1, day).setHours(18)).toString()
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
                  value: countDown || "Error",
                },
                {
                  name: "Updates",
                  value: `[imposter.haribo.dev](https://imposter.haribo.dev)`,
                },
                {
                  name: "HariboDev Launcher",
                  value: `[Download the HariboDev Launcher](https://launcher.haribo.dev)`,
                },
              ],
              footer: {
                text: discord.footer,
              },
            },
          }
          msg.reply(embed)
        }
        else {
          const embed = {
            embed: {
              color: 0x0099ff,
              title: "Imposter Release",
              description: "It's already been released dum dum.",
              author: {
                name: msg.member.displayName,
                icon_url: msg.author.displayAvatarURL(),
              },
              fields: [
                {
                  name: "HariboDev Launcher",
                  value: `[Download the HariboDev Launcher](https://launcher.haribo.dev)`,
                },
              ],
              footer: {
                text: discord.footer,
              },
            },
          }
          msg.reply(embed)
        }
      })
      .catch(err => {
        console.log("Imposter countdown API has been deleted. Contact Haribo.")
        console.log(err)
      })
  }

  getHelpMessage (prefix) {
    return `
    __**${prefix}Imposter command:**__    
    \`${prefix}imposter\` - calculates how long until the release date!`
  }

  static imposterReleaseCountdown (client, guild) {
    axios.get("https://api.haribo.dev/imposter/versions/latest")
      .then(res => {
        if (res.data.versionNumber === "0.0.0") {
          var day = Number(res.data.releaseDate.substring(0, 2))
          var month = Number(res.data.releaseDate.substring(3, 5))
          var year = Number(res.data.releaseDate.substring(6, 10))

          var countDown = countdown(new Date(year, month - 1, day).setHours(18)).toString()
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
                  value: `[imposter.haribo.dev](https://imposter.haribo.dev)`,
                },
                {
                  name: "HariboDev Launcher",
                  value: `[Download the HariboDev Launcher](https://launcher.haribo.dev)`,
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
        else {
          const embed = {
            embed: {
              color: 0x0099ff,
              title: "Imposter Release",
              description: "It's already been released dum dum.",
              author: {
                name: msg.member.displayName,
                icon_url: msg.author.displayAvatarURL(),
              },
              fields: [
                {
                  name: "HariboDev Launcher",
                  value: `[Download the HariboDev Launcher](https://launcher.haribo.dev)`,
                },
              ],
              footer: {
                text: discord.footer,
              },
            },
          }
          msg.reply(embed)
        }
      })
      .catch(err => {
        console.log("Imposter countdown API has been deleted. Contact Haribo.")
        console.log(err)
      })
  }
}