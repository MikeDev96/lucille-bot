import Command from "../../classes/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

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
      if (msg.member.voice.channelId !== LucilleClient.Instance.getGuildInstance(msg.guild).voice?.channelId) {
        msg.react("🖕")
        return
      }

      const [currentlyPlaying] = tracks
      const currentlyPlayingTitle = music.getTrackTitle(currentlyPlaying)

      const voiceChannelMembers = msg.guild.voice.channel.members.filter(member => member.user.id !== msg.client.user.id)
      const memberCount = voiceChannelMembers.size
      const votesNeeded = memberCount % 2 === 0 ? memberCount / 2 + 1 : Math.ceil(memberCount / 2)

      try {
        const voteMsg = await msg.channel.send(`Vote to skip (30s):\n\`${currentlyPlayingTitle}\`\nRequired Votes: ${votesNeeded}/${memberCount}\nVoters: ${voiceChannelMembers.map(m => `\`${m.displayName}\``).join(", ")}`)
        await voteMsg.react("🗳️")

        try {
          const filter = (reaction, user) => reaction.emoji.name === "🗳️" && voiceChannelMembers.has(user.id)
          const reactions = await voteMsg.awaitReactions({ filter, time: 30000 })

          const votes = reactions.has("🗳️") ? reactions.get("🗳️").count - 1 : 0

          await voteMsg.delete()

          // 30 seconds has passed, so make sure the track is still playing
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