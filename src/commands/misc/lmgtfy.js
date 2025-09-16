import Command from "../../models/Command.js"

export default class extends Command {
  constructor () {
    super({
      name: "letmegooglethatforyou",
      aliases: ["lmgtfy"],
      group: "misc",
      memberName: "lmgtfy",
      description: "A response to a snooty response to someone asking for help",
      args: [
        {
          key: "query",
          prompt: "What should I google for them?",
          type: "string",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const query = args.query
    const encodedQuery = encodeURIComponent(query)
    const url = `https://letmegooglethat.com/?q=${encodedQuery}`
    
    if (url.length > 1999) {
      msg.reply(`The person was just asking for help, ${msg.author.username} you wet egg and your link was too long`)
    }
    else {
      msg.reply(`The person was just asking for help, ${msg.author.username} you wet egg. ${url}`)
    }
  }
}