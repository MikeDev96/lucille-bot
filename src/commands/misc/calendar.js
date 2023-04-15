import { MessageEmbed } from "discord.js"
import { DateTime } from "luxon"
import rrule from "rrule"
import humanizeDuration from "humanize-duration"
import chrono from "chrono-node"
import LucilleClient from "../../classes/LucilleClient.js"
import Command from "../../classes/Command.js"
const { RRule } = rrule

export default class extends Command {
  constructor () {
    super({
      name: "calendar",
      aliases: ["cal"],
      group: "misc",
      memberName: "calendar",
      description: "Add single or recurring events to a calendar",
      args: [
        {
          key: "arg1",
          prompt: `Possible options are \`add\` \`remove\` \`list\` \`help\`, run \`${process.env.DISCORD_PREFIX}cal help\` for more help`,
          type: "string",
        },
        {
          key: "arg2",
          prompt: "",
          type: "string",
          default: "",
        },
        {
          key: "arg3",
          prompt: "",
          type: "string",
          default: "",
        },
        {
          key: "arg4",
          prompt: "",
          type: "string",
          default: "",
        },
        {
          key: "arg5",
          prompt: "",
          type: "string",
          default: "",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (args.arg1 === "add") {
      if (args.arg2 === "once") {
        if (!args.arg3) {
          msg.reply("Start date/time is required")
          return
        }

        const date = chrono.parseDate(args.arg3)
        if (!date) {
          msg.reply(`Couldn't parse/time date from \`${args.arg3}\``)
          return
        }

        if (!args.arg4) {
          msg.reply("An event is required")
          return
        }

        const dtStart = this.toRRuleDate(date)
        LucilleClient.Instance.db.addCalendarEvent(`DTSTART:${dtStart}\nRRULE:FREQ=DAILY;COUNT=1;INTERVAL=1;WKST=MO`, args.arg4, msg.author.id, msg.guild.id)

        msg.react("👌")
      }
      else if (args.arg2 === "recur") {
        if (!args.arg3) {
          msg.reply("Start date/time is required")
          return
        }

        const date = chrono.parseDate(args.arg3)
        if (!date) {
          msg.reply(`Couldn't parse date/time from \`${args.arg3}\``)
          return
        }

        if (!args.arg4) {
          msg.reply("An recurrence rule is required")
          return
        }

        const rrule = RRule.fromText(args.arg4) || RRule.fromString(args.arg4)
        if (!rrule) {
          msg.reply("Invalid recurrence rule")
          return
        }

        if (!args.arg5) {
          msg.reply("An event is required")
          return
        }

        const dtStart = this.toRRuleDate(date)
        LucilleClient.Instance.db.addCalendarEvent(`DTSTART:${dtStart}\n${rrule.toString()}`, args.arg5, msg.author.id, msg.guild.id)

        msg.react("👌")
      }
    }
    else if (["remove", "rm", "rem"].includes(args.arg1.toLowerCase())) {
      if (!args.arg2) {
        msg.reply("An event is required")
        return
      }

      const event = LucilleClient.Instance.db.findCalendarEvent(msg.guild.id, args.arg2)
      if (!event) {
        msg.reply(`Couldn't find an event for \`${args.arg2}\``)
        return
      }

      try {
        const replyMsg = await msg.reply(`Is \`${event.event}\` the event you want to remove?\nReply with yes or no [y | n]`)
        const collected = await replyMsg.channel.awaitMessages({ filter: resMsg => resMsg.author.id === msg.author.id && /y|n/i.test(resMsg.content), max: 1, time: 15000 })

        replyMsg.delete()

        const firstMsg = collected.first()
        if (firstMsg) {
          if (/y/i.test(firstMsg.content)) {
            firstMsg.react("🗑️")
            LucilleClient.Instance.db.removeCalendarEvent(event.calendarId)
          }
        }
      }
      catch (err) {
        msg.react("❌")
      }
    }
    else if (args.arg1 === "list" || args.arg1 === "ls") {
      const events = LucilleClient.Instance.db.getCalendarEvents(msg.guild.id)

      const reducedEvents = events.reduce((acc, event) => {
        const rrule = RRule.fromString(event.rrule)
        let date = DateTime.utc().toJSDate()

        // Grab the next 10 occurences of an event
        for (let i = 0; i < 10; i++) {
          const occurence = rrule.after(date)
          if (occurence) {
            const dtOccurence = DateTime.fromJSDate(occurence)
            const distanceMs = dtOccurence.diffNow("milliseconds").milliseconds
            const distance = humanizeDuration(Math.ceil(distanceMs / 1e3) * 1e3, { largest: 3 })

            acc.push({ ...event, occurence, distance })
            date = occurence
          }
          else {
            break
          }
        }

        return acc
      }, [])

      reducedEvents.sort((a, b) => a.occurence.getTime() - b.occurence.getTime())
      reducedEvents.splice(10)

      const embed = new MessageEmbed()
        .setColor("#FF1493")
        .setTitle("Upcoming Events")
        .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
        .addFields(reducedEvents.map(d => ({
          name: `${d.event}`,
          value: `${DateTime.fromJSDate(d.occurence).toLocal().toLocaleString(DateTime.DATETIME_MED)}\n\`${d.distance}\``,
        })))
        .setFooter(process.env.DISCORD_FOOTER)

      msg.reply(embed)
    }
    else if (args.arg1 === "help") {
      msg.reply(`
Usage:
  ${process.env.DISCORD_PREFIX}cal add once \`<start date>\` \`<event>\`
  ${process.env.DISCORD_PREFIX}cal add recur \`<start date>\` \`<recurrence rule>\` \`<event>\`
  ${process.env.DISCORD_PREFIX}cal remove|rm|rem \`<event>\`
  ${process.env.DISCORD_PREFIX}cal list|ls
  ${process.env.DISCORD_PREFIX}cal help

Examples:
  ${process.env.DISCORD_PREFIX}cal add once "tomorrow at 1pm" "This is an example event"
  ${process.env.DISCORD_PREFIX}cal add recur "21 Nov 1996" "every year" "Mike's Birthday"
  ${process.env.DISCORD_PREFIX}cal add recur "today" "Every month on the 2nd last Friday for 7 times" "Advanced example"
  ${process.env.DISCORD_PREFIX}cal rm "Mike's Birthday"`)
    }
  }

  toRRuleDate (date) {
    return DateTime.fromJSDate(date).toUTC().startOf("second").toISO({ suppressMilliseconds: true, format: "basic" })
  }
}