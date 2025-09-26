import { DateTime } from "luxon"
import Tenor from "tenorjs"
import Command from "../../models/Command.js"

let gifpairing = {}
let prevDate = DateTime.local().toISODate()

const keywords = ["christmas pudding", "christmas donkey", "christmas elf", "christmas snowman", "christmas present", "christmas dog", "christmas cake", "christmas baby", "christmas jumper", "christmas bauble", "christmas wreath", "christmas stocking", "christmas robin", "santa sleigh", "rudolph", "christmas candle", "christmas tree", "christmas michael buble", "christmas hat", "christmas cookie", "christmas candy cane", "christmas lights", "christmas cracker", "father christmas", "christmas dinner"]

export default class extends Command {
  constructor () {
    super({
      name: "advent calendar",
      aliases: ["ac"],
      group: "fun",
      memberName: "advent calendar",
      description: "festive fun for everyone",
      args: [],
      guildOnly: true,
    })
  }

  run (msg, args) {
    if (!process.env.TENOR_KEY) return

    const date = String(new Date())
    const month = date.substring(4, 7)
    const day = parseInt(date.substring(8, 10))
    if (month !== "Dec") {
      msg.reply("bugger off it's not christmas silly")
    }
    else {
      if (day > 25) {
        msg.reply("you're too late christmas is over :(")
      }
      else {
        const rdm = Math.floor(Math.random() * 10)
        const curDate = DateTime.local()
        if (curDate.toISODate() !== prevDate) {
          prevDate = curDate.toISODate()
          gifpairing = {}
        }
        if (msg.author.id in gifpairing) {
          msg.reply("you've already had your choccy for the day greedy guts")
        }
        else {
          gifpairing[msg.author.id] = rdm

          this.getClient().Search.Query(keywords[day - 1], "10")
            .then(response => {
              const gifs = response
              msg.reply(gifs[rdm].url)
            }).catch(console.error)
        }
      }
    }
  }

  getClient () {
    return this.tenor || (this.tenor = Tenor.client({
      Key: process.env.TENOR_KEY,
      Filter: "high",
      Locale: "en_US",
    }))
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "🎄 Advent Calendar Command Help",
          description: "Get your daily Christmas treat during December!",
          color: 0xff0000,
          fields: [
            {
              name: "🎁 Daily Treat",
              value: `\`${prefix}advent calendar\`\nGet your daily Christmas GIF\n\`${prefix}ac\`\nShort alias`,
              inline: false
            },
            {
              name: "📅 Availability",
              value: "• Only works in December\n• One treat per user per day\n• Available December 1-25\n• Different GIF each day",
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• Each day has a unique Christmas theme\n• GIFs are random from the day's theme\n• Try again tomorrow if you've already claimed today's treat\n• Powered by Tenor GIFs",
              inline: false
            }
          ],
          footer: {
            text: "Merry Christmas! 🎅",
          },
        },
      ],
    }
  }
}

if (!process.env.TENOR_KEY) {
  console.log("Tenor key is missing! Advent calendar command disabled...")
}