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

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "🌈 Gay Test Command Help",
          description: "Find out how gay you are with this fun test!",
          color: 0x9932cc,
          fields: [
            {
              name: "🎲 Usage",
              value: `\`${prefix}gay\`\nGet your gay percentage (0-100%)`,
              inline: false
            },
            {
              name: "💡 Special",
              value: "100% gets special rainbow emojis! 🌈🏳‍🌈",
              inline: false
            }
          ],
          footer: {
            text: "All in good fun! 🎭",
          },
        },
      ],
    }
  }
}