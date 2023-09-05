import Command from "../../models/Command.js"

export default class LocalTime extends Command {
  constructor () {
    super({
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