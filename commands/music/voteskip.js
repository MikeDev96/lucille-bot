const { Command } = require("discord.js-commando")

module.exports = class PlayCommand extends Command {
  constructor (client) {
    super(client, {
      name: "voteskip",
      aliases: ["vskip", "vs"],
      group: "music",
      memberName: "voteskip",
      description: "Vote skip command",
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = msg.guild.music
    const tracks = music.state.queue

    if (tracks.length) {
      if (msg.member.voice.channelID !== msg.guild.voice.channelID) {
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
          const reactions = await voteMsg.awaitReactions(filter, { time: 30000 })

          const votes = reactions.has("🗳️") ? reactions.get("🗳️").count - 1 : 0

          await voteMsg.delete()

          // 15 seconds has passed, so make sure the track is still playing
          if (votes >= votesNeeded && tracks[0] && music.getTrackTitle(tracks[0]) === currentlyPlayingTitle) {
            msg.react("⏭️")

            music.state.queue.splice(1)
            music.setState({ queue: music.state.queue })
            music.dispatcherExec(d => d.end())
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