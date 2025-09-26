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

    // Show usage help if no arguments provided
    if (!aliasname) {
      const usageEmbed = {
        color: 0x0099ff,
        title: "🎯 Alias Command Usage",
        description: "Create shortcuts for commands and links!",
        fields: [
          {
            name: "📋 List Aliases",
            value: `\`${Prefix}al list\` - Show all aliases`,
            inline: true
          },
          {
            name: "➕ Create Alias",
            value: `\`${Prefix}al <name> <command/link>\`\nExample: \`${Prefix}al vi https://tenor.com/view/sad.gif\``,
            inline: true
          },
          {
            name: "▶️ Use Alias",
            value: `\`${Prefix}<aliasname>\` - Run the alias\nExample: \`${Prefix}vi\``,
            inline: true
          },
          {
            name: "🗑️ Delete Alias",
            value: `\`${Prefix}al delete <name>\`\nExample: \`${Prefix}al delete vi\``,
            inline: true
          },
          {
            name: "💡 Tips",
            value: "• Use `&` to chain multiple commands\n• Aliases can be up to 10 characters\n• Commands can be up to 200 characters",
            inline: false
          }
        ],
        footer: {
          text: process.env.DISCORD_FOOTER,
          icon_url: process.env.DISCORD_AUTHORAVATARURL,
        },
      }
      return msg.reply({ embeds: [usageEmbed] })
    }

    if (["list", "ls"].includes(aliasname)) {
      const List = LucilleClient.Instance.db.alias.listAliases(aliasvalue)

      if (List.length) {
        paginatedEmbed(msg, {
          color: 0x0099ff,
          title: "🎯 Lucille Alias Commands",
          description: "Quick shortcuts for your favorite commands and links",
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
        if (aliasvalue && aliasvalue.split("&").filter(cmd => cmd !== "").length) {
          LucilleClient.Instance.db.alias.writeAlias(aliasname, aliasvalue)
          msg.reply("Alias added :)")
        }
        else {
          msg.reply("Cannot supply empty commands")
        }
      }
    }
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "🎯 Alias Command Help",
          description: "Create shortcuts for commands and links!",
          color: 0x0099ff,
          fields: [
            {
              name: "📋 List Aliases",
              value: `\`${prefix}alias list\` - Show all aliases\n\`${prefix}al list\` - Short alias`,
              inline: true
            },
            {
              name: "➕ Create Alias",
              value: `\`${prefix}alias <name> <command/link>\`\nExample: \`${prefix}alias vi https://tenor.com/view/sad.gif\``,
              inline: true
            },
            {
              name: "▶️ Use Alias",
              value: `\`${prefix}<aliasname>\` - Run the alias\nExample: \`${prefix}vi\``,
              inline: true
            },
            {
              name: "🗑️ Delete Alias",
              value: `\`${prefix}alias delete <name>\`\nExample: \`${prefix}alias delete vi\``,
              inline: true
            },
            {
              name: "🔗 Supported Content",
              value: "• Discord commands with prefix\n• Direct links (images, GIFs, audio)\n• Multiple commands with `&` separator\n• Text messages",
              inline: false
            },
            {
              name: "💡 Tips & Limits",
              value: "• Alias names: up to 10 characters, alphanumeric only\n• Commands: up to 200 characters\n• Use `&` to chain multiple commands\n• Aliases cannot reference other aliases",
              inline: false
            }
          ],
          footer: {
            text: "Create shortcuts for your favorite commands! 🎯",
          },
        },
      ],
    }
  }
}

const embedHandler = (aliasList) => {
  return splitMessage(aliasList.map(alias => {
    const commands = alias.command.map(cmd => formatAliasCmd(cmd)).join(" ")
    const icon = getAliasIcon(alias.command)
    return `${icon} **${alias.alias}**\n${commands}\n`
  }), { maxLength: 1024 }).map((str, idx) => ({
    name: `📋 Alias Page ${idx + 1}`,
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

const getAliasIcon = (commands) => {
  const commandStr = commands.join(" ").toLowerCase()
  
  if (commandStr.includes("jump") || commandStr.includes("play") || commandStr.includes("music")) {
    return "🎵"
  }
  else if (commandStr.includes("https://tenor.com") || commandStr.includes("gif")) {
    return "🎭"
  }
  else if (commandStr.includes("https://") && (commandStr.includes(".jpg") || commandStr.includes(".png") || commandStr.includes(".jpeg"))) {
    return "🖼️"
  }
  else if (commandStr.includes("https://") && (commandStr.includes(".mp3") || commandStr.includes(".wav") || commandStr.includes("soundcloud"))) {
    return "🔊"
  }
  else if (commandStr.includes("https://")) {
    return "🔗"
  }
  else if (commandStr.includes(";")) {
    return "⚡"
  }
  else {
    return "📝"
  }
}

const checkForLink = (aliasCmd, linkType) => {
  if (aliasCmd.includes(linkType)) {
    const linkIndex = aliasCmd.indexOf(linkType)
    const link = aliasCmd.substring(linkIndex)
    const displayText = link.length > 30 ? link.substring(0, 30) + "..." : link
    return `[${displayText}](${link})`
  }
}