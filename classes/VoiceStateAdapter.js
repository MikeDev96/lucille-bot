const EventEmitter = require("events")

const trackingFields = ["selfMute", "selfDeaf", "serverMute", "serverDeaf"]

class VoiceStateAdapter extends EventEmitter {
  constructor (client) {
    super()
    this.client = client
    this.client.on("voiceStateUpdate", this.voiceStateUpdate.bind(this))
  }

  voiceStateUpdate (oldMember, newMember) {
    // User joined the voice channel
    if (!oldMember.channelID && newMember.channelID) {
      this.emit("join", {
        channel: newMember.channel,
        isAfk: newMember.channelID === oldMember.guild.afkChannelID,
        voiceState: newMember,
      })
    }
    // User left the voice channel
    else if (oldMember.channelID && !newMember.channelID) {
      this.emit("leave", {
        channel: oldMember.channel,
        isAfk: oldMember.channelID === oldMember.guild.afkChannelID,
        voiceState: oldMember,
      })
    }
    // User moved voice channel
    else if (oldMember.channelID && newMember.channelID && oldMember.channelID !== newMember.channelID) {
      this.emit("move", {
        fromChannel: oldMember.channel,
        toChannel: newMember.channel,
        fromAfk: oldMember.channelID === oldMember.guild.afkChannelID,
        toAfk: newMember.channelID === oldMember.guild.afkChannelID,
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

module.exports = VoiceStateAdapter