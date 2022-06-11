const { Command } = require("discord.js-commando")
const { MessageAttachment } = require("discord.js")
const fs = require("fs")

module.exports = class extends Command {
  constructor(client) {
    super(client, {
      name: "database",
      aliases: ["db"],
      group: "misc",
      memberName: "database",
      description: "Exports the database, useful for development and debugging purposes",
      args: [],
      guildOnly: false,
    })
  }

  async run(msg, _args) {
    const path = "./main.db"
    const waitReact = msg.react("⏳")

    fs.readFile(path, (err, data) => {
      if (err) {
        console.log(err)
        return msg.reply("Failed to export database")
      }
      else if (data) {
        const attach = new MessageAttachment(`${path}`, `${new Date().toISOString()}).db`, data)
        msg.reply(attach).then(() => {
          msg.react("⬇️")
          waitReact.then(r => r.remove())
        })
      }
    });
  }
}