const { Command } = require("discord.js-commando")
const config = require("../../config.json")
const { proxyCommand } = require("../../classes/DiscordJSHelpers")

module.exports = class Alias extends Command {
  constructor (client) {
    super(client, {
      name: "alias",
      memberName: "alias",
      description: "Create aliases (shortcuts) for commands",
      group: "misc",
      args: [
        {
          key: "aliasname",
          prompt: "alias name",
          type: "string",
          validate: val => {
            if (val.length > 10) {
              return "Alias length needs to be 10 characters or less"
            }
            else if (!(RegExp("^[a-zA-Z0-9 ]*$").test(val))) {
              return "Can only contain alphanumerics"
            }
            else {
              return true
            }
          },
        },
        {
          key: "aliasvalue",
          prompt: "alias value",
          type: "string",
          default: "",
          validate: val => {
            const Prefix = this.client.commandPrefix
            // eslint-disable-next-line
            if ((val.toLowerCase()).replace("/\s+/g", "").includes(`${Prefix}al`) || (val.toLowerCase()).replace("/\s+/g", "").includes(`${Prefix}alias`)) {
              return "Alias cannot reference another alias"
            }
            else if (val.length > 200) {
              return "Alias commands can be 200 characters of less"
            }
            // eslint-disable-next-line
            else if (!(RegExp(`^[a-zA-Z0-9&${Prefix}\" :/ \-_.]*$`).test(val))) {
              return `Can only contain alphanumerics, ${Prefix}, :, /, -, _, . and &`
            }
            else {
              return true
            }
          },
        },
      ],
      aliases: ["al"],
    })
  }

  async run (msg, args) {
    const { aliasname, aliasvalue } = args
    const Prefix = this.client.commandPrefix

    if (aliasname === "list") {
      const List = this.client.aliasTracker.listAliases()

      if (List.length) {
        // Build the embed
        msg.channel.send({
          embed: {
            color: 0x0099ff,
            title: "Lucille alias commands",
            fields: [
              ...List.map(alias => ({
                name: alias.alias,
                value: alias.command,
              })),
            ],
            footer: {
              text: config.discord.footer,
              icon_url: config.discord.authorAvatarUrl,
            },
          },
        })
      }
      else msg.reply("No aliases have been added yet")
    }
    else if (aliasvalue === "") {
      if (this.client.aliasTracker.checkForAlias(aliasname).length) {
        const AliasCommand = this.client.aliasTracker.checkForAlias(aliasname)[0].command

        AliasCommand.forEach((command, index) => {
          if (command.length !== 0) {
            setTimeout(() => {
              if (command[0] === (Prefix)) {
                proxyCommand(msg, msg.author, command, false)
              }
              else msg.channel.send(command)
            }, 1000 * (index))
          }
        })
      }
      else {
        msg.reply("Command not defined")
      }
    }
    else {
      if (aliasvalue === "delete" || aliasvalue === "remove") {
        this.client.aliasTracker.removeAlias(args.aliasname)
        msg.reply(`Deleted alias '${aliasname}' :)`)
      }
      else if (this.client.aliasTracker.checkForAlias(aliasname).length) {
        msg.reply("This alias already exists :(")
      }
      else {
        if (aliasvalue.split("&").filter(cmd => cmd !== "").length) {
          this.client.aliasTracker.writeAlias(aliasname, aliasvalue)
          msg.reply("Alias added :)")
        }
        else {
          msg.reply("Cannot supply empty commands")
        }
      }
    }
  }
}