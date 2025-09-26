import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
      name: "resume",
      aliases: ["unpause"],
      group: "music",
      memberName: "resume",
      description: "Resumes the current paused song",
      guildOnly: true,
    })
  }

  async run (msg) {
    resume(msg)
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "▶️ Resume Command Help",
          description: "Resume paused music!",
          color: 0x00ff00,
          fields: [
            {
              name: "🎵 Usage",
              value: `\`${prefix}resume\`\nResume paused music\n\`${prefix}unpause\`\nAlias`,
              inline: false
            },
            {
              name: "⚠️ Requirements",
              value: "• Music must be paused\n• Only the person who paused can resume\n• Bot must be connected to voice",
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• Use 'pause' to pause music\n• Resume continues from where it left off\n• Queue remains intact while paused",
              inline: false
            }
          ],
          footer: {
            text: "Let's continue! ▶️",
          },
        },
      ],
    }
  }
}

export const resume = msg => {
  try {
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    
    if (!music.player || music.player.state.status === 'idle') {
      msg.reply("❌ Nothing is currently paused to resume")
      return
    }
    
    if (!music.state.pauser) {
      msg.reply("❌ Music is not paused")
      return
    }
    
    music.setState({ pauser: "" })
    music.player.unpause()
    music.updateEmbed()
    msg.react("▶️")
  } catch (error) {
    console.error("Resume command error:", error)
    msg.reply(`❌ Failed to resume: ${error.message}`)
  }
}