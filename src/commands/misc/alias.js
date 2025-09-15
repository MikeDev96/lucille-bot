import { proxyCommand } from "../../classes/DiscordJSHelpers.js"
import { paginatedEmbed, splitMessage } from "../../helpers.js"
import LucilleClient from "../../classes/LucilleClient.js"
import Command from "../../models/Command.js"

export default class Alias extends Command {
  constructor () {
    super({
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
            else if (!/^[a-zA-Z0-9 ]*$/.test(val)) {
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
            const Prefix = LucilleClient.Instance.commandPrefix
            // Handle undefined or empty values
            if (!val || val === "") {
              return true // Allow empty values since default is ""
            }
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
    const Prefix = LucilleClient.Instance.commandPrefix

    if (["list", "ls"].includes(aliasname)) {
      const List = LucilleClient.Instance.db.alias.listAliases(aliasvalue)

      if (List.length) {
        paginatedEmbed(msg, {
          color: 0x0099ff,
          title: "Lucille Alias Commands",
          footer: {
            text: process.env.DISCORD_FOOTER,
            icon_url: process.env.DISCORD_AUTHORAVATARURL,
          },
        }, embedHandler(List))
      }
      else msg.reply("No aliases have been added yet")
    }
    else if (aliasvalue === "") {
      if (LucilleClient.Instance.db.alias.checkForAlias(aliasname).length) {
        const AliasCommand = LucilleClient.Instance.db.alias.checkForAlias(aliasname)[0].command

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
        if (LucilleClient.Instance.db.alias.checkForAlias(aliasvalue).length) {
          LucilleClient.Instance.db.alias.removeAlias(aliasvalue)
          msg.reply(`Deleted alias '${aliasvalue}' :)`)
        }
        else {
          msg.reply(`Alias '${aliasvalue}' not found`)
        }
      }
      else if (LucilleClient.Instance.db.alias.checkForAlias(aliasname).length) {
        msg.reply("This alias already exists :(")
      }
      else {
        if (aliasvalue.split("&").filter(cmd => cmd !== "").length) {
          LucilleClient.Instance.db.alias.writeAlias(aliasname, aliasvalue)
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
  return splitMessage(aliasList.map(alias => {
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