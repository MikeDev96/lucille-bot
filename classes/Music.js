// const { Command } = require("discord.js-commando")
// const TrackExtractor = require("./TrackExtractor")
// const youtube = require("scrape-youtube").default
const scrapeYt = require("scrape-yt")
const ytdl = require("discord-ytdl-core")
const StringSplitter = require("./StringSplitter")
// const Track = require("./Track")
// const Requestee = require("./Requestee")
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
    }
  }

  async add (input, requestee, voiceChannel, index = -1) {
    const trackExtractor = new TrackExtractor(input)
    const insertAt = index < 0 ? this.state.queue.length : index
    if (trackExtractor.parseLinks()) {
      const links = await trackExtractor.getAllLinkInfo()
      this.state.queue.splice(insertAt, 0, ...links.map(l => l.setRequestee(requestee).setQuery(`official audio ${l.artists} ${l.title}`)))
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

        this.state.queue.splice(insertAt, 0, track)
      }
      else {
        return false
      }
    }

    if (this.state.queue.length > 0) {
      // Join the voice channel if not already joining/joined
      if (this.state.joinState === 0) {
        this.state.joinState = 1

        voiceChannel.join().then(connection => {
          this.state.joinState = 2
          this.state.voiceChannel = voiceChannel
          this.state.voiceConnection = connection

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
        this.updateEmbed()
      }
    }

    return true
  }

  async searchAndPlay () {
    const item = this.state.queue[0]

    // if (item.platform === "search") {
    if (item.link) {
      this.play()
    }
    else {
      // const query = `${item.artists} ${item.title}`.trim()
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
          // filter: "audioonly",
          // quality: "highestaudio",
          // highWaterMark: 1024 * 1024 * 10,
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
    this.updateEmbed()

    const item = this.state.queue[0]
    const fetchYTStream = PLATFORMS_REQUIRE_YT_SEARCH.includes(item.platform)
    let stream

    if (fetchYTStream) {
      stream = await this.getYTStream(item.link)
      if (!stream) {
        this.state.textChannel.send(`Failed to get a YouTube stream for\n${this.getTrackTitle(item)}\n${item.link}`)
        // this.state.queue.shift()
        // this.play()
        this.processQueue()
        return
      }
    }
    else {
      stream = item.link
    }

    // stream.once("data", () => {
    const dispatcher = this.state.voiceConnection.play(stream, fetchYTStream ? { type: "opus" } : undefined)
    dispatcher.setVolumeLogarithmic(this.state.volume / 100)

    dispatcher.on("start", () => {
      console.log("Stream starting...")
      this.cleanProgress()
      this.state.progressHandle = setInterval(() => this.updateEmbed(true, false), 5000)
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
    // })
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

  disconnectSound () {
    const sounds = fs.readdirSync("assets/sounds/farts")
    const dispatcher = this.state.voiceConnection.play(`assets/sounds/farts/${selectRandom(sounds)}`)
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
    this.state.voiceConnection = null
    this.state.voiceChannel = null
    this.state.joinState = 0
    this.state.messagePump.clear()
  }

  startRadioMetadata (item) {
    if (item.platform === PLATFORM_RADIO) {
      const radio = Object.values(radios).find(r => r.url === item.link)
      if (radio && radio.metadata) {
        const rm = new RadioMetadata(radio.metadata.type, radio.metadata.url, radio.metadata.summon)
        item.radio = {}
        const callback = rm.subscribe(info => {
          item.radio.info = info
          this.updateEmbed(true, true)
        })

        item.radio.rm = rm
        item.radio.callback = callback
      }
    }
  }

  stopRadioMetadata (item) {
    if (item.radio) {
      item.radio.rm.dispose()
    }
  }

  updateEmbed (edit = false, force = true) {
    const currentlyPlaying = this.state.queue[0]
    if (currentlyPlaying) {
      const progressPerc = this.getPlaybackProgress(currentlyPlaying.duration)
      if (this.state.progress !== progressPerc || force) {
        this.state.messagePump.set(this.createQueueEmbed(currentlyPlaying, progressPerc), edit)
      }
    }
  }

  getPlaybackProgress (duration) {
    const durationMs = duration * 1000
    const elapsed = Math.min(this.state.playTime + (this.dispatcherExec(d => d.streamTime) || 0), durationMs)
    const progressPerc = durationMs === 0 ? 0 : elapsed / durationMs
    // const blocks = Math.ceil(20 * progressPerc)

    return progressPerc
  }

  getTrackTitle (track) {
    return track.platform === "search" ? track.youTubeTitle : safeJoin([track.artists, track.title], " - ")
  }

  createQueueEmbed (currentlyPlaying, progressPerc) {
    const queue = this.state.queue/* .slice(1, 1 + QUEUE_TRACKS) */.slice(1).map((t, i) => `${i + 1}. ${this.getTrackTitle(t)} <@${t.requestee.id}>`)
    const splitQueue = new StringSplitter(queue).split()

    const platformEmoji = this.getPlatformEmoji(currentlyPlaying.platform)
    const nowPlayingSource = ![PLATFORM_YOUTUBE, "search"].includes(currentlyPlaying.platform) ? `${platformEmoji ? `${platformEmoji} ` : ""}${safeJoin([currentlyPlaying.artists, currentlyPlaying.title], " - ")}` : ""
    const nowPlayingYouTube = PLATFORMS_REQUIRE_YT_SEARCH.includes(currentlyPlaying.platform) ? `${this.state.emojis.youtube} [${currentlyPlaying.youTubeTitle}](${currentlyPlaying.link})` : ""
    const radioNowPlaying = currentlyPlaying.platform === PLATFORM_RADIO && currentlyPlaying.radio && currentlyPlaying.radio.info ? [currentlyPlaying.radio.info.artist || "", currentlyPlaying.radio.info.title || ""].filter(s => s.trim()).join(" - ") : ""
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
          // { name: "\u200b", value: "\u200b", inline: true },
          // { name: "\u200b", value: "\u200b", inline: true },
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
            value: msToTimestamp((currentlyPlaying.duration * 1000) * progressPerc) + " " + ("▬".repeat(blocks)) + "🔵" + ("▬".repeat(Math.max(0, 20 - blocks - 1))) + " " + msToTimestamp(currentlyPlaying.duration * 1000),
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

// const QUEUE_TRACKS = 10
// const QUEUE_FIELD_MAX_CHARS = 1024