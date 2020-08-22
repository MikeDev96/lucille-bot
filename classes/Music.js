const scrapeYt = require("scrape-yt")
const ytdl = require("discord-ytdl-core")
const StringSplitter = require("./StringSplitter")
const index = require("../index")
const config = require("../config.json")
const TopMostMessagePump = require("./TopMostMessagePump")
const { safeJoin, sleep, msToTimestamp, selectRandom } = require("../helpers")
const TrackExtractor = require("./TrackExtractor")
const { PLATFORM_YOUTUBE, PLATFORM_RADIO, PLATFORM_SPOTIFY, PLATFORM_TIDAL, PLATFORM_APPLE } = require("./TrackExtractor")
const Track = require("./Track")
const fs = require("fs")
const { RadioMetadata } = require("./RadioMetadata")
const radios = require("../radios.json")
const Axios = require("axios")
const MusicToX = require("./MusicToX")
const debounce = require("lodash.debounce")

const PLATFORMS_REQUIRE_YT_SEARCH = [PLATFORM_SPOTIFY, PLATFORM_TIDAL, PLATFORM_APPLE, PLATFORM_YOUTUBE, "search"]

module.exports = class {
  constructor (textChannel) {
    this.state = {
      joinState: 0,
      voiceChannel: null,
      textChannel: textChannel,
      voiceConnection: null,
      queue: [],
      currentVideo: {},
      emojis: index.emojis.reduce((acc, cur) => {
        acc[cur.name] = (textChannel.guild.emojis.cache.find(e => e.name === cur.name) || "").toString()
        return acc
      }, {}),
      pauser: "",
      messagePump: new TopMostMessagePump(textChannel),
      playTime: 0,
      bassBoost: 0,
      tempo: 1,
      volume: 100,
      progress: 0,
      progressHandle: null,
      playCount: 0,
    }

    // Move the embed down every 5 minutes, it can get lost when a radio is left on for ages
    this.debouncer = debounce(this.updateEmbed, 5 * 60 * 1000)
  }

  async add (input, requestee, voiceChannel, index = -1) {
    const trackExtractor = new TrackExtractor(input)
    let insertAt = index < 0 ? this.state.queue.length : index
    let tracks = []

    if (trackExtractor.parseLinks()) {
      const links = await trackExtractor.getAllLinkInfo()

      tracks = links.map(l => l.setRequestee(requestee).setQuery(`official audio ${l.artists} ${l.title}`))
    }
    else {
      const track = new Track()
        .setRequestee(requestee)
        .setPlatform("search")
        .setQuery(input)

      const searchResults = (await scrapeYt.search(track.query)).filter(res => res.type === "video")
      const searchResult = searchResults[0]
      if (searchResult) {
        track
          .setYouTubeTitle(searchResult.title)
          .setThumbnail(searchResult.thumbnail)
          .setLink(`https://www.youtube.com/watch?v=${searchResult.id}`)
          .setDuration(searchResult.duration)

        tracks = [track]
      }
      else {
        return false
      }
    }

    // If we're adding an item to the end of the queue & there's something in the queue already
    if (index < 0 && this.state.queue.length > 1) {
      const isAddingRadio = !!tracks.find(t => t.platform === PLATFORM_RADIO)
      const radioIndex = this.state.queue.findIndex((t, idx) => idx > 0 && t.platform === PLATFORM_RADIO)
      // If there's a radio in the queue
      if (radioIndex >= 0) {
        // And we're adding a radio, delete the old radio
        if (isAddingRadio) {
          this.state.queue.splice(radioIndex, 1)
        }

        // Update the insert index, to put it where the old radio was
        insertAt = radioIndex
      }
    }

    this.state.queue.splice(insertAt, 0, ...tracks)

    if (this.state.queue.length > 0) {
      // Join the voice channel if not already joining/joined
      if (this.state.joinState === 0) {
        this.state.joinState = 1

        voiceChannel.join().then(connection => {
          this.state.joinState = 2
          this.state.voiceChannel = voiceChannel
          this.state.voiceConnection = connection
          this.state.playCount = 0

          this.state.voiceConnection.on("disconnect", () => {
            this.state.queue.splice(0, this.state.queue.length)
            this.cleanUp()
          })

          this.searchAndPlay()
        }).catch(err => {
          this.state.joinState = 0
          console.log(err)
        })
      }
      else {
        // If there's a radio currently playing & there's something else in the queue (because we've just added it above)
        if (this.state.queue[0].platform === PLATFORM_RADIO && this.state.queue.length > 1) {
          // Then remove the radio
          const [radio] = this.state.queue.splice(0, 1)
          // And add it to the end of the queue as long as the item now at index 0 isn't a radio
          // This is because we only allow 1 radio in the queue at a time
          if (this.state.queue[0].platform !== PLATFORM_RADIO) {
            this.state.queue.push(radio)
          }

          this.searchAndPlay()
        }
        else {
          this.updateEmbed()
        }
      }
    }

    return true
  }

  async searchAndPlay () {
    const item = this.state.queue[0]

    if (item.link) {
      this.play()
    }
    else {
      const searchResults = (await scrapeYt.search(item.query)).filter(res => res.type === "video")
      const searchResult = searchResults[0]

      if (searchResult) {
        item.setLink(`https://www.youtube.com/watch?v=${searchResult.id}`)
          .setYouTubeTitle(searchResult.title)
          .setDuration(searchResult.duration)
        this.state.currentVideo = searchResult
        this.play()
      }
      else {
        console.log(`Couldn't find a video for: ${item.query}`)
      }
    }
  }

  async getYTStream (url) {
    let stream = null

    for (let i = 0; i < 5; i++) {
      try {
        stream = ytdl(url, {
          highWaterMark: 1 << 25,
          seek: this.state.playTime / 1000,
          encoderArgs: [
            "-af",
            `equalizer=f=40:width_type=h:width=50:g=${this.state.bassBoost},atempo=${this.state.tempo}`,
          ],
        })

        break
      }
      catch (err) {
        console.log(`Failed to get YT stream, attempt ${i + 1} of 5`)
        console.error(err)

        stream = null

        await sleep(3000)
      }
    }

    return stream
  }

  async play () {
    const item = this.state.queue[0]
    const fetchYTStream = PLATFORMS_REQUIRE_YT_SEARCH.includes(item.platform)
    let stream

    if (item.startTime) {
      this.state.playTime = item.startTime * 1000
    }

    this.updateEmbed()

    if (fetchYTStream) {
      stream = await this.getYTStream(item.link)
      if (!stream) {
        this.state.textChannel.send(`Failed to get a YouTube stream for\n${this.getTrackTitle(item)}\n${item.link}`)
        this.processQueue()
        return
      }
    }
    else {
      stream = await this.getMediaStream(item)
    }

    if (this.state.playCount === 0) {
      try {
        await this.connectSound()
      }
      catch (err) {
        console.log("Failed to play connect sound")
        console.log(err)
        console.log(err)
      }
    }

    this.state.playCount++

    const dispatcher = this.state.voiceConnection.play(stream, fetchYTStream ? { type: "opus" } : undefined)
    dispatcher.setVolumeLogarithmic(this.state.volume / 100)

    dispatcher.on("start", () => {
      console.log("Stream starting...")
      this.cleanProgress()
      if (item.duration > 0) {
        this.state.progressHandle = setInterval(() => this.updateEmbed(true, false), 5000)
      }
      this.startRadioMetadata(item)
    })

    dispatcher.on("finish", () => {
      console.log("Stream finished...")

      // One last update so the progress bar reaches the end
      this.updateEmbed(true, false)
      this.cleanProgress()
      this.stopRadioMetadata(item)
      this.processQueue()
    })

    dispatcher.on("error", err => {
      console.log(err)
    })
  }

  async getMediaStream (item) {
    if (item.platform === PLATFORM_RADIO) {
      const radio = Object.values(radios).find(r => r.url === item.link)

      if (radio) {
        item.setRadio(radio)

        if (radio.metadata && radio.metadata.type === "sse") {
          try {
            const res = await Axios({
              method: "GET",
              url: item.link,
              responseType: "stream",
            })

            item.setRequestStream(res)

            return res.data
          }
          catch (err) {
            console.log("Error occured when getting radio stream")
            console.log(err)
          }
        }
      }
    }

    return item.link
  }

  processQueue () {
    this.state.queue.shift()
    this.state.playTime = 0

    if (this.state.queue.length < 1) {
      this.disconnectSound()
    }
    else {
      this.searchAndPlay()
    }
  }

  connectSound () {
    return new Promise((resolve, reject) => {
      const sounds = fs.readdirSync("assets/sounds/connect")
      const dispatcher = this.state.voiceConnection.play(`assets/sounds/connect/${selectRandom(sounds)}`)
      dispatcher.on("finish", () => {
        resolve()
      })
      dispatcher.on("error", err => {
        reject(err)
      })
    })
  }

  disconnectSound () {
    const sounds = fs.readdirSync("assets/sounds/disconnect")
    const dispatcher = this.state.voiceConnection.play(`assets/sounds/disconnect/${selectRandom(sounds)}`)
    dispatcher.setVolumeLogarithmic(3)
    dispatcher.on("finish", () => {
      this.state.voiceConnection.disconnect()
      this.cleanUp()
    })
  }

  cleanProgress () {
    if (this.state.progressHandle) {
      clearInterval(this.state.progressHandle)
      this.state.progressHandle = null
    }
  }

  cleanUp () {
    this.debouncer.cancel()
    this.state.voiceConnection = null
    this.state.voiceChannel = null
    this.state.joinState = 0
    this.state.messagePump.clear()
  }

  startRadioMetadata (item) {
    if (item.radio && item.radio.metadata) {
      const rm = new RadioMetadata(item.radio.metadata.type, item.radio.metadata.url, item.radio.metadata.type === "sse" ? item.requestStream : item.radio.metadata.summon)
      item.radio = {}
      const callback = rm.subscribe(info => {
        item.radio.info = info

        this.radioMusicToX(item)
        this.updateEmbed(true, true)
      })

      item.radio.rm = rm
      item.radio.callback = callback
    }
  }

  stopRadioMetadata (item) {
    if (item.radio) {
      item.radio.rm.dispose()
    }
  }

  async radioMusicToX (item) {
    if (item.radio.info.artist && item.radio.info.title) {
      const sanitise = str => str.replace(/(?<=\b) ft. (?=\b)/gi, " ")
        .replace(/(?<=\b) feat. (?=\b)/gi, " ")
        .replace(/(?<=\b) and (?=\b)/gi, " ")
        .replace(/(?<=\b) & (?=\b)/g, " ")

      const m2x = new MusicToX({
        platform: PLATFORM_RADIO,
        type: "track",
        artists: sanitise(item.radio.info.artist),
        title: sanitise(item.radio.info.title),
      })

      try {
        const res = await m2x.processLink()
        if (res) {
          item.radio.musicToX = res
          this.updateEmbed(true, true)
        }
      }
      catch (err) {
        console.log("Error when processing radio metadata m2x")
        console.log(err)
      }
    }
    else {
      item.radio.musicToX = undefined
    }
  }

  updateEmbed (edit = false, force = true) {
    const currentlyPlaying = this.state.queue[0]
    if (currentlyPlaying) {
      const progressPerc = this.getPlaybackProgress(currentlyPlaying.duration)
      if (this.state.progress !== progressPerc || force) {
        this.state.messagePump.set(this.createQueueEmbed(currentlyPlaying, progressPerc), edit)
      }

      if (!edit) {
        this.debouncer()
      }
    }
  }

  getPlaybackProgress (duration) {
    const durationMs = duration * 1000
    const elapsed = Math.min(this.state.playTime + (this.dispatcherExec(d => d.streamTime) || 0), durationMs)
    const progressPerc = durationMs === 0 ? 0 : elapsed / durationMs

    return progressPerc
  }

  getTrackTitle (track) {
    return track.platform === "search" ? track.youTubeTitle : safeJoin([track.artists, track.title], " - ")
  }

  createQueueEmbed (currentlyPlaying, progressPerc) {
    const queue = this.state.queue.slice(1).map((t, i) => `${i + 1}. ${this.getTrackTitle(t)} <@${t.requestee.id}>`)
    const splitQueue = new StringSplitter(queue).split()

    const platformEmoji = this.getPlatformEmoji(currentlyPlaying.platform)
    const nowPlayingSource = ![PLATFORM_YOUTUBE, "search"].includes(currentlyPlaying.platform) ? `${platformEmoji ? `${platformEmoji} ` : ""}${safeJoin([currentlyPlaying.artists, currentlyPlaying.title], " - ")}` : ""
    const nowPlayingYouTube = PLATFORMS_REQUIRE_YT_SEARCH.includes(currentlyPlaying.platform) ? `${this.state.emojis.youtube} [${currentlyPlaying.youTubeTitle}](${currentlyPlaying.link})` : ""

    const radioMusicToX = this.getRadioMusicToXInfo(currentlyPlaying)
    const radioNowPlaying = currentlyPlaying.platform === PLATFORM_RADIO && currentlyPlaying.radio && currentlyPlaying.radio.info ? [currentlyPlaying.radio.info.artist || "", currentlyPlaying.radio.info.title || ""].filter(s => s.trim()).join(" - ") + (radioMusicToX ? " " + radioMusicToX : "") : ""

    const nowPlaying = [nowPlayingSource, nowPlayingYouTube, radioNowPlaying].filter(s => s.trim()).join("\n")
    const blocks = Math.ceil(20 * progressPerc)

    return {
      embed: {
        color: 0x0099ff,
        title: "Lucille :musical_note:",
        author: {
          name: currentlyPlaying.requestee.displayName,
          icon_url: currentlyPlaying.requestee.avatar,
        },
        fields: [
          {
            name: "Now Playing",
            value: nowPlaying,
            inline: true,
          },
          ...splitQueue.strings.map(q => ({
            name: "Up Next",
            value: q.subString,
          })),
          ...splitQueue.remaining.length > 0 ? [{
            name: "Up Next",
            value: `${splitQueue.remaining.length} more song(s)...`,
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
          ...currentlyPlaying.duration > 0 ? [{
            name: "Progress",
            value: "`" + msToTimestamp((currentlyPlaying.duration * 1000) * progressPerc) + "` " + ("▬".repeat(blocks)) + "🔵" + ("▬".repeat(Math.max(0, 20 - blocks - 1))) + " `" + msToTimestamp(currentlyPlaying.duration * 1000) + "`",
          }] : [],
        ],
        footer: {
          text: "Created with ♥ by Migul, Powered by Keef Web Services",
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
        return this.state.emojis[platform]
    }
  }

  getRadioMusicToXInfo (item) {
    if (item.platform === PLATFORM_RADIO && item.radio && item.radio.musicToX) {
      const musicToX = item.radio.musicToX
      const splitApple = (musicToX.appleId || "").split("-")
      const radioMusicToX = [
        musicToX.spotifyId && `[${this.state.emojis.spotify}](https://open.spotify.com/track/${musicToX.spotifyId})`,
        musicToX.tidalId && `[${this.state.emojis.tidal}](https://tidal.com/browse/track/${musicToX.tidalId})`,
        musicToX.appleId && `[${this.state.emojis.apple}](https://music.apple.com/gb/track/${splitApple[0]}?i=${splitApple[1]})`,
      ].filter(s => s).join(" ")

      return radioMusicToX
    }

    return ""
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