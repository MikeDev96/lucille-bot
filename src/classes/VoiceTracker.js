import humanizeDuration from "humanize-duration"
// import VoiceStateAdapter from "./VoiceStateAdapter.js"
import LucilleClient from "./LucilleClient.js"
import { Events } from "discord.js"

class VoiceTracker {
  constructor (client) {
    this.client = client
    this.monitor = {}
    this.trackingFields = ["selfMute", "selfDeaf", "serverMute", "serverDeaf"]
    this.initClient()
  }

  initClient () {
    this.client.once(Events.ClientReady, this.initiateMonitor.bind(this))
    this.client.on(Events.VoiceStateUpdate, this.voiceStateUpdate.bind(this))
    this.initSpeechTracking()
  }

  initiateMonitor () {
    const curTime = new Date().getTime()

    this.client.guilds.cache.forEach(serverId => {
      if (serverId.voiceStates.cache) {
        serverId.voiceStates.cache.forEach(activePeep => {
          if (activePeep.channelId === activePeep.guild.afkChannelId) {
            this.monitor = { ...this.monitor, [activePeep.id]: { afk: curTime, serverId: activePeep.guild.id } }
          }
          else if (this.checkIfActive(activePeep, this.trackingFields)) {
            this.monitor = { ...this.monitor, [activePeep.id]: { active: curTime, serverId: activePeep.guild.id } }
          }
          else {
            if (!(activePeep.id in this.monitor)) {
              this.monitor[activePeep.id] = { serverId: activePeep.guild.id }
            }
            const mon = this.monitor[activePeep.id]
            this.trackingFields.forEach(k => {
              if (activePeep[k]) {
                mon[k] = curTime
              }
            })
          }
        })
      }
    })

    this.periodicallySave()
  }

  periodicallySave () {
    setInterval(() => {
      const curTime = new Date().getTime()
      const users = Object.entries(this.monitor)

      for (const [userId, { serverId, active }] of users) {
        if (active) {
          const newTime = curTime - active
          LucilleClient.Instance.db.voice.updateActiveTimeForUser(serverId, userId, newTime)

          this.monitor[userId].active = curTime
        }
      }
    }, 5 * 60 * 1e3)
  }

