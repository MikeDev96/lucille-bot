const { Util } = require("discord.js")
const config = require("../config.json")
const TopMostMessagePump = require("./TopMostMessagePump")
const { safeJoin, msToTimestamp, selectRandom, escapeMarkdown } = require("../helpers")
const TrackExtractor = require("./TrackExtractor")
const { PLATFORM_YOUTUBE, PLATFORM_RADIO, PLATFORM_SPOTIFY, PLATFORM_TIDAL, PLATFORM_APPLE } = require("./TrackExtractor")
const Track = require("./Track")
const fs = require("fs")
const { RadioMetadata } = require("./RadioMetadata")
const axios = require("axios")
const MusicToX = require("./MusicToX")
const debounce = require("lodash.debounce")
const RadioAdBlock = require("./RadioAdBlock")
const { searchYouTube } = require("../worker/bindings")
const { getStream, getFfmpegStream } = require("./YouTubeToStream")
const MusicState = require("./MusicState")

const PLATFORMS_REQUIRE_YT_SEARCH = [PLATFORM_SPOTIFY, PLATFORM_TIDAL, PLATFORM_APPLE, PLATFORM_YOUTUBE, "search"]

module.exports = class Music extends MusicState {
  constructor (guild) {
    super(guild, {
      joinState: 0,
      voiceChannel: null,
      textChannel: guild.systemChannel,
      voiceConnection: null,
      queue: [],
      pauser: "",
      messagePump: new TopMostMessagePump().on("create", msg => this.setState({ embedId: msg.id })),
      bassBoost: 0,
      tempo: 1,
      volume: 100,
      progressHandle: null,
      playCount: 0,
      repeat: "off",
      radioAdBlock: new RadioAdBlock(),
      summoned: false,
      embedId: "",
    })

    this.guild = guild
    this.client = guild.client

    this.listenTimeHandle = null
    this.streamTimeCache = 0

    // Move the embed down every 5 minutes, it can get lost when a radio is left on for ages
    this.debouncer = debounce(this.updateEmbed, 5 * 60 * 1000)

    this.state.radioAdBlock.on("volume", volume => {
      this.setVolume(volume, true)
    })

    guild.client.once("ready", async () => {
      // If an embed exists from the previous instance, delete it
      if (this.state.embedId && this.state.textChannel) {
        try {
          const msg = await this.state.textChannel.messages.fetch(this.state.embedId)
          if (msg) {
            msg.delete()
          }
        }
        catch (err) {
          console.log(err.message)
        }
      }

      // Useful for testing, boots the bot out of the channel on start up
      if (guild.voice) {
        await guild.voice.setChannel(null)
      }

      if (this.state.summoned && this.state.voiceChannel) {
        await this.summon(this.state.voiceChannel)

        if (this.state.joinState === 2) {
          await this.play()
        }
      }
    })
  }

  async summon (voiceChannel) {
    this.setState({ summoned: true })

    // Join the voice channel if not already joining/joined
    if (this.state.joinState === 0) {
      this.setState({ joinState: 1 })

      try {
        const connection = await voiceChannel.join()

        this.setState({
          joinState: 2,
          voiceChannel: voiceChannel,
          voiceConnection: connection,
          playCount: 0,
        })

        this.state.voiceConnection.once("disconnect", () => {
          this.setState({
            queue: this.state.queue.splice(0, this.state.queue.length),
            summoned: false,
            voiceConnection: null,
            voiceChannel: null,
            joinState: 0,
          })
          this.cleanUp()
        })
      }
      catch (err) {
        this.setState({ joinState: 0 })
        console.log(err.message)
      }
    }
    else if (this.state.joinState === 2) {
      if (this.state.voiceConnection && this.state.voiceConnection.voice) {
        await this.state.voiceConnection.voice.setChannel(voiceChannel)
        this.setState({ voiceChannel })
      }
    }
  }

  async add (input, requestee, voiceChannel, jump, textChannel) {
    let tracks = []

    if (typeof input === "string") {
      const trackExtractor = new TrackExtractor(input)

      if (trackExtractor.parseLinks()) {
        const links = await trackExtractor.getAllLinkInfo()

        tracks = links.map(l => l.setRequestee(requestee).setQuery(`official audio lyrics ${l.artists} ${l.title}`))
      }
      else {
        const track = new Track()
          .setRequestee(requestee)
          .setPlatform("search")
          .setQuery(input)

        const searchResult = await this.search(track)
        if (searchResult) {
          tracks = [track]
        }
        else {
          return false
        }
      }
    }
    else if (Array.isArray(input) && input.every(i => i instanceof Track)) {
      tracks.push(...input.map(i => i.setRequestee(requestee)))
    }

    if (!tracks.length) {
      return false
    }

    if (!this.state.queue.length) {
      this.state.messagePump.setChannel(textChannel)
    }

    const wasRadio = this.state.queue[0] && this.state.queue[0].platform === PLATFORM_RADIO
    const queueTracks = this.state.queue.filter(t => t.platform !== PLATFORM_RADIO)
    const queueRadios = this.state.queue.filter(t => t.platform === PLATFORM_RADIO)
    const newTracks = tracks.filter(t => t.platform !== PLATFORM_RADIO)
    const newRadios = tracks.filter(t => t.platform === PLATFORM_RADIO)

    // If the queue is empty, i.e. only a radio playing then happily handles inserting at 1 in an empty array.
    queueTracks.splice(jump ? 1 : queueTracks.length, 0, ...newTracks)

    const radios = newRadios.concat(queueRadios)
    if (radios.length) {
      queueTracks.push(radios[0])
    }

    this.setState({ queue: queueTracks })

    if (this.state.queue.length > 0) {
      // Join the voice channel if not already joining/joined
      if (this.state.joinState === 0) {
        await this.summon(voiceChannel)
      }

      // If there's nothing playing, get the ball rolling
      const notStreaming = this.guild.voice && this.guild.voice.connection && !this.guild.voice.connection.dispatcher
      if (notStreaming || wasRadio) {
        await this.searchAndPlay()
      }
      else {
        this.updateEmbed()
      }
    }

    return true
  }

  async search (item) {
    console.log(`Started search for ${item.query}`)
    const searchResult = (await searchYouTube(encodeURIComponent(item.query)))[0]
    console.log(`Finished search for ${item.query} - ${searchResult && searchResult.id}`)

    if (searchResult) {
      item
        .setYouTubeTitle(searchResult.title)
        .setThumbnail(searchResult.thumbnail)
        .setLink(`https://www.youtube.com/watch?v=${searchResult.id}`)
        .setYouTubeId(searchResult.id)
        .setDuration(searchResult.duration)

      return item
    }

    return false
  }

  async searchAndPlay () {
    const item = this.state.queue[0]

    if (item.link) {
      await this.play()
      await this.presearchNextItem()
    }
    else {
      const searchResult = await this.search(item)
      if (searchResult) {
        await this.play()
        await this.presearchNextItem()
      }
      else {
        this.state.textChannel.send(`:x: Failed to find a YouTube video for \`${item.query}\``)
        console.log(`Couldn't find a video for: ${item.query}`)
      }
    }
  }

  async presearchNextItem () {
    const nextItem = this.state.queue[1]
    if (nextItem && !nextItem.link) {
      console.log(`Started presearch`)
      await this.search(nextItem)
      console.log("Finished presearch")
    }
  }

  async play (update = "before") {
    if (!this.state.queue.length) {
      return
    }

    const item = this.state.queue[0]

    // Fixes a song resuming from its paused state if its bass boost status is updated
    if (update === "after" && this.state.pauser !== "") {
      this.updateEmbed()
      return
    }

    if (update === "before") {
      this.updateEmbed()
    }

    if (this.state.playCount === 0) {
      try {
        await this.connectSound()
      }
      catch (err) {
        console.log("Failed to play connect sound")
        console.log(err)
      }
    }

    const stream = await this.getMediaStream(item)
    if (!stream) {
      return
    }

    this.stream = stream
    this.setState({ playCount: this.state.playCount + 1 })

    // Using on readable makes the transition smoother when restarting the stream.
    // i.e. when changing the bass boost
    // TODO: Handle the error event
    stream.once("readable", () => {
      const dispatcher = this.state.voiceConnection.play(stream, { type: "opus" })
      dispatcher.setVolumeLogarithmic(this.state.volume / 100)

      dispatcher.on("start", () => {
        // Fixes a song resuming from its paused state if a TTS message is played
        if (update === "resume" && this.state.pauser !== "") {
          this.dispatcherExec(d => d.pause())
          this.updateEmbed()
        }
        else {
          console.log("Stream starting...")
          this.cleanProgress()

          if (item.duration > 0) {
            this.streamTimeCache = 0
            this.setState({
              progressHandle: setInterval(() => {
                this.syncTime()
                this.setState({ queue: this.state.queue })
                this.updateEmbed(true)
              }, 5000),
            })
          }

          this.startRadioMetadata(item)
          this.startListenTracking(item)
        }
      })

      // This only fires when a stream finishes or is forcibly ended
      // Commands like bass boost which just restart the stream will not fire this event
      // so make sure to clean up properly!
      dispatcher.on("finish", async () => {
        console.log("Stream finished...")

        item.setFinished()
        this.updateEmbed(true)
        await this.processQueue()
      })

      // Discord.js doesn't destroy streams that have been passed in
      // So detect when the opus encoder has been closed and destroy our stream
      dispatcher.streams.opus.once("close", () => {
        stream.destroy()
        console.log("Cleaned up underlying stream")

        this.cleanProgress()
        this.endRadioMetadata(item)
        this.endListenTracking(item)
      })

      dispatcher.on("error", err => {
        console.log(err)
      })

      if (update === "after") {
        this.updateEmbed()
      }
    })
  }

  async getMediaStream (item) {
    if (PLATFORMS_REQUIRE_YT_SEARCH.includes(item.platform)) {
      try {
        return await getStream(item.link, { startTime: item.startTime, filters: this.getAudioFilters() })
      }
      catch (err) {
        this.state.textChannel.send(`:x: Failed to get a YouTube stream for\n${this.getTrackTitle(item)}\n${item.link}\n${err.message}`)
        await this.processQueue()
        return
      }
    }
    else if (item.platform === PLATFORM_RADIO) {
      if (item.radio.metadata && item.radio.metadata.type === "sse") {
        try {
          const res = await axios({
            method: "GET",
            url: item.link,
            responseType: "stream",
          })

          item.setRequestStream(res)

          return getFfmpegStream(res.data, { startTime: 0, filters: this.getAudioFilters() })
        }
        catch (err) {
          console.log("Error occured when getting radio stream")
          console.log(err)
        }
      }
    }

    return getFfmpegStream(item.link, { startTime: 0, filters: this.getAudioFilters() })
  }

  syncTime (ms = 0) {
    const deltaTime = (this.dispatcherExec(d => d.streamTime) || 0) - this.streamTimeCache
    const item = this.state.queue[0]
    if (item) {
      const newStartTime = item.startTime + deltaTime + ms
      const newListenTime = item.listenTime + deltaTime

      item.setStartTime(newStartTime)
        .setListenTime(newListenTime)

      // console.log(`Set time to ${newStartTime}, set listen time to ${newListenTime}, delta: ${deltaTime}`)
    }

    this.streamTimeCache += deltaTime
  }

  startListenTracking (item) {
    this.endListenTracking(item)

    this.streamTimeCache = 0

    if (item.duration > 0 && item.youTubeId && item.youTubeTitle) {
      const listenTimeRemaining = (item.duration * 1000 * 0.9) - item.listenTime

      this.listenTimeHandle = setTimeout(() => {
        console.log(`[LISTEN TRACKING] Tracked: ${item.youTubeTitle}`)
        item.setTracked(true)
        this.client.db.saveYouTubeVideo(item.youTubeId, item.youTubeTitle)
        this.client.db.insertYouTubeHistory(item.youTubeId, item.requestee.id, this.guild.id)
      }, listenTimeRemaining)

      console.log(`[LISTEN TRACKING] Started tracking for: ${item.youTubeTitle} - ${(listenTimeRemaining / 1000).toFixed(2)}s remaining...`)
    }
  }

  endListenTracking (item) {
    if (this.listenTimeHandle) {
      clearTimeout(this.listenTimeHandle)
      this.listenTimeHandle = null
      this.streamTimeCache = 0
      console.log(`[LISTEN TRACKING] Ended tracking for: ${item.youTubeTitle}`)
    }
  }

  getAudioFilters () {
    return { gain: this.state.bassBoost, tempo: this.state.tempo }
  }

  async processQueue () {
    if (this.state.repeat === "all") {
      if (this.state.queue.length > 0) {
        this.state.queue.push(this.state.queue.shift())
        this.setState({ queue: this.state.queue })
      }
    }
    else if (this.state.repeat === "off") {
      this.state.queue.shift()
      this.setState({ queue: this.state.queue })
    }

    if (this.state.queue.length < 1) {
      this.disconnectSound()
    }
    else {
      await this.searchAndPlay()
    }
  }

  setRepeat (type) {
    this.setState({ repeat: type })
    this.updateEmbed()
  }

  setVolume (volume, isRadioAdBlock = false) {
    this.setState({ volume })
    this.dispatcherExec(d => d.setVolumeLogarithmic(volume / 100))
    this.updateEmbed()

    if (!isRadioAdBlock) {
      this.state.radioAdBlock.setVolume(volume)
    }
  }

  connectSound () {
    return new Promise((resolve, reject) => {
      const path = "assets/sounds/connect"
      const sounds = fs.existsSync(path) && fs.readdirSync(path)
      if (sounds && !sounds.length) {
        resolve()
      }
      else {
        const dispatcher = this.state.voiceConnection.play(`${path}/${selectRandom(sounds)}`)
        dispatcher.setVolumeLogarithmic(3)
        dispatcher.on("finish", () => {
          resolve()
        })
        dispatcher.on("error", err => {
          reject(err)
        })
      }
    })
  }

  disconnectSound () {
    const disconnect = () => {
      if (!this.state.summoned) {
        this.state.voiceConnection.disconnect()
      }
      this.cleanUp()
    }

    const path = "assets/sounds/disconnect"
    const sounds = fs.existsSync(path) && fs.readdirSync(path)
    if (sounds && !sounds.length) {
      disconnect()
    }
    else {
      const dispatcher = this.state.voiceConnection.play(`${path}/${selectRandom(sounds)}`)
      dispatcher.setVolumeLogarithmic(3)
      dispatcher.once("finish", disconnect)
    }
  }

  cleanProgress () {
    if (this.state.progressHandle) {
      clearInterval(this.state.progressHandle)
      this.setState({ progressHandle: null })
    }
  }

  cleanUp () {
    this.debouncer.cancel()
    this.state.messagePump.clear()
  }

  startRadioMetadata (item) {
    // Any commands that just play the stream again ie. bass boost, don't fire the finish event,
    // so we need to make sure it gets cleaned up.
    this.endRadioMetadata(item)

    if (item.radio && item.radio.metadata) {
      const instance = new RadioMetadata(item.radio.metadata, item.requestStream)
      item.setRadioInstance(instance)

      instance.on("data", async info => {
        item.setRadioMetadata(info)
        item.setRadioMusicToX(null)
        this.state.radioAdBlock.toggle(!info.artist && !info.title)

        this.updateEmbed(true)
        await this.radioMusicToX(item)
      })
    }
  }

  endRadioMetadata (item) {
    if (item.radioInstance) {
      item.radioInstance.destroy()
      item.setRadioInstance(null)
      item.setRadioMetadata(null)
      item.setRadioMusicToX(null)
      this.state.radioAdBlock.toggle(false)
    }
  }

  async radioMusicToX (item) {
    if (item.radioMetadata && item.radioMetadata.artist && item.radioMetadata.title) {
      const artist = item.radioMetadata.artist
      const title = item.radioMetadata.title

      const sanitise = str => str
        .replace(/(?<=\b| )ft\.(?=\b| )/gi, " ") // a: Eve ft.Gwen Stefani, t: Let Me Blow Ya Mind
        .replace(/(?<=\b| ) ft (?=\b| )/gi, " ")
        .replace(/(?<=\b| ) feat\. (?=\b| )/gi, " ")
        .replace(/(?<=\b| ) and (?=\b| )/gi, " ")
        .replace(/(?<=\b| ) & (?=\b| )/g, " ")
        .replace(/(?<=\b| ) x (?=\b| )/gi, " ") // a: Joel Corry x MNEK, t: Head & Heart
        .replace(/(?<=\b| ) vs (?=\b| )/gi, " ") // a: Alan Fitzpatrick Vs Patrice Rushen, t: Havent You Heard  Fitzys Half Charged Mix
        // .replace(/[()[\]]/g, " ") // a: The Plug, t: Fashion (feat. M24 Fivio Foreign)
        .replace(/'/g, "") // a: Anne Marie KSI Digital Farm Animals, t: Don't Play
        .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9]/g, " ")

      const m2x = new MusicToX({
        platform: PLATFORM_RADIO,
        type: "track",
        artists: sanitise(artist),
        title: sanitise(title),
      })

      try {
        const res = await m2x.processLink()
        if (res && item.radioMetadata && item.radioMetadata.artist === artist && item.radioMetadata.title === title) {
          item.setRadioMusicToX(res)
          this.updateEmbed(true)
        }
      }
      catch (err) {
        console.log("Error when processing radio metadata m2x")
        console.log(err)
      }
    }
    else if (item.radioMusicToX) {
      item.setRadioMusicToX(null)
      this.updateEmbed(true)
    }
  }

  updateEmbed (edit = false) {
    const currentlyPlaying = this.state.queue[0]
    if (currentlyPlaying) {
      const progressPerc = this.getPlaybackProgress(currentlyPlaying)
      this.state.messagePump.set(this.createQueueEmbed(currentlyPlaying, progressPerc), edit)

      if (!edit) {
        this.debouncer()
      }
    }
  }

  getPlaybackProgress (track) {
    if (track.finished) {
      return 1
    }
    const durationMs = track.duration * 1000
    const progressPerc = durationMs === 0 ? 0 : track.startTime / durationMs

    return progressPerc
  }

  getTrackTitle (track) {
    return track.platform === "search" ? track.youTubeTitle : safeJoin([track.artists, track.title], " - ")
  }

  createQueueEmbed (currentlyPlaying, progressPerc) {
    const queue = this.state.queue.slice(1).map((t, i) => `\`${(i + 1).toString().padStart(2, "0")}\` ${escapeMarkdown(this.getTrackTitle(t))} <@${t.requestee.id}>`.slice(0, 1024))
    const top10Items = queue.slice(0, 10)
    const top10 = Util.splitMessage(top10Items, { maxLength: 1024 })
    const remainingCount = this.state.queue.length - 1 - top10Items.length

    const platformEmoji = this.getPlatformEmoji(currentlyPlaying.platform)
    const nowPlayingSource = ![PLATFORM_YOUTUBE, "search"].includes(currentlyPlaying.platform) ? `${platformEmoji ? `${platformEmoji} ` : ""}${escapeMarkdown(safeJoin([currentlyPlaying.artists, currentlyPlaying.title], " - "))}` : ""
    const nowPlayingYouTube = PLATFORMS_REQUIRE_YT_SEARCH.includes(currentlyPlaying.platform) ? `${this.guild.customEmojis.youtube} ${currentlyPlaying.link ? `[${escapeMarkdown(currentlyPlaying.youTubeTitle)}](${currentlyPlaying.link}) \`▶️ ${this.client.db.getYouTubeVideoPlayCount(currentlyPlaying.youTubeId).count}\`` : "Searching..."}` : ""

    const radioMusicToX = this.getRadioMusicToXInfo(currentlyPlaying)
    const radioNowPlaying = currentlyPlaying.platform === PLATFORM_RADIO && currentlyPlaying.radioMetadata ? escapeMarkdown([currentlyPlaying.radioMetadata.artist || "", currentlyPlaying.radioMetadata.title || ""].filter(s => s.trim()).join(" - ") + (radioMusicToX ? " " + radioMusicToX : "")) : ""

    const nowPlaying = [nowPlayingSource, nowPlayingYouTube, radioNowPlaying].filter(s => s.trim()).join("\n")
    const blocks = Math.round(20 * progressPerc)

    const requesteeMember = this.guild.members.cache.get(currentlyPlaying.requestee.id)

    return {
      embed: {
        color: 0x0099ff,
        title: "Lucille 🎵",
        author: {
          name: (requesteeMember || { displayName: currentlyPlaying.requestee.id }).displayName,
          icon_url: requesteeMember ? requesteeMember.user.displayAvatarURL() : null,
        },
        fields: [
          {
            name: "Now Playing",
            value: nowPlaying,
            inline: true,
          },
          ...this.state.queue.length > 1 ? [{
            name: "Up Next",
            value: top10[0],
          }] : [],
          ...remainingCount > 0 ? [{
            name: "Up Next",
            value: `${remainingCount} more song(s)...`,
          }] : [],
          ...this.state.voiceConnection && this.state.voiceConnection.dispatcher && this.state.voiceConnection.dispatcher.paused ? [{
            name: "Paused By",
            value: `<@${this.state.pauser}>`,
            inline: true,
          }] : [],
          ...this.state.bassBoost > 0 ? [{
            name: "Bass Boost",
            value: `${amountToBassBoostMap[this.state.bassBoost]}`,
            inline: true,
          }] : [],
          ...this.state.tempo !== 1 ? [{
            name: "Speed",
            value: `${this.state.tempo}`,
            inline: true,
          }] : [],
          ...this.state.volume !== 100 ? [{
            name: "Volume",
            value: `${this.state.volume}`,
            inline: true,
          }] : [],
          ...this.state.repeat !== "off" ? [{
            name: "Repeat",
            value: mapRepeatTypeToEmoji(this.state.repeat),
            inline: true,
          }] : [],
          ...currentlyPlaying.platform === PLATFORM_RADIO && !this.state.radioAdBlock.isMethod(RadioAdBlock.METHOD_OFF) ? [{
            name: "Radio AdBlock",
            value: (this.state.radioAdBlock.isMethod(RadioAdBlock.METHOD_LOWER) ? "🔉" : "🔈") + (this.state.radioAdBlock.isBlocking() ? "🟢" : "🔴"),
            inline: true,
          }] : [],
          ...currentlyPlaying.duration > 0 ? [{
            name: "Progress",
            value: "`" + msToTimestamp((currentlyPlaying.duration * 1000) * progressPerc) + "` " + ("▬".repeat(blocks)) + "🔵" + ("▬".repeat(Math.max(0, 20 - blocks))) + " `" + msToTimestamp(currentlyPlaying.duration * 1000) + "`",
          }] : [],
        ],
        footer: {
          text: config.discord.footer,
          icon_url: config.discord.authorAvatarUrl,
        },
      },
    }
  }

  getPlatformEmoji (platform) {
    switch (platform) {
    case PLATFORM_RADIO:
      return ":radio:"
    default:
      return this.guild.customEmojis[platform]
    }
  }

  getRadioMusicToXInfo (item) {
    if (item.platform === PLATFORM_RADIO && item.radioMusicToX) {
      const musicToX = item.radioMusicToX
      const splitApple = (musicToX.appleId || "").split("-")
      const radioMusicToX = [
        musicToX.spotifyId && `[${this.guild.customEmojis.spotify}](https://open.spotify.com/track/${musicToX.spotifyId})`,
        musicToX.tidalId && `[${this.guild.customEmojis.tidal}](https://tidal.com/browse/track/${musicToX.tidalId})`,
        musicToX.appleId && `[${this.guild.customEmojis.apple}](https://music.apple.com/gb/album/${splitApple[0]}?i=${splitApple[1]})`,
      ].filter(s => s).join(" ")

      return radioMusicToX
    }

    return ""
  }

  getTextChannel () {
    return this.state.textChannel
  }

  dispatcherExec (callback) {
    if (this.state.voiceConnection && this.state.voiceConnection.dispatcher) {
      return callback(this.state.voiceConnection.dispatcher)
    }
  }
}

const amountToBassBoostMap = {
  0: "Off",
  5: "Low",
  10: "Med",
  15: "High",
  20: "Insane",
  50: "WTFBBQ",
}

const mapRepeatTypeToEmoji = type => {
  switch (type) {
  case "off":
    return "⏭️"
  case "one":
    return "🔂"
  case "all":
    return "🔁"
  default:
    return ""
  }
}

module.exports.mapRepeatTypeToEmoji = mapRepeatTypeToEmoji