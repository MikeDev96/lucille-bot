import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"
import { isInBotsVoiceChannel } from "../../helpers.js"

export default class extends Command {
  constructor () {
    super({
      name: "clear",
      aliases: ["cls"],
      group: "music",
      memberName: "clear",
      description: "Clears the queue.",
      guildOnly: true,
    })
  }

  async run (msg, _args) {
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    if (!isInBotsVoiceChannel(LucilleClient.Instance, msg)) {
      msg.react("🖕")
      return
    }
    if (music.state.queue.length > 1) {
      const replyMsg = await msg.reply(`Are you sure you want to clear ${music.state.queue.length - 1} song(s) from the queue?\nReply with yes or no [y | n]`)
      const collected = await replyMsg.channel.awaitMessages({ filter: resMsg => resMsg.author.id === msg.author.id && /y|n/i.test(resMsg.content), max: 1, time: 15000 })

      replyMsg.delete()

      const firstMsg = collected.first()
      if (firstMsg) {
        if (/y/i.test(firstMsg.content)) {
          firstMsg.react("🗑️")
          music.state.queue.splice(1)
          music.setState({ queue: music.state.queue })
          music.updateEmbed()
        }
      }
    }
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "🗑️ Clear Command Help",
          description: "Clear all songs from the music queue!",
          color: 0xff6b6b,
          fields: [
            {
              name: "🎵 Usage",
              value: `\`${prefix}clear\`\nClear the entire queue\n\`${prefix}cls\`\nShort alias`,
              inline: false
            },
            {
              name: "⚠️ Requirements",
              value: "• Must be in the same voice channel as the bot\n• Confirmation required (15 seconds)\n• Current playing song is not removed",
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• Only clears queued songs, not the current one\n• Use 'y' or 'n' to confirm\n• Cannot be undone once confirmed",
              inline: false
            }
          ],
          footer: {
            text: "Clear the queue! 🎵",
          },
        },
      ],
    }
  }
}