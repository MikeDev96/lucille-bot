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

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "🔍 LMGTFY Command Help",
          description: "Generate a 'Let Me Google That For You' link for someone!",
          color: 0x4285f4,
          fields: [
            {
              name: "🌐 Usage",
              value: `\`${prefix}letmegooglethatforyou <query>\`\nGenerate LMGTFY link\n\`${prefix}lmgtfy <query>\`\nShort alias\nExample: \`${prefix}lmgtfy how to code\``,
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• Use when someone asks something easily searchable\n• Link length is limited to 1999 characters\n• Automatically URL-encodes the query\n• Perfect for those 'just Google it' moments",
              inline: false
            }
          ],
          footer: {
            text: "Be helpful, not snarky! 😊",
          },
        },
      ],
    }
  }
}