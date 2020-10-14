module.exports = class {
  static bootClientFromAllVoiceChannels (client) {
    client.guilds.cache.forEach(guild => {
      guild.channels.cache.forEach(channel => {
        if (channel.type === "voice") {
          channel.members.forEach(member => {
            if (member.user === client.user) {
              member.voice.setChannel(null)
            }
          })
        }
      })
    })
  }
}