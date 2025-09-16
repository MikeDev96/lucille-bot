import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"
import { shouldIgnoreMessage } from "../../helpers.js"

export default class extends Command {
  constructor () {
    super({
      name: "voteskip",
      aliases: ["vskip", "vs"],
      group: "music",
      memberName: "voteskip",
      description: "Vote skip command",
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    const tracks = music.state.queue

    if (tracks.length) {
      if (shouldIgnoreMessage(LucilleClient.Instance, msg)) {
        msg.react("🖕")
        return
      }

      if (!music.state.voiceChannel) {
        msg.reply("❌ Bot is not connected to a voice channel")
        return
      }

      const [currentlyPlaying] = tracks
      const currentlyPlayingTitle = music.getTrackTitle(currentlyPlaying)

      const voiceChannelMembers = music.state.voiceChannel.members.filter(member => member.user.id !== msg.client.user.id)
      const memberCount = voiceChannelMembers.size
      const votesNeeded = memberCount % 2 === 0 ? memberCount / 2 + 1 : Math.ceil(memberCount / 2)

      try {
        const voteMsg = await msg.channel.send(`Vote to skip (30s):\n\`${currentlyPlayingTitle}\`\nRequired Votes: ${votesNeeded}/${memberCount}\nVoters: ${voiceChannelMembers.map(m => `\`${m.displayName}\``).join(", ")}`)
        await voteMsg.react("🗳️")

        try {
          let votes = 0
          let resolved = false
          
          // Create a promise that resolves when majority is reached or timeout occurs
          const votePromise = new Promise((resolve) => {
            const timeout = setTimeout(() => {
              if (!resolved) {
                resolved = true
                resolve('timeout')
              }
            }, 30000)
            
            const collector = voteMsg.createReactionCollector({
              filter: (reaction, user) => reaction.emoji.name === "🗳️" && voiceChannelMembers.has(user.id),
              time: 30000
            })
            
            collector.on('collect', () => {
              votes = voteMsg.reactions.cache.get("🗳️")?.count - 1 || 0
              if (votes >= votesNeeded && !resolved) {
                resolved = true
                clearTimeout(timeout)
                collector.stop()
                resolve('majority')
              }
            })
            
            collector.on('end', () => {
              if (!resolved) {
                resolved = true
                clearTimeout(timeout)
                resolve('timeout')
              }
            })
          })
          
          await votePromise

          await voteMsg.delete()

          // Check if we have enough votes and the track is still playing
          if (votes >= votesNeeded && tracks[0] && music.getTrackTitle(tracks[0]) === currentlyPlayingTitle) {
            msg.react("⏭️")

            music.player.stop()
          }
          else {
            msg.react("🚫")
          }
        }
        catch (err) {
          console.log("Failed to await reactions while vote skipping")
          console.log(err)
        }
      }
      catch (err) {
        console.log("Failed to send vote skip message")
        console.log(err)
      }
    }
  }
}