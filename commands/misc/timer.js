const { Command } = require("discord.js-commando")
const parse = require("parse-duration")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "timer",
      aliases: ["settimer"],
      group: "misc",
      memberName: "timer",
      description: "Set a timer",
      args: [
        {
          key: "duration",
          prompt: "How long",
          type: "string",
          validate: val => {
            const ms = parse(val)
            if (!ms) {
              return "Duration is invalid, try again"
            }
            if (ms >= (24 * 60 * 60 * 1000)) {
              return "Duration must be less than 1 day"
            }

            return true
          },
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    msg.react("⌛")

    const duration = parse(args.duration)
    const reply = await msg.channel.send(`\`${msg.member.displayName}\` set a timer!\n${this.getDuration(duration)}`)

    const startTimestamp = new Date().getTime()

    const handle = setInterval(() => {
      const currentTimestamp = new Date().getTime()
      const elapsed = currentTimestamp - startTimestamp
      const elapsedRounded = Math.round(elapsed / 1000) * 1000
      reply.edit(`\`${msg.member.displayName}\` set a timer!\n${this.getDuration(duration - elapsedRounded)}`)
    }, 5000)

    setTimeout(async () => {
      clearInterval(handle)
      reply.delete()
      const finishMsg = await msg.channel.send(`\`${msg.member.displayName}\`'s timer has finished!`)
      finishMsg.react("⌛")
    }, duration)
  }

  getDuration (duration) {
    const seconds = Math.floor((duration / 1000) % 60)
    const minutes = Math.floor((duration / (1000 * 60)) % 60)
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)

    let out = ""

    if (hours > 0) {
      out += `${hours}:`
    }

    out += `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

    return out
  }
}