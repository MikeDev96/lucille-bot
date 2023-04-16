import Command from "../../classes/Command.js"

export default class extends Command {
  constructor () {
    super({
      name: "letmegooglethatforyou",
      aliases: ["lmgtfy"],
      group: "misc",
      memberName: "lmgtfy",
      description: "A response to a snooty response to someone asking for help",
      args: [],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (encodeURI("https://letmegooglethat.com/?q=" + args).length > 1999) {
      args = "That was too big"
      msg.reply(`The person was just asking for help, ${msg.author.username} you wet egg. ${encodeURI("https://letmegooglethat.com/?q=" + args)}`)
    }
    else {
      msg.reply(`The person was just asking for help, ${msg.author.username} you wet egg. ${encodeURI("https://letmegooglethat.com/?q=" + args)}`)
    }
  }
}