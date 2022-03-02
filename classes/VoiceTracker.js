const humanizeDuration = require("humanize-duration")
const config = require("../config.json")

class VoiceTracker {
  constructor (client) {
    this.client = client
    this.monitor = {}
    this.initClient()
  }

  initVoiceStats () {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS VoiceStats
      (
        ServerId    TEXT,
        UserId      TEXT,
        SelfMute    INTEGER,
        SelfDeaf    INTEGER,
        ServerMute  INTEGER,
        ServerDeaf  INTEGER,
        Afk         INTEGER,
        SelfMuteMax INTEGER,
        SelfDeafMax INTEGER,
        AfkMax      INTEGER,
        PRIMARY KEY (ServerId, UserId)
      )
    `)

    try {
      this.db.exec(`SELECT Active FROM VoiceStats`)
    }
    catch {
      this.db.exec(`ALTER TABLE VoiceStats ADD COLUMN Active INTEGER DEFAULT 0`)
    }
  }

  initClient () {
    this.client.once("ready", () => {
      this.client.guilds.cache.forEach(serverId => {
        serverId.members.cache.forEach(mem => {
          this.voiceStateUpdate(mem, mem)
        })
      })

      // setInterval(() => {
      //   const d = new Date()
      //   if (d.getHours() === 19 && d.getMinutes() === 0) {
      //     const servers = Object.keys(this.db.get("servers").value())

      //     servers.forEach(serverId => {
      //       const server = this.client.guilds.cache.find(guild => guild.id === serverId)
      //       if (server && server.systemChannel) {
      //         const leaderboard = this.getLeaderboard(serverId)

      //         if (leaderboard) {
      //           server.systemChannel.send({
      //             embed: leaderboard,
      //           }).then(msg => msg.react("🔄"))
      //         }
      //       }
      //     })
      //   }
      // }, 60000)
    })

    this.client.on("voiceStateUpdate", this.voiceStateUpdate.bind(this))
  }

  async voiceStateUpdate (oldMember, newMember) {
    if (!(oldMember.id in this.monitor)) {
      this.monitor[oldMember.id] = {}
    }

    const mon = this.monitor[oldMember.id]
    const curTime = new Date().getTime()

    const changes = {
      selfMute: 0,
      selfDeaf: 0,
      serverMute: 0,
      serverDeaf: 0,
      afk: 0,
      selfMuteMax: 0,
      selfDeafMax: 0,
      afkMax: 0,
      active: 0,
    }

    const trackingFields = ["selfMute", "selfDeaf", "serverMute", "serverDeaf"]

    // User joined the voice channel
    if (oldMember.channelID === null && newMember.channelID !== null) {
      // User joined in AFK
      if (newMember.channelID === oldMember.guild.afkChannelID) {
        mon.afk = curTime
      }
      // User joined in another channel
      else {
        if (this.checkIfActive(newMember, trackingFields)) {
          mon.active = curTime
        }
        else {
          const duration = curTime - mon.active
          delete mon.active
          changes.active = duration
        }

        trackingFields.forEach(k => {
          if (newMember[k]) {
            mon[k] = curTime
          }
        })
      }
    }
    // User left the voice channel
    else if (oldMember.channelID !== null && newMember.channelID === null) {
      // User left AFK
      if (oldMember.channelID === oldMember.guild.afkChannelID) {
        if ("afk" in mon) {
          const duration = curTime - mon.afk
          delete mon.afk
          changes.afk = duration
        }
      }
      // User left another voice channel
      else {
        const duration = curTime - mon.active
        delete mon.active
        changes.active = duration
        trackingFields.forEach(k => {
          if (k in mon) {
            const duration = curTime - mon[k]
            delete mon[k]
            changes[k] = duration
          }
        })
      }
    }
    // User moved voice channel
    else if (oldMember.channelID !== null && newMember.channelID !== null && oldMember.channelID !== newMember.channelID) {
      // Moved from AFK
      if (oldMember.channelID === oldMember.guild.afkChannelID) {
        if ("afk" in mon) {
          const duration = curTime - mon.afk
          delete mon.afk
          changes.afk = duration
        }
        if (this.checkIfActive(newMember, trackingFields)) {
          mon.active = curTime
        }
        else {
          const duration = curTime - mon.active
          delete mon.active
          changes.active = duration
        }

        // User is no longer in AFK, start tracking other fields again
        trackingFields.forEach(k => {
          if (newMember[k]) {
            mon[k] = curTime
          }
        })
      }
      // Moved to AFK
      else if (newMember.channelID === oldMember.guild.afkChannelID) {
        mon.afk = curTime
        const duration = curTime - mon.active
        delete mon.active
        changes.active = duration

        // User is in AFK now, stop tracking other stats
        trackingFields.forEach(k => {
          if (k in mon) {
            const duration = curTime - mon[k]
            delete mon[k]
            changes[k] = duration
          }
        })
      }
    }
    // Wasn't a voice channel change
    else {
      // Dont care about tracking field updates if user is in AFK
      if (newMember.channelID !== newMember.guild.afkChannelID) {
        if (this.checkIfActive(newMember, trackingFields)) {
          mon.active = curTime
        }
        else {
          const duration = curTime - mon.active
          delete mon.active
          changes.active = duration
        }

        trackingFields.forEach(k => {
          if (oldMember[k] !== newMember[k]) {
            if (newMember[k]) {
              mon[k] = curTime
            }
            else {
              if (k in mon) {
                const duration = curTime - mon[k]
                delete mon[k]
                changes[k] = duration
              }
            }
          }
        })
      }
    }

    if (changes.selfMute > 0 || changes.selfDeaf > 0 || changes.serverMute > 0 || changes.serverDeaf > 0 || changes.afk > 0 || changes.selfMuteMax > 0 || changes.selfDeafMax > 0 || changes.afkMax > 0 || changes.active > 0) {
      const serverId = oldMember.guild.id
      const userId = oldMember.id

      this.client.db.run(`
        INSERT INTO VoiceStats VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ServerId, UserId) DO UPDATE
        SET
          SelfMute = SelfMute + ?,
          SelfDeaf = SelfDeaf + ?,
          ServerMute = ServerMute + ?,
          ServerDeaf = ServerDeaf + ?,
          Afk = Afk + ?,
          SelfMuteMax = CASE WHEN SelfMute + ? > SelfMuteMax THEN SelfMute + ? ELSE SelfMuteMax END,
          SelfDeafMax = CASE WHEN SelfDeaf + ? > SelfDeafMax THEN SelfDeaf + ? ELSE SelfDeafMax END,
          AfkMax = CASE WHEN Afk + ? > AfkMax THEN Afk + ? ELSE AfkMax END,
          Active = Active + ?
        WHERE ServerId = ?
          AND UserId = ?
      `, serverId, userId, changes.selfMute, changes.selfDeaf, changes.serverMute, changes.serverDeaf, changes.afk, changes.selfMute, changes.selfDeaf, changes.afk, changes.active,
      changes.selfMute, changes.selfDeaf, changes.serverMute, changes.serverDeaf, changes.afk, changes.selfMute, changes.selfMute, changes.selfDeaf, changes.selfDeaf, changes.afk, changes.afk, changes.active, serverId, userId)
    }
  }

  checkIfActive (obj, tracking) {
    let isActive = true
    tracking.forEach(e => {
      if (obj[e]) {
        isActive = false
      }
    })
    return isActive
  }

  formatMs (ms) {
    return `${humanizeDuration(this.round1000(ms))}`
  }

  async notify (channel, displayName, isServer, method, duration) {
    const replyMsg = await channel.send(`\`${displayName}\` was ${isServer ? "server " : ""}${method} for ${this.formatMs(duration)}`)
    if (replyMsg === 0) {
      replyMsg.react("🏆")
    }
  }

  async getLeaderboard (serverId, author = {}, members = {}) {
    const currentServer = this.client.guilds.cache.get(serverId)
    const server = this.client.db.runQuery(`SELECT * FROM VoiceStats WHERE ServerId = ${serverId}`)
    if (!server) {
      return false
    }

    const keys = server.filter(value => currentServer.members.cache.has(value.UserId))
    if (!keys.length) {
      return false
    }

    const muteSort = [...keys]
    const muteDurationSort = [...keys]
    const deafSort = [...keys]
    const deafDurationSort = [...keys]
    const quietestSort = [...keys]
    const afkSort = [...keys]
    const afkDurationSort = [...keys]
    const activeSort = [...keys]

    muteSort.sort((aValue, bValue) => bValue.SelfMute + bValue.ServerMute - aValue.SelfMute + aValue.ServerMute)
    muteDurationSort.sort((aValue, bValue) => (bValue.SelfMuteMax || 0) - (aValue.SelfMuteMax || 0))
    deafSort.sort((aValue, bValue) => bValue.SelfDeaf + bValue.ServerDeaf - aValue.SelfDeaf + aValue.ServerDeaf)
    deafDurationSort.sort((aValue, bValue) => (bValue.SelfDeafMax || 0) - (aValue.SelfDeafMax || 0))
    quietestSort.sort((aValue, bValue) => bValue.SelfMute + bValue.ServerMute + bValue.SelfDeaf + bValue.ServerDeaf + bValue.Afk - (aValue.SelfMute + aValue.ServerMute + aValue.SelfDeaf + aValue.ServerDeaf + (aValue.Afk || 0)))
    afkSort.sort((aValue, bValue) => (bValue.Afk || 0) - (aValue.Afk || 0))
    afkDurationSort.sort((aValue, bValue) => (bValue.AfkMax || 0) - (aValue.AfkMax || 0))
    activeSort.sort((aValue, bValue) => (bValue.Active || 0) - (aValue.Active || 0))

    const fields = [
      ["Quiet", quietestSort, data => data.SelfMute + data.ServerMute + data.SelfDeaf + data.ServerDeaf + (data.Afk || 0)],
      ["Mute", muteSort, data => data.SelfMute + data.ServerMute],
      ["Mute ⏲️", muteDurationSort, data => data.SelfMuteMax],
      ["Deaf", deafSort, data => data.SelfDeaf + data.ServerDeaf],
      ["Deaf ⏲️", deafDurationSort, data => data.SelfDeafMax],
      ["AFK", afkSort, data => data.Afk],
      ["AFK ⏲️", afkDurationSort, data => data.AfkMax],
      ["Active", activeSort, data => data.Active],
    ].reduce((acc, [header, data, getValue]) => {
      for (let i = 0; i < Math.min(keys.length, 3); i++) {
        acc.push({
          name: ":" + ["one", "two", "three"][i] + ": " + header,
          value: "**[" + currentServer.members.cache.get(data[i].UserId).user.username + "]** " + humanizeDuration(this.round1000(getValue(data[i]))),
          inline: true,
        })
      }
      return acc
    }, [])

    const usersNonCached = {
      quietestSort: (await members.fetch(quietestSort[0].UserId)).user.username,
      muteSort: (await members.fetch(muteSort[0].UserId)).user.username,
      muteDurationSort: (await members.fetch(muteDurationSort[0].UserId)).user.username,
      deafSort: (await members.fetch(deafSort[0].UserId)).user.username,
      deafDurationSort: (await members.fetch(deafDurationSort[0].UserId)).user.username,
      afkSort: (await members.fetch(afkSort[0].UserId)).user.username,
      afkDurationSort: (await members.fetch(afkDurationSort[0].UserId)).user.username,
      activeSort: (await members.fetch(activeSort[0].UserId)).user.username,
    }

    const embed = {
      color: 0xfacd3b,
      title: "Bar of Mute Leaderboard",
      url: "https://discord.js.org",
      author: {
        name: author.username || "Automatic Daily Message",
        icon_url: author.avatarURL || "https://cdn.discordapp.com/avatars/676537397311307777/dd60510041b8e9175d7a38d2cd6a3a94.webp?size=128",
      },
      description: [
        `• ${usersNonCached.quietestSort} is the quietest person with a total mute & deafen time of ${humanizeDuration(this.round1000(quietestSort[0].SelfMute + quietestSort[0].ServerMute + quietestSort[0].SelfDeaf + quietestSort[0].ServerDeaf))}`,
        `• ${usersNonCached.muteSort} has muted for the longest at ${humanizeDuration(this.round1000(muteSort[0].SelfMute + muteSort[0].ServerMute))}`,
        `• ${usersNonCached.muteDurationSort} has muted for the longest in one session at ${humanizeDuration(this.round1000(muteDurationSort[0].SelfMuteMax))}`,
        `• ${usersNonCached.deafSort} has deafened for the longest at ${humanizeDuration(this.round1000(deafSort[0].SelfDeaf + deafSort[0].ServerDeaf))}`,
        `• ${usersNonCached.deafDurationSort} has deafened for the longest in one session at ${humanizeDuration(this.round1000(deafDurationSort[0].SelfDeafMax))}`,
        `• ${usersNonCached.afkSort} has afk'd for the longest at ${humanizeDuration(this.round1000(afkSort[0].Afk))}`,
        `• ${usersNonCached.afkDurationSort} has afk'd for the longest in one session at ${humanizeDuration(this.round1000(afkDurationSort[0].AfkMax))}`,
        `• ${usersNonCached.activeSort} has been active for the longest at ${humanizeDuration(this.round1000(activeSort[0].Active))}`,
      ].join("\n"),
      fields,
      footer: {
        text: config.discord.footer,
        icon_url: config.discord.authorAvatarUrl,
      },
    }

    return embed
  }

  round1000 (num) {
    if (num < 1000) {
      return Math.ceil(num / 100) * 100
    }

    return Math.round(num / 1000) * 1000
  }

  static applyToClass (structure) {
    for (const prop of Object.getOwnPropertyNames(VoiceTracker.prototype).slice(1)) {
      Object.defineProperty(structure.prototype, prop, Object.getOwnPropertyDescriptor(VoiceTracker.prototype, prop))
    }
  }
}

module.exports = VoiceTracker