import Commando from "discord.js-commando"
const { Command } = Commando

export default class LocalTime extends Command {
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