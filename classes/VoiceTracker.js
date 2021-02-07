const low = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")
const humanizeDuration = require("humanize-duration")
const config = require("../config.json")
const fs = require("fs")

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

    this.migrateVoiceStats()
  }

  migrateVoiceStats () {
    if (fs.existsSync("db.json")) {
      const adapter = new FileSync("db.json")
      const db = low(adapter)
      const servers = db.get("servers").value()

      Object.entries(servers).forEach(([serverId, server]) => {
        Object.entries(server.users).forEach(([userId, user]) => {
          this.run("INSERT INTO VoiceStats (ServerId, UserId, SelfMute, SelfDeaf, ServerMute, ServerDeaf, Afk, SelfMuteMax, SelfDeafMax, AfkMax) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", serverId, userId, user.selfMute, user.selfDeaf, user.serverMute, user.serverDeaf, user.afk, user.selfMuteMax, user.selfDeafMax, user.afkMax)
        })
      })

      fs.renameSync("db.json", "db.json.bak")
    }
  }

  initClient () {
    this.client.once("ready", () => {
      setInterval(() => {
        const d = new Date()
        if (d.getHours() === 19 && d.getMinutes() === 0) {
          const servers = Object.keys(this.db.get("servers").value())

          servers.forEach(serverId => {
            const server = this.client.guilds.cache.find(guild => guild.id === serverId)
            if (server && server.systemChannel) {
              const leaderboard = this.getLeaderboard(serverId)

              if (leaderboard) {
                server.systemChannel.send({
                  embed: leaderboard,
                }).then(msg => msg.react("🔄"))
              }
            }
          })
        }
      }, 60000)
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

    if (changes.selfMute > 0 || changes.selfDeaf > 0 || changes.serverMute > 0 || changes.serverDeaf > 0 || changes.afk > 0 || changes.selfMuteMax > 0 || changes.selfDeafMax > 0 || changes.afkMax > 0) {
      const serverId = oldMember.guild.id
      const userId = oldMember.id

      this.client.db.run(`
        INSERT INTO VoiceStats VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ServerId, UserId) DO UPDATE
        SET
          SelfMute = SelfMute + ?,
          SelfDeaf = SelfDeaf + ?,
          ServerMute = ServerMute + ?,
          ServerDeaf = ServerDeaf + ?,
          Afk = Afk + ?,
          SelfMuteMax = CASE WHEN SelfMute + ? > SelfMuteMax THEN SelfMute + ? ELSE SelfMuteMax END,
          SelfDeafMax = CASE WHEN SelfDeaf + ? > SelfDeafMax THEN SelfDeaf + ? ELSE SelfDeafMax END,
          AfkMax = CASE WHEN Afk + ? > AfkMax THEN Afk + ? ELSE AfkMax END
        WHERE ServerId = ?
          AND UserId = ?
      `, serverId, userId, changes.selfMute, changes.selfDeaf, changes.serverMute, changes.serverDeaf, changes.afk, changes.selfMute, changes.selfDeaf, changes.afk,
      changes.selfMute, changes.selfDeaf, changes.serverMute, changes.serverDeaf, changes.afk, changes.selfMute, changes.selfMute, changes.selfDeaf, changes.selfDeaf, changes.afk, changes.afk, serverId, userId)
    }
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

  getLeaderboard (serverId, author = {}) {
    const server = this.db.get("servers." + serverId).value()
    if (!server) {
      return false
    }

    const keys = Object.entries(server.users)
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

    muteSort.sort(([aKey, aValue], [bKey, bValue]) => bValue.selfMute + bValue.serverMute - aValue.selfMute + aValue.serverMute)
    muteDurationSort.sort(([aKey, aValue], [bKey, bValue]) => (bValue.selfMuteMax || 0) - (aValue.selfMuteMax || 0))
    deafSort.sort(([aKey, aValue], [bKey, bValue]) => bValue.selfDeaf + bValue.serverDeaf - aValue.selfDeaf + aValue.serverDeaf)
    deafDurationSort.sort(([aKey, aValue], [bKey, bValue]) => (bValue.selfDeafMax || 0) - (aValue.selfDeafMax || 0))
    quietestSort.sort(([aKey, aValue], [bKey, bValue]) => bValue.selfMute + bValue.serverMute + bValue.selfDeaf + bValue.serverDeaf + bValue.afk - (aValue.selfMute + aValue.serverMute + aValue.selfDeaf + aValue.serverDeaf + (aValue.afk || 0)))
    afkSort.sort(([aKey, aValue], [bKey, bValue]) => (bValue.afk || 0) - (aValue.afk || 0))
    afkDurationSort.sort(([aKey, aValue], [bKey, bValue]) => (bValue.afkMax || 0) - (aValue.afkMax || 0))

    const fields = [
      ["Quiet", quietestSort, data => data.selfMute + data.serverMute + data.selfDeaf + data.serverDeaf + (data.afk || 0)],
      ["Mute", muteSort, data => data.selfMute + data.serverMute],
      ["Mute ⏲️", muteDurationSort, data => data.selfMuteMax],
      ["Deaf", deafSort, data => data.selfDeaf + data.serverDeaf],
      ["Deaf ⏲️", deafDurationSort, data => data.selfDeafMax],
      ["AFK", afkSort, data => data.afk],
      ["AFK ⏲️", afkDurationSort, data => data.afkMax],
    ].reduce((acc, [header, data, getValue]) => {
      for (let i = 0; i < Math.min(keys.length, 3); i++) {
        acc.push({
          name: ":" + ["one", "two", "three"][i] + ": " + header,
          value: "**[" + this.db.get("users." + data[i][0]).value() + "]** " + humanizeDuration(this.round1000(getValue(data[i][1]))),
          inline: true,
        })
      }

      return acc
    }, [])

    const embed = {
      color: 0xfacd3b,
      title: "Bar of Mute Leaderboard",
      url: "https://discord.js.org",
      author: {
        name: author.username || "Automatic Daily Message",
        icon_url: author.avatarURL || "https://cdn.discordapp.com/avatars/676537397311307777/dd60510041b8e9175d7a38d2cd6a3a94.webp?size=128",
      },
      description: [
        `• ${this.db.get("users." + quietestSort[0][0]).value()} is the quietest person with a total mute & deafen time of ${humanizeDuration(this.round1000(quietestSort[0][1].selfMute + quietestSort[0][1].serverMute + quietestSort[0][1].selfDeaf + quietestSort[0][1].serverDeaf))}`,
        `• ${this.db.get("users." + muteSort[0][0]).value()} has muted for the longest at ${humanizeDuration(this.round1000(muteSort[0][1].selfMute + muteSort[0][1].serverMute))}`,
        `• ${this.db.get("users." + muteDurationSort[0][0]).value()} has muted for the longest in one session at ${humanizeDuration(this.round1000(muteDurationSort[0][1].selfMuteMax))}`,
        `• ${this.db.get("users." + deafSort[0][0]).value()} has deafened for the longest at ${humanizeDuration(this.round1000(deafSort[0][1].selfDeaf + deafSort[0][1].serverDeaf))}`,
        `• ${this.db.get("users." + deafDurationSort[0][0]).value()} has deafened for the longest in one session at ${humanizeDuration(this.round1000(deafDurationSort[0][1].selfDeafMax))}`,
        `• ${this.db.get("users." + afkSort[0][0]).value()} has afk'd for the longest at ${humanizeDuration(this.round1000(afkSort[0][1].afk))}`,
        `• ${this.db.get("users." + afkDurationSort[0][0]).value()} has afk'd for the longest in one session at ${humanizeDuration(this.round1000(afkDurationSort[0][1].afkMax))}`,
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