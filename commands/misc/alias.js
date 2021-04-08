const { Command } = require("discord.js-commando")
const config = require("../../config.json")
const { proxyCommand } = require("../../classes/DiscordJSHelpers")
const { Util } = require("discord.js")
const { paginatedEmbed } = require("../../helpers.js")
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
      const List = this.client.db.listAliases()

      if (List.length) {
        paginatedEmbed(msg, {
          embed: {
            color: 0x0099ff,
            title: "Lucille Alias Commands",
            footer: {
              text: config.discord.footer,
              icon_url: config.discord.authorAvatarUrl,
            },
          },
        }, embedHandler(List))
      }
      else msg.reply("No aliases have been added yet")
    }
    else if (aliasvalue === "") {
      if (this.client.db.checkForAlias(aliasname).length) {
        const AliasCommand = this.client.db.checkForAlias(aliasname)[0].command

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
      if (aliasname === "delete" || aliasname === "remove" || aliasname === "rm") {
        if (this.client.db.checkForAlias(aliasvalue).length) {
          this.client.db.removeAlias(aliasvalue)
          msg.reply(`Deleted alias '${aliasvalue}' :)`)
        }
        else {
          msg.reply(`Alias '${aliasvalue}' not found`)
        }
      }
      else if (this.client.db.checkForAlias(aliasname).length) {
        msg.reply("This alias already exists :(")
      }
      else {
        if (aliasvalue.split("&").filter(cmd => cmd !== "").length) {
          this.client.db.writeAlias(aliasname, aliasvalue)
          msg.reply("Alias added :)")
        }
        else {
          msg.reply("Cannot supply empty commands")
        }
      }
    }
  }
}

const embedHandler = (aliasList) => {
  return Util.splitMessage(aliasList.map(alias => {
    return (
      `${alias.command.reduce((string, cmd) => `${string} ${formatAliasCmd(cmd)}`, `**${alias.alias}** - `)}`
    )
  }), { maxLength: 1024 }).map((str, idx) => ({
    name: `Alias Page ${idx + 1}`,
    value: str,
  }))
}

const formatAliasCmd = (aliasCmd) => {
  if (aliasCmd.includes("https://")) {
    return checkForLink(aliasCmd, "https://")
  }
  else if (aliasCmd.includes("http://")) {
    return checkForLink(aliasCmd, "http://")
  }
  return aliasCmd
}

const checkForLink = (aliasCmd, linkType) => {
  if (aliasCmd.includes(linkType)) {
    const linkIndex = aliasCmd.indexOf(linkType)
    const link = aliasCmd.substring(linkIndex)
    return `${aliasCmd.replace(link, `[${link.length > 25 ? link.substring(0, 50) + "..." : link}](${link})`)}`
  }
}