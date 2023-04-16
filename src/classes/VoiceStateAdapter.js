import EventEmitter from "events"

const trackingFields = ["selfMute", "selfDeaf", "serverMute", "serverDeaf"]

class VoiceStateAdapter extends EventEmitter {
  constructor (client) {
    super()
    this.client = client
    this.client.on("voiceStateUpdate", this.voiceStateUpdate.bind(this))
  }

  voiceStateUpdate (oldMember, newMember) {
    // User joined the voice channel
    if (!oldMember.channelId && newMember.channelId) {
      this.emit("join", {
        channel: newMember.channel,
        isAfk: newMember.channelId === oldMember.guild.afkChannelId,
        voiceState: newMember,
      })
    }
    // User left the voice channel
    else if (oldMember.channelId && !newMember.channelId) {
      this.emit("leave", {
        channel: oldMember.channel,
        isAfk: oldMember.channelId === oldMember.guild.afkChannelId,
        voiceState: oldMember,
      })
    }
    // User moved voice channel
    else if (oldMember.channelId && newMember.channelId && oldMember.channelId !== newMember.channelId) {
      this.emit("move", {
        fromChannel: oldMember.channel,
        toChannel: newMember.channel,
        fromAfk: oldMember.channelId === oldMember.guild.afkChannelId,
        toAfk: newMember.channelId === oldMember.guild.afkChannelId,
        voiceState: oldMember,
      })
    }
    // Wasn't a voice channel change
    else {
      this.emit("other", {
        changes: trackingFields.reduce((acc, k) => {
          if (oldMember[k] !== newMember[k]) {
            acc.push({
              type: k,
              from: oldMember[k],
              to: newMember[k],
            })
          }
          return acc
        }, []),
      })
    }
  }
}

export default VoiceStateAdapter