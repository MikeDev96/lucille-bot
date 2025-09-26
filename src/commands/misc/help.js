import LucilleClient from "../../classes/LucilleClient.js"
import Command from "../../models/Command.js"
import { paginatedEmbed } from "../../helpers.js"

export default class extends Command {
  constructor () {
    super({
      name: "help",
      aliases: ["h", "commands"],
      group: "misc",
      memberName: "help",
      description: "List all available commands",
      args: [
        {
          key: "command",
          prompt: "Specific command to get help for",
          type: "string",
          default: "",
        },
      ],
      guildOnly: false,
    })
  }

  async run (msg, args) {
    const prefix = LucilleClient.Instance.commandPrefix
    
    // If user wants help for a specific command
    if (args.command) {
      const commandName = args.command.toLowerCase()
      const command = LucilleClient.Instance.commands.find(cmd => 
        cmd.config.name === commandName || 
        cmd.config.aliases?.includes(commandName)
      )
      
      if (command) {
        if (command.getHelpMessage) {
          return msg.reply(command.getHelpMessage(prefix))
        } else {
          return msg.reply({
            embeds: [{
              title: `📖 ${command.config.name} Command`,
              description: command.config.description || "No description available",
              color: 0x0099ff,
              fields: [
                {
                  name: "Usage",
                  value: `\`${prefix}${command.config.name}\``,
                  inline: true
                },
                {
                  name: "Category",
                  value: command.config.group || "Unknown",
                  inline: true
                },
                ...(command.config.aliases?.length > 0 ? [{
                  name: "Aliases",
                  value: command.config.aliases.map(alias => `\`${prefix}${alias}\``).join(", "),
                  inline: false
                }] : [])
              ],
              footer: {
                text: "Use the command to see more details",
              },
            }]
          })
        }
      } else {
        return msg.reply({
          embeds: [{
            title: "❌ Command Not Found",
            description: `Command \`${args.command}\` not found. Use \`${prefix}help\` to see all available commands.`,
            color: 0xff0000,
          }]
        })
      }
    }

    // Group commands by category
    const commandsByGroup = {}
    
    LucilleClient.Instance.commands.forEach(cmd => {
      // Skip aliases to avoid duplicates
      if (cmd.config.aliases?.includes(cmd.config.name)) {
        return
      }
      
      const group = cmd.config.group || "other"
      if (!commandsByGroup[group]) {
        commandsByGroup[group] = []
      }
      commandsByGroup[group].push(cmd)
    })

    // Sort commands within each group
    Object.keys(commandsByGroup).forEach(group => {
      commandsByGroup[group].sort((a, b) => a.config.name.localeCompare(b.config.name))
    })

    // Group configuration
    const groupConfig = {
      fun: {
        emoji: "🎮",
        name: "Fun Commands",
        color: 0xff6b6b,
        description: "Entertainment and games for your server!"
      },
      misc: {
        emoji: "🔧",
        name: "Miscellaneous",
        color: 0x0099ff,
        description: "Utility and general purpose commands!"
      },
      music: {
        emoji: "🎵",
        name: "Music Commands",
        color: 0x1db954,
        description: "Music playback and audio controls!"
      }
    }

    // Create paginated embeds for each group
    const pages = []
    const groupOrder = ["fun", "misc", "music"]
    
    groupOrder.forEach(group => {
      const commands = commandsByGroup[group]
      if (!commands || commands.length === 0) return
      
      const config = groupConfig[group]
      const commandList = commands.map(cmd => {
        const aliases = cmd.config.aliases?.length > 0 
          ? ` (${cmd.config.aliases.join(", ")})` 
          : ""
        return `\`${prefix}${cmd.config.name}\`${aliases}`
      }).join("\n")

      pages.push({
        title: `${config.emoji} ${config.name}`,
        description: `${config.description}\n\nUse \`${prefix}help <command>\` for detailed help on a specific command`,
        color: config.color,
        fields: [
          {
            name: `📋 Commands (${commands.length})`,
            value: commandList || "No commands available",
            inline: false
          }
        ],
        footer: {
          text: `Page ${pages.length + 1} of ${groupOrder.length} • Total: ${LucilleClient.Instance.commands.length} commands available`,
        },
      })
    })

    // Add any other groups not in the main categories
    Object.keys(commandsByGroup).forEach(group => {
      if (!groupOrder.includes(group)) {
        const commands = commandsByGroup[group]
        const commandList = commands.map(cmd => {
          const aliases = cmd.config.aliases?.length > 0 
            ? ` (${cmd.config.aliases.join(", ")})` 
            : ""
          return `\`${prefix}${cmd.config.name}\`${aliases}`
        }).join("\n")

        pages.push({
          title: `📁 ${group.charAt(0).toUpperCase() + group.slice(1)} Commands`,
          description: `Commands in the ${group} category`,
          color: 0x95a5a6,
          fields: [
            {
              name: `📋 Commands (${commands.length})`,
              value: commandList || "No commands available",
              inline: false
            }
          ],
          footer: {
            text: `Page ${pages.length + 1} of ${pages.length + 1} • Total: ${LucilleClient.Instance.commands.length} commands available`,
          },
        })
      }
    })

    // Use paginated embed if multiple pages, otherwise send single embed
    if (pages.length > 1) {
      return paginatedEmbed(msg, {
        color: 0x0099ff,
        title: "🤖 Lucille Bot Commands",
        description: "Navigate through command categories using the reactions below!",
        author: {
          name: msg.member?.displayName || msg.author.username,
          icon_url: msg.author.displayAvatarURL(),
        },
        footer: {
          text: "Use the reactions to navigate between categories!",
        },
      }, pages.map(page => ({
        name: page.title,
        value: `${page.description}\n\n${page.fields[0].value}`,
        inline: false
      })))
    } else {
      return msg.reply({ embeds: [pages[0]] })
    }
  }
}
