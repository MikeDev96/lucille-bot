const { Command } = require("discord.js-commando")
const { discord } = require("../../config")
const countdown = require("countdown")
const axios = require("axios")
const { DateTime } = require("luxon")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "imposter",
      aliases: ["i"],
      group: "fun",
      memberName: "imposter",
      description: "Imposter",
      args: [],
      guildOnly: true,
    })
  }

  run (msg) {
    axios.get("http://server.haribodev.uk/imposter/versions/update")
      .then(res => {
        if (res.data === "N/A") {
          const embed = {
            embed: {
              color: 0x0099ff,
              title: "Imposter Update",
              description: "There are no scheduled updates as of yet!",
              author: {
                name: msg.member.displayName,
                icon_url: msg.author.displayAvatarURL(),
              },
              fields: [
                {
                  name: "Updates",
                  value: `[View updates](https://launcher.haribodev.uk/news)`,
                },
                {
                  name: "HariboDev Launcher",
                  value: `[Download the HariboDev Launcher](https://launcher.haribodev.uk)`,
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
          var day = Number(res.data.substring(0, 2))
          var month = Number(res.data.substring(3, 5))
          var year = Number(res.data.substring(6, 10))
          var hours = Number(res.data.substring(11, 13))
          var minutes = Number(res.data.substring(14, 16))

          var updateDate = new Date(year, month - 1, day)
          updateDate.setHours(hours, minutes)

          var countDown = countdown(updateDate).toString()
          countDown = countDown.replace(/, /g, "\n").replace(/ and /g, "\n")

          const embed = {
            embed: {
              color: 0x0099ff,
              title: "Imposter Update",
              description: "We're just as excited as you are, but how long do we have to wait?",
              author: {
                name: msg.member.displayName,
                icon_url: msg.author.displayAvatarURL(),
              },
              fields: [
                {
                  name: "Next Update",
                  value: res.data === "N/A" ? "Hmm looks like there's no release date as of yet, but stay tuned!" : DateTime.fromJSDate(updateDate).toLocaleString(DateTime.DATE_HUGE),
                },
                {
                  name: "Countdown",
                  value: countDown,
                },
                {
                  name: "Updates",
                  value: `[View updates](https://launcher.haribodev.uk/news)`,
                },
                {
                  name: "HariboDev Launcher",
                  value: `[Download the HariboDev Launcher](https://launcher.haribodev.uk)`,
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
        const embed = {
          embed: {
            color: 0x0099ff,
            title: "Imposter Update",
            description: "We're just as excited as you are, but how long do we have to wait?",
            author: {
              name: msg.member.displayName,
              icon_url: msg.author.displayAvatarURL(),
            },
            fields: [
              {
                name: "Next Update",
                value: "Hmm, something went wrong. Check the dev console!",
              },
              {
                name: "Updates",
                value: `[View updates](https://launcher.haribodev.uk/news)`,
              },
              {
                name: "HariboDev Launcher",
                value: `[Download the HariboDev Launcher](https://launcher.haribodev.uk)`,
              },
            ],
            footer: {
              text: discord.footer,
            },
          },
        }
        msg.reply(embed)
        console.log(err)
      })
  }

  static imposterDailyReminder (client, guild) {
    axios.get("http://server.haribodev.uk/imposter/versions/update")
      .then(res => {
        if (res.date !== "N/A") {
          var day = Number(res.data.substring(0, 2))
          var month = Number(res.data.substring(3, 5))
          var year = Number(res.data.substring(6, 10))
          var hours = Number(res.data.substring(11, 13))
          var minutes = Number(res.data.substring(14, 16))

          var updateDate = new Date(year, month - 1, day)
          updateDate.setHours(hours, minutes)

          var countDown = countdown(updateDate).toString()
          countDown = countDown.replace(/, /g, "\n").replace(/ and /g, "\n")

          const dailyEmbed = {
            embed: {
              color: 0x0099ff,
              title: "Imposter Update",
              description: "We're just as excited as you are, but how long do we have to wait?",
              author: {
                name: "HariboDev",
                icon_url: client.user.displayAvatarURL(),
              },
              fields: [
                {
                  name: "Next Update",
                  value: res.data === "N/A" ? "Hmm looks like there's no release date as of yet, but stay tuned!" : DateTime.fromJSDate(updateDate).toLocaleString(DateTime.DATE_HUGE),
                },
                {
                  name: "Countdown",
                  value: countDown,
                },
                {
                  name: "Updates",
                  value: `[View updates](https://launcher.haribodev.uk/news)`,
                },
                {
                  name: "HariboDev Launcher",
                  value: `[Download the HariboDev Launcher](https://launcher.haribodev.uk)`,
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
      })
      .catch(err => {
        const dailyEmbed = {
          embed: {
            color: 0x0099ff,
            title: "Imposter Update",
            description: "We're just as excited as you are, but how long do we have to wait?",
            author: {
              name: "HaribuDev",
              icon_url: client.user.displayAvatarURL(),
            },
            fields: [
              {
                name: "Next Update",
                value: "Hmm, something went wrong. Check the dev console!",
              },
              {
                name: "Updates",
                value: `[View updates](https://launcher.haribodev.uk/news)`,
              },
              {
                name: "HariboDev Launcher",
                value: `[Download the HariboDev Launcher](https://launcher.haribodev.uk)`,
              },
            ],
            footer: {
              text: discord.footer,
            },
          },
        }
        console.log(err)
        const firstGuildChannel = guild.channels.cache.filter(channel => channel.type === "text").first()
        firstGuildChannel.send(dailyEmbed)
      })
  }
}