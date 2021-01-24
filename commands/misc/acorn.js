const { Command } = require('discord.js-commando')
const { exec } = require("child_process")

module.exports = class extends Command {
  constructor(client) {
    super(client, {
      name: "acorn",
      aliases: [],
      group: "misc",
      memberName: "acorn",
      description: "Update acorn transfer",
      args: [
        {
          key: "command",
          prompt: "Command",
          type: "string",
          default: ""
        }
      ],
      guildOnly: false
    })
  }

  async run(msg, args) {
    if (msg.member.id === "164177838214348801") { 
      if (args.command.toLowerCase().substring(0, 6) === "update" || args.command.toLowerCase().substring(0, 9) === "configure") {
        msg.reply("Lucille is not permitted to execute these commands.\nUse the acorn-transfer-cli tool in a terminal")
        return
      } else {
        exec(`acorn ${args.command}`, (err, res) => {
          if (err) {
            console.log(err)
            msg.reply(err.toString())
            return
          }

          if (res.toString().substring(0, 7) === "VERSION") {
            var resArray = res.toString().replace(/\$ /g, ";").split("\n")
            resArray = resArray.splice(3, resArray.length)
            resArray.splice(5, 1)
            resArray.splice(8, 1)
            resArray.pop()
            msg.reply("\n```" + resArray.join("\n") + "```")
          } else {
            msg.reply("\n```" + res.toString() + "```")
          }
        })
      }
    } else {
      msg.reply("You are not authorised to use this command. If you feel this is a mistake, contact `Haribo#1154`")
      return
    }
  }
}