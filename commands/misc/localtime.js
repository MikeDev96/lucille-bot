const { Command } = require("discord.js-commando")

module.exports = class LocalTime extends Command {
  constructor (client) {
    super(client, {
      name: "localtime",
      aliases: ["time"],
      group: "misc",
      memberName: "time",
      description: "Returns server time",
      guildOnly: true,
    })
  }

  async run (msg, args) {
    msg.react("⏲️")

    msg.reply(new Date().toLocaleTimeString())
  }
}