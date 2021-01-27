const { throttle } = require("lodash")
const Track = require("./Track")
const radios = require("../radios.json")
const Requestee = require("./Requestee")

module.exports = class MusicState {
  constructor (guild, initialState) {
    this.guild = guild
    this.state = initialState

    let count = 0
    this.saveState = throttle(state => {
      const t = process.hrtime()
      guild.client.db.saveMusicState(guild.id, JSON.stringify(this.reduceState(state)))
      const t2 = process.hrtime(t)

      if (count++ % 100 === 0) {
        console.log(`Serialising & saving state took ${t2[0] + (t2[1] / 1e9)}s`)
      }
    }, 5000, { leading: false })

    guild.client.once("ready", () => {
      this.loadState()
    })
  }

  setState (state) {
    const newState = typeof state === "function" ? state(this.state) : { ...this.state, ...state }
    this.state = newState
    this.saveState(newState)
  }

  reduceState (state) {
    const { voiceChannel, messagePump, queue, pauser, bassBoost, tempo, volume, repeat, summoned, embedId } = state

    return {
      serverId: this.guild.id,
      voiceChannelId: (voiceChannel || {}).id,
      textChannelId: messagePump.textChannel.id,
      queue: queue.map(item => ({
        artists: item.artists,
        title: item.title,
        requestee: item.requestee.id,
        link: item.link,
        platform: item.platform,
        query: item.query,
        youTubeTitle: item.youTubeTitle,
        youTubeLink: item.youTubeLink,
        duration: item.duration,
        radio: (item.radio || {}).name,
        time: Math.floor(item.startTime / 1000),
        youTubeId: item.youTubeId,
        isTracked: item.tracked,
        listenTime: Math.ceil(item.listenTime / 1000),
      })),
      pauserId: pauser,
      bassGain: bassBoost,
      tempo,
      volume,
      repeat,
      isSummoned: summoned,
      embedId,
    }
  }

  loadState () {
    const jsonState = this.guild.client.db.getMusicState(this.guild.id)
    if (!jsonState) {
      return
    }

    const state = JSON.parse(jsonState.state)

    this.state.messagePump.setChannel(this.guild.channels.cache.get(state.textChannelId))

    this.state = {
      ...this.state,
      voiceChannel: this.guild.channels.cache.get(state.voiceChannelId),
      textChannel: this.guild.channels.cache.get(state.textChannelId),
      queue: state.queue.map(item => new Track()
        .setArtists(item.artists)
        .setTitle(item.title)
        // .setRequestee(new Requestee(this.guild.members.cache.get(item.requestee).displayName, this.guild.members.cache.get(item.requestee).user.displayAvatarURL(), item.requestee))
        .setRequestee(new Requestee("", "", item.requestee))
        .setLink(item.link)
        .setPlatform(item.platform)
        .setQuery(item.query)
        .setYouTubeTitle(item.youTubeTitle)
        .setYouTubeLink(item.youTubeLink)
        .setDuration(item.duration)
        // Change to store id of radio instead
        .setRadio(Object.values(radios).find(r => r.name === item.radio))
        .setStartTime(item.time * 1000)
        .setYouTubeId(item.youTubeId)
        .setTracked(item.isTracked)
        .setListenTime((item.listenTime || 0) * 1000),
      ),
      pauser: state.pauserId,
      bassBoost: state.bassGain,
      tempo: state.tempo,
      volume: state.volume,
      repeat: state.repeat,
      summoned: state.isSummoned,
      embedId: state.embedId,
    }
  }
}