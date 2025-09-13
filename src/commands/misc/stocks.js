import { EmbedBuilder, escapeMarkdown } from "discord.js"
import yahooFinance from "yahoo-finance2"
import { splitMessage } from "../../helpers.js"
import LucilleClient from "../../classes/LucilleClient.js"
import Command from "../../models/Command.js"


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
      const success = LucilleClient.Instance.db.stocks.addUser(args.symbol.toUpperCase(), msg.author.id)

      if (success) {
        msg.react("👍")
        msg.channel.send("Stonk added to your stock portfolio")
      }
      else {
        msg.channel.send("Stonk already in your portfolio")
      }
    }
    else if (args.action === "remove" || args.action === "rm" || args.action === "delete") {
      const success = LucilleClient.Instance.db.stocks.removeUser(args.symbol.toUpperCase(), msg.author.id)

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
        const list = LucilleClient.Instance.db.stocks.listStocks(listId)
        if (list.length > 0) {
          const tempArr = this.list(list, nickname)
          const embed = {
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
            this.retryCount = 0
            this.maxRetries = 3

            this.updateStocks()
          }

          async updateStocks () {
            try {
              // Use yahoo-finance2 library for reliable stock quotes
              const quote = await yahooFinance.quote(args.symbol)
              
              // Validate quote data
              if (!quote || typeof quote.regularMarketPrice === 'undefined' || typeof quote.regularMarketChangePercent === 'undefined') {
                throw new Error(`Invalid stock symbol "${args.symbol}" or no data available`)
              }

              const price = quote.regularMarketPrice
              const changePercent = quote.regularMarketChangePercent
              const symbol = quote.symbol || args.symbol.toUpperCase()

              const embed = new EmbedBuilder()
                .setColor(changePercent >= 0 ? "#00ff00" : "#ff0000")
                .setTitle("Stonks")
                .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
                .addFields([
                  { name: symbol, value: `$${price.toFixed(2)}\n${changePercent.toFixed(2)}%` },
                ])

              if (!this.embedMsg) {
                this.embedMsg = await msg.channel.send({ embeds: [embed] })
              }
              else {
                try {
                  // Check if message still exists and is editable
                  if (this.embedMsg.deleted) {
                    this.end()
                    return
                  }

                  const index = msg.channel.messages.cache.size - 1 - Array.from(msg.channel.messages.cache.values()).findIndex(m => m === this.embedMsg)

                  if (index > 5) {
                    await this.embedMsg.delete()
                    this.embedMsg = await msg.channel.send({ embeds: [embed] })
                  }
                  else {
                    await this.embedMsg.edit({ embeds: [embed] })
                  }
                }
                catch (editError) {
                  // If message edit fails (message deleted, etc.), create a new one
                  console.log(`Failed to edit stock message, creating new one: ${editError.message}`)
                  this.embedMsg = await msg.channel.send({ embeds: [embed] })
                }
              }

              // Reset retry count on successful fetch
              this.retryCount = 0
              setTimeout(() => this.updateStocks(), 5000)
            }
            catch (err) {
              console.log(`Stock tracking error for ${args.symbol}:`, err)
              
              // Retry logic for temporary failures
              if (this.retryCount < this.maxRetries && (
                err.message.includes('HTTP 429') || 
                err.message.includes('HTTP 503') ||
                err.message.includes('Invalid API response')
              )) {
                this.retryCount++
                const retryDelay = Math.pow(2, this.retryCount) * 1000 // Exponential backoff
                console.log(`Retrying stock fetch for ${args.symbol} in ${retryDelay}ms (attempt ${this.retryCount}/${this.maxRetries})`)
                
                setTimeout(() => this.updateStocks(), retryDelay)
                return
              }
              
              // Provide more specific error messages
              let errorMessage = err.message
              if (err.message.includes('HTTP 429')) {
                errorMessage = 'API rate limit exceeded. Please try again later.'
              } else if (err.message.includes('HTTP 403')) {
                errorMessage = 'API access forbidden. The service may be temporarily unavailable.'
              } else if (err.message.includes('Invalid API response')) {
                errorMessage = 'Invalid response from stock data provider.'
              }
              
              msg.channel.send(`❌ Failed to fetch stock data for ${args.symbol}: ${errorMessage}`)
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