  async voiceStateUpdate (oldMember, newMember) {
    if (!(oldMember.id in this.monitor)) {
      this.monitor[oldMember.id] = { serverId: oldMember.guild.id }
    }
    else if (oldMember.guild.id !== this.monitor[oldMember.id].serverId) {
      this.monitor[oldMember.id].serverId = oldMember.guild.id
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

    // User joined the voice channel
    if (oldMember.channelId === null && newMember.channelId !== null) {
      // User joined in AFK
      if (newMember.channelId === oldMember.guild.afkChannelId) {
        mon.afk = curTime
      }
      // User joined in another channel
      else {
        if (this.checkIfActive(newMember, this.trackingFields)) {
          mon.active = curTime
        }
        else if (mon.active > 0) {
          const duration = curTime - mon.active
          delete mon.active
          changes.active = duration
        }

        this.trackingFields.forEach(k => {
          if (newMember[k]) {
            mon[k] = curTime
          }
        })
      }
    }
    // User left the voice channel
    else if (oldMember.channelId !== null && newMember.channelId === null) {
      // User left AFK
      if (oldMember.channelId === oldMember.guild.afkChannelId) {
        if ("afk" in mon) {
          const duration = curTime - mon.afk
          delete mon.afk
          changes.afk = duration
        }
      }
      // User left another voice channel
      else {
        if (mon.active > 0) {
          const duration = curTime - mon.active
          delete mon.active
          changes.active = duration
        }
        this.trackingFields.forEach(k => {
          if (k in mon) {
            const duration = curTime - mon[k]
            delete mon[k]
            changes[k] = duration
          }
        })
      }
    }
    // User moved voice channel
    else if (oldMember.channelId !== null && newMember.channelId !== null && oldMember.channelId !== newMember.channelId) {
      // Moved from AFK
      if (oldMember.channelId === oldMember.guild.afkChannelId) {
        if ("afk" in mon) {
          const duration = curTime - mon.afk
          delete mon.afk
          changes.afk = duration
        }
        if (this.checkIfActive(newMember, this.trackingFields)) {
          mon.active = curTime
        }
        else if (mon.active > 0) {
          const duration = curTime - mon.active
          delete mon.active
          changes.active = duration
        }

        // User is no longer in AFK, start tracking other fields again
        this.trackingFields.forEach(k => {
          if (newMember[k]) {
            mon[k] = curTime
          }
        })
      }
      // Moved to AFK
      else if (newMember.channelId === oldMember.guild.afkChannelId) {
        mon.afk = curTime
        if (mon.active > 0) {
          const duration = curTime - mon.active
          delete mon.active
          changes.active = duration
        }

        // User is in AFK now, stop tracking other stats
        this.trackingFields.forEach(k => {
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
      if (newMember.channelId !== newMember.guild.afkChannelId) {
        if (this.checkIfActive(newMember, this.trackingFields)) {
          mon.active = curTime
        }
        else if (mon.active > 0) {
          const duration = curTime - mon.active
          delete mon.active
          changes.active = duration
        }

        this.trackingFields.forEach(k => {
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

      LucilleClient.Instance.db.voice.updateVoiceStatsForUser(serverId, userId, changes)
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

  async updateStatus (serverId, msg, status, userId) {
    try {
      if (status === "off") {
        LucilleClient.Instance.db.voice.disableVoiceStatsForUser(serverId, userId)
      }
      else {
        const response = LucilleClient.Instance.db.voice.getStatusForUser(serverId, userId)

        if (response === "off") {
          LucilleClient.Instance.db.voice.enableVoiceStatsForUser(serverId, userId)
        }
      }

      LucilleClient.Instance.db.voice.updateStatus(serverId, userId, status)
      msg.reply(`Your status has been updated to ${status}`)
    }
    catch (error) {
      console.log(error)
      msg.reply("Unable to update status")
    }
  }

  async getLeaderboard (serverId, author = {}, members = {}) {
    const currentServer = this.client.guilds.cache.get(serverId)
    const server = LucilleClient.Instance.db.voice.getVoiceStatsForServer(serverId)
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
    const speakingSort = [...keys]
    const speakingMaxSort = [...keys]

    muteSort.sort((aValue, bValue) => bValue.SelfMute + bValue.ServerMute - aValue.SelfMute + aValue.ServerMute)
    muteDurationSort.sort((aValue, bValue) => (bValue.SelfMuteMax || 0) - (aValue.SelfMuteMax || 0))
    deafSort.sort((aValue, bValue) => bValue.SelfDeaf + bValue.ServerDeaf - aValue.SelfDeaf + aValue.ServerDeaf)
    deafDurationSort.sort((aValue, bValue) => (bValue.SelfDeafMax || 0) - (aValue.SelfDeafMax || 0))
    quietestSort.sort((aValue, bValue) => bValue.SelfMute + bValue.ServerMute + bValue.SelfDeaf + bValue.ServerDeaf + bValue.Afk - (aValue.SelfMute + aValue.ServerMute + aValue.SelfDeaf + aValue.ServerDeaf + (aValue.Afk || 0)))
    afkSort.sort((aValue, bValue) => (bValue.Afk || 0) - (aValue.Afk || 0))
    afkDurationSort.sort((aValue, bValue) => (bValue.AfkMax || 0) - (aValue.AfkMax || 0))
    activeSort.sort((aValue, bValue) => (bValue.Active || 0) - (aValue.Active || 0))
    speakingSort.sort((aValue, bValue) => bValue.Speaking - aValue.Speaking)
    speakingMaxSort.sort((aValue, bValue) => bValue.SpeakingMax - aValue.SpeakingMax)

    const fields = [
      ["Quiet", quietestSort, data => data.SelfMute + data.ServerMute + data.SelfDeaf + data.ServerDeaf + (data.Afk || 0)],
      ["Mute", muteSort, data => data.SelfMute + data.ServerMute],
      ["Mute ⏲️", muteDurationSort, data => data.SelfMuteMax],
      ["Deaf", deafSort, data => data.SelfDeaf + data.ServerDeaf],
      ["Deaf ⏲️", deafDurationSort, data => data.SelfDeafMax],
      ["AFK", afkSort, data => data.Afk],
      ["AFK ⏲️", afkDurationSort, data => data.AfkMax],
      ["Active", activeSort, data => data.Active],
      ["Speaking", speakingSort, data => data.Speaking],
      ["Speaking ⏲️", speakingMaxSort, data => data.SpeakingMax],
    ].reduce((acc, [header, data, getValue]) => {
      const rows = []
      for (let i = 0; i < Math.min(keys.length, 3); i++) {
        rows.push(`:${["one", "two", "three"][i]}: **${currentServer.members.cache.get(data[i].UserId).user.username}**\n${"\u00a0".repeat(9)}${shortEnglishHumanizer(this.round1000(getValue(data[i])), { spacer: "" })}`)
      }
      acc.push({
        name: header,
        value: rows.join("\n"),
        inline: true,
      })
      return acc
    }, [])

    fields.push({
      name: "\u200b",
      value: "\u200b",
      inline: true,
    })

    fields.push({
      name: "\u200b",
      value: "\u200b",
      inline: true,
    })

    const usersNonCached = {
      quietestSort: (await members.fetch(quietestSort[0].UserId)).user.username,
      muteSort: (await members.fetch(muteSort[0].UserId)).user.username,
      muteDurationSort: (await members.fetch(muteDurationSort[0].UserId)).user.username,
      deafSort: (await members.fetch(deafSort[0].UserId)).user.username,
      deafDurationSort: (await members.fetch(deafDurationSort[0].UserId)).user.username,
      afkSort: (await members.fetch(afkSort[0].UserId)).user.username,
      afkDurationSort: (await members.fetch(afkDurationSort[0].UserId)).user.username,
      activeSort: (await members.fetch(activeSort[0].UserId)).user.username,
      speakingSort: (await members.fetch(speakingSort[0].UserId)).user.username,
      speakingMaxSort: (await members.fetch(speakingMaxSort[0].UserId)).user.username,
    }

    const embed = {
      color: 0xfacd3b,
      title: "Bar of Mute Leaderboard",
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
        `• ${usersNonCached.speakingSort} has spoken the most at ${humanizeDuration(this.round1000(speakingSort[0].Speaking))}`,
        `• ${usersNonCached.speakingMaxSort} has spoken for the longest time at ${humanizeDuration(this.round1000(speakingMaxSort[0].SpeakingMax))}`,
      ].join("\n"),
      fields,
      footer: {
        text: process.env.DISCORD_FOOTER,
        icon_url: process.env.DISCORD_AUTHORAVATARURL,
      },
    }

    return embed
  }

  getIndividualUser (serverId, userId, statType) {
    let response
    if (userId) {
      response = LucilleClient.Instance.db.voice.getVoiceStatForUser(serverId, userId, statType)
    }
    else {
      response = LucilleClient.Instance.db.voice.getVoiceStatForServer(serverId, statType)
    }
    if (!response.length) {
      response = [{ [statType]: 0, UserId: "None", Status: null }]
    }

    return response
  }

  getStatus (serverId, userId) {
    return LucilleClient.Instance.db.voice.getStatusForUser(serverId, userId)
  }

  round1000 (num) {
    if (num < 1000) {
      return Math.ceil(num / 100) * 100
    }

    return Math.round(num / 1000) * 1000
  }

  initSpeechTracking () {
    // const vsa = new VoiceStateAdapter(this.client)
    // const monitor = new Map()

    // const joinCallback = ({ voiceState }) => {
    //   if (voiceState.id === this.client.user.id) {
    //     const guildId = voiceState.guild.id
    //     voiceState.connection.on("speaking", (user, speaking) => {
    //       if (user.bot) return

    //       if (speaking.has(Speaking.FLAGS.SPEAKING)) {
    //         monitor.set(user.id, Date.now())
    //       }
    //       else {
    //         if (monitor.has(user.id)) {
    //           const duration = Date.now() - monitor.get(user.id)
    //           monitor.delete(user.id)

    //           this.updateSpeech(guildId, user.id, duration)
    //         }
    //       }
    //     })
    //   }
    // }

    // vsa.on("join", joinCallback.bind(this))
    // vsa.on("move", joinCallback.bind(this))
  }

  updateSpeech (guild, user, duration) {
    LucilleClient.Instance.db.voice.updateSpeech(guild, user, duration)
  }
}

const shortEnglishHumanizer = humanizeDuration.humanizer({
  language: "shortEn",
  languages: {
    shortEn: {
      y: () => "y",
      mo: () => "mo",
      w: () => "w",
      d: () => "d",
      h: () => "h",
      m: () => "m",
      s: () => "s",
      ms: () => "ms",
    },
  },
})

export default VoiceTracker