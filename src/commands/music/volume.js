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
}