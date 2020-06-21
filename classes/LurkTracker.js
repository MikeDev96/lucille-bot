module.exports = class {
  constructor (client) {
    this.client = client
    this.initClient()
  }

  initClient () {
    this.client.on("presenceUpdate", this.onPresenceUpdate.bind(this))
  }

  onPresenceUpdate (oldPresence, newPresence) {
    if (oldPresence && newPresence && !oldPresence.clientStatus.web && !oldPresence.clientStatus.mobile && !oldPresence.clientStatus.desktop && !newPresence.clientStatus.web && newPresence.clientStatus.mobile === "online" && !oldPresence.clientStatus.desktop) {
      newPresence.guild.systemChannel.send(`\`${newPresence.member.displayName}\` is lurking! 👀👀👀`)
    }
  }
}