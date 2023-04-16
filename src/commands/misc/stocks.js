import { EmbedBuilder, escapeMarkdown } from "discord.js"
import fetch from "node-fetch"
import { splitMessage } from "../../helpers.js"
import LucilleClient from "../../classes/LucilleClient.js"
import Command from "../../classes/Command.js"

export default class extends Command {
  constructor () {
    super({
      name: "stocks",
      aliases: ["stock", "stonk", "stonks", "nokia", "nok"],
      group: "misc",
      memberName: "stocks",
      description: "Tracks the current market price of a stock",
      args: [
        {
          key: "action",
          prompt: "What action",
          type: "string",
          default: "",

        },
        {
          key: "symbol",
          prompt: "What symbol",
          type: "string",
          default: "",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (args.action === "add") {
      const success = LucilleClient.Instance.db.addUser(args.symbol.toUpperCase(), msg.author.id)

      if (success) {
        msg.react("👍")
        msg.channel.send("Stonk added to your stock portfolio")
      }
      else {
        msg.channel.send("Stonk already in your portfolio")
      }
    }
    else if (args.action === "remove" || args.action === "rm" || args.action === "delete") {
      const success = LucilleClient.Instance.db.removeUser(args.symbol.toUpperCase(), msg.author.id)

      if (success) {
        msg.react("👍")
        msg.channel.send("Stonk removed from your stock portfolio")
      }
      else {
        msg.channel.send("Stonk isn't in your portfolio")
      }
    }
    else {
      if (args.action === "list" || args.action === "ls") {
        const listId = await this.findUserId(msg, args.symbol)
        const nickname = await this.findUsername(msg, args.symbol)
        if (!listId) {
          msg.reply("Could not find user ID")
          return
        }
        const list = LucilleClient.Instance.db.listStocks(listId)
        if (list.length > 0) {
          const tempArr = this.list(list, nickname)
          const embed = {
            embeds: [
              {
                color: 0x0099ff,
                title: "Lucille Stonk Exchange",
                author: {
                  name: msg.member.displayName,
                  icon_url: msg.author.displayAvatarURL(),
                },
                fields: tempArr,
                footer: {
                  text: process.env.DISCORD_FOOTER,
                },
              },
            ],
          }
          msg.reply({ embeds: [embed] })
        }
        else {
          msg.channel.send(`No stonks in ${listId === msg.author.id ? "your" : "their"} portfolio`)
        }
      }
      else if (args.action === "track") {
        if (msg.guild.stocks) {
          msg.guild.stocks.end()
          return
        }

        if (!args.symbol) {
          msg.reply("You spoon, you didn't specify a stock")
          return
        }

        msg.guild.stocks = new (class {
          constructor () {
            this.embedMsg = null
            this.timeoutHandle = 0

            this.updateStocks()
          }

          async updateStocks () {
            try {
              const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?lang=en-US&region=US&corsDomain=finance.yahoo.com&fields=regularMarketPrice,regularMarketChangePercent&symbols=${args.symbol}`)
              const data = await res.json()

              const item = data.quoteResponse.result[0]

              const embed = new EmbedBuilder()
                .setColor(item.regularMarketChangePercent >= 0 ? "#00ff00" : "#ff0000")
                .setTitle("Stonks")
                .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
                .addFields([
                  { name: item.symbol, value: `${item.regularMarketPrice.toFixed(2)}\n${item.regularMarketChangePercent.toFixed(2)}%` },
                ])

              if (!this.embedMsg) {
                this.embedMsg = await msg.channel.send({ embeds: [embed] })
              }
              else {
                if (this.embedMsg.deleted) {
                  this.end()
                  return
                }

                const index = msg.channel.messages.cache.size - 1 - msg.channel.messages.cache.array().findIndex(m => m === this.embedMsg)

                if (index > 5) {
                  await this.embedMsg.delete()
                  this.embedMsg = await msg.channel.send({ embeds: [embed] })
                }
                else {
                  this.embedMsg.edit({ embeds: [embed] })
                }
              }

              setTimeout(() => this.updateStocks(), 5000)
            }
            catch (err) {
              console.log(err)
              this.end()
            }
          }

          end () {
            if (this.timeoutHandle) {
              clearTimeout(this.timeoutHandle)
            }

            if (this.embedMsg && !this.embedMsg.deleted) {
              this.embedMsg.delete()
            }
          }
        })()
      }
      else {
        const prefix = LucilleClient.Instance.commandPrefix

        const helpEmbed = `
      __**${prefix}Stock command:**__
      \`${prefix}Stock\` \`list\` - Lists your stock portfolio
      \`${prefix}Stock\` \`track\` \`symbol\` - Track a stock
      \`${prefix}Stock\` \`add\` \`symbol\` - Add a stock to your portfolio
      \`${prefix}Stock\` \`remove\` \`symbol\` - Remove a stock from your portfolio`

        msg.reply(helpEmbed)
      }
    }
  }

  async findUsername (msg, user) {
    let username
    if (user.length > 0) {
      await msg.guild.members.fetch().then(members => members.map(users => {
        if (users.user.username.toLowerCase().includes(user.toLowerCase())) {
          username = users.user.username
        }
        return username
      }))
    }
    else {
      await msg.guild.members.fetch().then(members => members.map(users => {
        if (users.user.id === msg.author.id) {
          username = users.user.username
        }
        return username
      }))
    }
    if (!username) {
      return null
    }
    return username
  }

  async findUserId (msg, user) {
    let userID
    if (user.length > 0) {
      await msg.guild.members.fetch().then(members => members.map(users => {
        if (users.user.username.toLowerCase().includes(user.toLowerCase())) {
          userID = users.user.id
        }
        return userID
      }))
    }
    else {
      userID = msg.author.id
    }
    if (!userID) {
      return null
    }
    return userID
  }

  list (songs, nickname) {
    return splitMessage(songs.map(s => escapeMarkdown(`- ${s.symbol}`)), { maxLength: 1024 }).map(str => ({
      name: `${nickname}'s Stock Portfolio`,
      value: str,
    }))
  }
}