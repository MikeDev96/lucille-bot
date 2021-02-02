const { MessageEmbed } = require("discord.js")
const { Command } = require("discord.js-commando")
const fetch = require("node-fetch")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "stocks",
      aliases: ["stock"],
      group: "misc",
      memberName: "stocks",
      description: "Tracks the current market price of a stock",
      args: [
        {
          key: "symbol",
          prompt: "What symbol to track",
          type: "string",
          default: "",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (msg.guild.stocks) {
      msg.guild.stocks.end()
    }

    if (!args.symbol) {
      return
    }

    msg.guild.stocks = new class {
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

          const embed = new MessageEmbed()
            .setColor(item.regularMarketChangePercent >= 0 ? "#00ff00" : "#ff0000")
            .setTitle("Stonks")
            .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
            .addFields([
              { name: item.symbol, value: `${item.regularMarketPrice.toFixed(2)}\n${item.regularMarketChangePercent.toFixed(2)}%` },
            ])

          if (!this.embedMsg) {
            this.embedMsg = await msg.channel.send(embed)
          }
          else {
            if (this.embedMsg.deleted) {
              this.end()
              return
            }

            const index = msg.channel.messages.cache.size - 1 - msg.channel.messages.cache.array().findIndex(m => m === this.embedMsg)

            if (index > 5) {
              await this.embedMsg.delete()
              this.embedMsg = await msg.channel.send(embed)
            }
            else {
              this.embedMsg.edit(embed)
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
    }()
  }
}