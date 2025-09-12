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