// const { Command } = require("discord.js-commando")
// const TrackExtractor = require("./TrackExtractor")
// const youtube = require("scrape-youtube").default
const scrapeYt = require("scrape-yt").scrapeYt
const ytdl = require("discord-ytdl-core")
const StringSplitter = require("./StringSplitter")
// const Track = require("./Track")
// const Requestee = require("./Requestee")
const index = require("../index")
const config = require("../config.json")
const TopMostMessagePump = require("./TopMostMessagePump")
const { safeJoin } = require("../helpers")
const { amountToBassBoostMap } = require("../commands/music/bassboost")

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
        acc[cur.name] = textChannel.guild.emojis.cache.find(e => e.name === cur.name).toString()
        return acc
      }, {}),
      pauser: "",
      messagePump: new TopMostMessagePump(textChannel),
      playTime: 0,
      bassBoost: 0,
      tempo: 1,
      volume: 100,
    }
  }

  async searchAndPlay () {
    const item = this.state.queue[0]

    // if (item.platform === "search") {
    if (item.link) {
      this.play()
    }
    else {
      // const query = `${item.artists} ${item.title}`.trim()
      const searchResult = (await scrapeYt.search(item.query, { limit: 1 }))[0]

      if (searchResult) {
        item.setLink(`https://www.youtube.com/watch?v=${searchResult.id}`)
          .setYouTubeTitle(searchResult.title)
        this.state.currentVideo = searchResult
        this.play()
      }
      else {
        console.log(`Couldn't find a video for: ${item.query}`)
      }
    }
  }

  async play () {
    const item = this.state.queue[0]
    const stream = ytdl(item.link, {
      // filter: "audioonly",
      quality: "highestaudio",
      // highWaterMark: 1024 * 1024 * 10,
      highWaterMark: 1 << 25,
      seek: this.state.playTime / 1000,
      encoderArgs: [
        "-af",
        `equalizer=f=40:width_type=h:width=50:g=${this.state.bassBoost},atempo=${this.state.tempo}`,
      ],
    })

    stream.once("data", () => {
      const dispatcher = this.state.voiceConnection.play(stream, { type: "opus" })
      dispatcher.setVolumeLogarithmic(this.state.volume / 100)

      dispatcher.on("start", () => {
        console.log("Stream starting...")
      })

      dispatcher.on("finish", () => {
        console.log("Stream finished...")
        this.state.queue.shift()
        this.state.playTime = 0

        if (this.state.queue.length < 1) {
          this.state.voiceConnection.disconnect()
          this.cleanUp()
        }
        else {
          this.searchAndPlay()
        }
      })

      dispatcher.on("error", err => {
        console.log(err)
      })
    })

    this.updateEmbed()
  }

  cleanUp () {
    this.state.voiceConnection = null
    this.state.voiceChannel = null
    this.state.joinState = 0
    this.state.messagePump.clear()
  }

  updateEmbed () {
    this.state.messagePump.set(this.createQueueEmbed())
  }

  createQueueEmbed () {
    const currentlyPlaying = this.state.queue[0]
    if (currentlyPlaying) {
      const queue = this.state.queue/* .slice(1, 1 + QUEUE_TRACKS) */.slice(1).map((t, i) => `${i + 1}. ${t.platform === "search" ? t.youTubeTitle : safeJoin([t.artists, t.title], " - ")} <@${t.requestee.id}>`)
      const splitQueue = new StringSplitter(queue).split()

      const nowPlayingSource = !["youtube", "search"].includes(currentlyPlaying.platform) ? `${this.state.emojis[currentlyPlaying.platform]} ${safeJoin([currentlyPlaying.artists, currentlyPlaying.title], " - ")}` : ""
      const nowPlayingYouTube = `${this.state.emojis.youtube} [${currentlyPlaying.youTubeTitle}](${currentlyPlaying.link})`
      const nowPlaying = [nowPlayingSource, nowPlayingYouTube].filter(s => s.trim()).join("\n")

      return {
        embed: {
          color: 0x0099ff,
          title: "Tidify 2.0",
          url: "https://discord.js.org",
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
            ...this.state.voiceConnection.dispatcher && this.state.voiceConnection.dispatcher.paused ? [{
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
          ],
          footer: {
            text: "Created with ♥ by Migul",
            icon_url: config.discord.authorAvatarUrl,
          },
        },
      }
    }
  }

  dispatcherExec (callback) {
    if (this.state.voiceConnection && this.state.voiceConnection.dispatcher) {
      return callback(this.state.voiceConnection.dispatcher)
    }
  }
}

// const QUEUE_TRACKS = 10
// const QUEUE_FIELD_MAX_CHARS = 1024