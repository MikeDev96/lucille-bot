const { Command } = require("discord.js-commando")
const parse = require("parse-duration")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "remind",
      aliases: ["reminder", "remindme"],
      group: "misc",
      memberName: "remind",
      description: "Set a reminder",
      args: [
        {
          key: "when",
          prompt: "When to remind you",
          type: "string",
          validate: val => !!parse(val),
        },
        {
          key: "what",
          prompt: "What to remind you",
          type: "string",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    msg.react("⏲️")

    setTimeout(() => {
      msg.reply(args.what)
    }, parse(args.when))
  }
}