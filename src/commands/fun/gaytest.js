import Command from "../../models/Command.js"

export default class extends Command {
  constructor () {
    super({
      name: "gay",
      aliases: [],
      group: "fun",
      memberName: "gay",
      description: "Determines how gay you are",
      args: [],
      guildOnly: true,
    })
  }

  run (msg, _args) {
    const realLength = Math.ceil(Math.random() * 100)
    msg.reply(`You are \`${realLength}%\` gay${realLength === 100 ? " 🌈🏳‍🌈" : ""}.`)
  }
}