import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
      name: "volume",
      aliases: ["vol"],
      group: "music",
      memberName: "volume",
      description: "Changes the volume of the player.",
      args: [
        {
          key: "volume",
          prompt: "Enter volume between 1 & 300",
          type: "integer",
          validate: num => num >= 1 && num <= 300,
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    
    if (!music.state.voiceChannel) {
      msg.reply("❌ Bot is not connected to a voice channel")
      return
    }
    
    try {
      const currentVol = music.state.volume
      music.setVolume(args.volume)
      msg.react(args.volume > currentVol ? "🔊" : args.volume < currentVol ? "🔉" : "🔈")
    } catch (error) {
      console.error("Volume command error:", error)
      msg.reply(`❌ Failed to set volume: ${error.message}`)
    }
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "🔊 Volume Command Help",
          description: "Adjust the music volume!",
          color: 0x9b59b6,
          fields: [
            {
              name: "🎵 Usage",
              value: `\`${prefix}volume <1-300>\`\nSet volume level\n\`${prefix}vol <1-300>\`\nShort alias\nExample: \`${prefix}volume 50\``,
              inline: false
            },
            {
              name: "📊 Volume Levels",
              value: "• 1-50: Quiet\n• 51-100: Normal\n• 101-200: Loud\n• 201-300: Very loud (may cause distortion)",
              inline: false
            },
            {
              name: "⚠️ Requirements",
              value: "• Bot must be connected to voice channel\n• Volume must be between 1 and 300\n• Changes apply immediately",
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• Higher volumes may cause audio distortion\n• Volume is persistent across songs\n• Use moderate levels for best quality",
              inline: false
            }
          ],
          footer: {
            text: "Turn it up! 🔊",
          },
        },
      ],
    }
  }
}