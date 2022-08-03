import { Util } from "discord.js"
import TopMostMessagePump from "./TopMostMessagePump.js"
import { safeJoin, msToTimestamp, selectRandom, escapeMarkdown, searchYouTube } from "../helpers.js"
import TrackExtractor, { PLATFORM_YOUTUBE, PLATFORM_RADIO, PLATFORM_SPOTIFY, PLATFORM_TIDAL, PLATFORM_APPLE, PLATFORM_CONNECT, PLATFORM_DISCONNECT } from "./TrackExtractor.js"
import Track from "./Track.js"
import fs from "fs"
import RadioMetadata from "./RadioMetadata.js"
import axios from "axios"
import MusicToX from "./MusicToX.js"
import { getStream, getFfmpegStream } from "./YouTubeToStream.js"
import MusicState from "./MusicState.js"
import Requestee from "./Requestee.js"

const PLATFORMS_REQUIRE_YT_SEARCH = [PLATFORM_SPOTIFY, PLATFORM_TIDAL, PLATFORM_APPLE, PLATFORM_YOUTUBE, "search"]

export default class Music extends MusicState {
  constructor (guild) {
    super(guild, {
      joinState: 0,
      voiceChannel: null,
      textChannel: guild.systemChannel,
      voiceConnection: null,
      queue: [],
      pauser: "",
      // Move the embed down every 5 minutes, it can get lost when a radio is left on for ages
      // TMMP now handles this internally...
      messagePump: new TopMostMessagePump(3e5).on("create", msg => this.setState({ embedId: msg.id })),
      bassBoost: 0,
      tempo: 1,
      volume: 100,
      playedConnectSound: false,
      repeat: "off",
      summoned: false,
      embedId: "",
    })

    this.guild = guild
    this.client = guild.client

    this.progressHandle = null
    this.listenTimeHandle = null
    this.streamTimeCache = 0

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
          playedConnectSound: false,
        })

        this.state.voiceConnection.once("disconnect", () => {
          this.setState({
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

    const wasRadio = this.state.queue[0] && this.state.queue[0].platform === PLATFORM_RADIO
    const queueTracks = this.state.queue.filter(t => t.platform !== PLATFORM_RADIO && t.platform !== PLATFORM_DISCONNECT)
    const queueRadios = this.state.queue.filter(t => t.platform === PLATFORM_RADIO)
    const queueDisconnect = this.state.queue.filter(t => t.platform === PLATFORM_DISCONNECT)
    const newTracks = tracks.filter(t => t.platform !== PLATFORM_RADIO)
    const newRadios = tracks.filter(t => t.platform === PLATFORM_RADIO)

    // If the queue is empty, i.e. only a radio playing then happily handles inserting at 1 in an empty array.
    queueTracks.splice(jump ? 1 : queueTracks.length, 0, ...newTracks)

    const radios = newRadios.concat(queueRadios)
    if (radios.length) {
      queueTracks.push(radios[0])
    }

    if (queueDisconnect.length) {
      queueTracks.push(queueDisconnect[0])
    }

    if (!this.state.queue.length) {
      this.state.messagePump.setChannel(textChannel)

      const connectPath = "assets/sounds/connect"
      const connectSounds = fs.existsSync(connectPath) && fs.readdirSync(connectPath)
      const randomConnectSound = selectRandom(connectSounds)
      const disconnectPath = "assets/sounds/disconnect"
      const disconnectSounds = fs.existsSync(disconnectPath) && fs.readdirSync(disconnectPath)
      const randomDisconnectSound = selectRandom(disconnectSounds)

      const requestee = new Requestee(this.guild.me.displayName, this.client.user.displayAvatarURL(), this.client.user.id)

      queueTracks.unshift(new Track("", "Random Connect Sound", "")
        .setPlatform(PLATFORM_CONNECT)
        .setLink(`${connectPath}/${randomConnectSound}`)
        .setDuration(0)
        .setRequestee(requestee))

      queueTracks.push(new Track("", "Random Disconnect Sound", "")
        .setPlatform(PLATFORM_DISCONNECT)
        .setLink(`${disconnectPath}/${randomDisconnectSound}`)
        .setDuration(0)
        .setRequestee(requestee))
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
    const searchResult = (await searchYouTube(item.query))[0]
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
        this.state.textChannel.send(`❌ Failed to find a YouTube video for \`${item.query}\``)
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

    const streamData = await this.getMediaStream(item)
    if (!streamData) {
      return
    }

    const { stream, type } = streamData
    this.stream = stream

    // Using on readable makes the transition smoother when restarting the stream.
    // i.e. when changing the bass boost
    // TODO: Handle the error event
    stream.once("readable", () => {
      const dispatcher = this.state.voiceConnection.play(stream, { type })
      dispatcher.setVolumeLogarithmic([PLATFORM_CONNECT, PLATFORM_DISCONNECT].includes(item.platform) ? 3 : this.state.volume / 100)

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
            this.progressHandle = setInterval(() => {
              this.syncTime()
              this.setState({ queue: this.state.queue })
              this.updateEmbed(true)
            }, 5000)
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
        this.state.textChannel.send(`❌ Failed to get a YouTube stream for\n${this.getTrackTitle(item)}\n${item.link}\n${err.message}`)
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

          return { stream: getFfmpegStream(res.data, { startTime: 0, filters: this.getAudioFilters() }), type: "opus" }
        }
        catch (err) {
          console.log("Error occured when getting radio stream")
          console.log(err)
        }
      }
    }

    return { stream: getFfmpegStream(item.link, { startTime: 0, filters: this.getAudioFilters() }), type: "opus" }
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
        this.state.queue.push(this.state.queue.shift().reset())
        this.setState({ queue: this.state.queue })
      }
    }
    else if (this.state.repeat === "one") {
      if (this.state.queue.length > 0) {
        this.state.queue[0].reset()
        this.setState({ queue: this.state.queue })
      }
    }
    else if (this.state.repeat === "off") {
      this.state.queue.shift()
      this.setState({ queue: this.state.queue })
    }

    if (this.state.queue.length < 1) {
      if (!this.state.summoned) {
        this.state.voiceConnection.disconnect()
      }
      this.cleanUp()
    }
    else {
      await this.searchAndPlay()
    }
  }

  setRepeat (type) {
    this.setState({ repeat: type })
    this.updateEmbed()
  }

  setVolume (volume) {
    this.setState({ volume })
    this.dispatcherExec(d => d.setVolumeLogarithmic(volume / 100))
    this.updateEmbed()
  }

  cleanProgress () {
    if (this.progressHandle) {
      clearInterval(this.progressHandle)
    }
  }

  cleanUp () {
    this.state.messagePump.clear()
    this.setState({ playedConnectSound: false })
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
    const queue = this.state.queue.filter((t, i) => i > 0 && t.platform !== PLATFORM_DISCONNECT).map((t, i) => `\`${(i + 1).toString().padStart(2, "0")}\` ${escapeMarkdown(this.getTrackTitle(t))} <@${t.requestee.id}>`.slice(0, 1024))
    const top10Items = queue.slice(0, 10)
    const top10 = Util.splitMessage(top10Items, { maxLength: 1024 })
    const remainingCount = queue.length - top10Items.length

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
          ...(queue.length > 0 ? [{
            name: "Up Next",
            value: top10[0],
          }] : []),
          ...(remainingCount > 0 ? [{
            name: "Up Next",
            value: `${remainingCount} more song(s)...`,
          }] : []),
          ...(this.state.voiceConnection && this.state.voiceConnection.dispatcher && this.state.voiceConnection.dispatcher.paused ? [{
            name: "Paused By",
            value: `<@${this.state.pauser}>`,
            inline: true,
          }] : []),
          ...(this.state.bassBoost > 0 ? [{
            name: "Bass Boost",
            value: `${amountToBassBoostMap[this.state.bassBoost]}`,
            inline: true,
          }] : []),
          ...(this.state.tempo !== 1 ? [{
            name: "Speed",
            value: `${this.state.tempo}`,
            inline: true,
          }] : []),
          ...(this.state.volume !== 100 ? [{
            name: "Volume",
            value: `${this.state.volume}`,
            inline: true,
          }] : []),
          ...(this.state.repeat !== "off" ? [{
            name: "Repeat",
            value: mapRepeatTypeToEmoji(this.state.repeat),
            inline: true,
          }] : []),
          ...(currentlyPlaying.duration > 0 ? [{
            name: "Progress",
            value: "`" + msToTimestamp((currentlyPlaying.duration * 1000) * progressPerc) + "` " + ("▬".repeat(blocks)) + "🔵" + ("▬".repeat(Math.max(0, 20 - blocks))) + " `" + msToTimestamp(currentlyPlaying.duration * 1000) + "`",
          }] : []),
        ],
        footer: {
          text: process.env.DISCORD_FOOTER,
          icon_url: process.env.DISCORD_AUTHORAVATARURL,
        },
      },
    }
  }

  getPlatformEmoji (platform) {
    switch (platform) {
    case PLATFORM_RADIO:
      return "📻"
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

export const mapRepeatTypeToEmoji = type => {
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