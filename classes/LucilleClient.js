const { CommandoClient } = require("discord.js-commando")
const VoiceTracker = require("./VoiceTracker")
const VoiceStateAdapter = require("./VoiceStateAdapter")
const MusicTracker = require("./MusicTracker")
const BangaTracker = require("./BangaTracker")
const AliasTracker = require("./AliasTracker")
const DailyTracker = require("./DailyTracker")
const MasterDatabase = require("./MasterDatabase")
const RedditRipper = require("./RedditRipper")
const MessageInterceptor = require("./MessageInterceptor")
const AmazonRipper = require("./AmazonRipper")
const TikTokRipper = require("./TikTokRipper")
const { ppResetDaily } = require("../commands/fun/pp")
const { aocResetDaily } = require("../commands/misc/aocleaderboard")
const { imposterReleaseCountdown } = require("../commands/fun/imposter")
const TextToSpeech = require("./TextToSpeech")
// const VoiceCommands = require("./classes/VoiceCommands")

module.exports = class LucilleClient extends CommandoClient {
  constructor (options) {
    super(options)

    this.db = new MasterDatabase()
    this.voiceTracker = new VoiceTracker(this)
    this.bangaTracker = new BangaTracker(this)
    this.aliasTracker = new AliasTracker(this)
    this.voiceStateAdapter = new VoiceStateAdapter(this)
    // client.voiceCommands = new VoiceCommands(client)

    this.createMessageInterceptor()
    this.createDailyTracker()
    this.createTTS()

    this.on("guildCreate", guild => guild.createEmojis())
    this.on("voiceStateUpdate", (_oldVoice, newVoice) => {
      if (newVoice.id === this.user.id && newVoice.channelID) {
        newVoice.guild.music.setState({ voiceChannel: newVoice.channel })
      }
    })
  }

  createMessageInterceptor () {
    this.messageInterceptor = new MessageInterceptor(this)
    this.messageInterceptor.on("message", msg => {
      new MusicTracker().run(msg)
      new RedditRipper().runMessage(msg)
      new AmazonRipper().runMessage(msg)
      new TikTokRipper().runMessage(msg)
    })
  }

  createDailyTracker () {
    this.dailyTracker = new DailyTracker(this, "18:00:00")
    this.dailyTracker.on("reset", () => this.guilds.cache.forEach(guild => {
      ppResetDaily(this, guild)
      aocResetDaily(guild)
      imposterReleaseCountdown(this, guild)
    }))
  }

  createTTS () {
    const TextToSpeechHandler = (ttsLastHappend, method, voiceObj) => {
      var currentTime = new Date().getTime()
      // Rate limit reduced for the time being
      if (ttsLastHappend + (5 * 1000) < currentTime || ttsLastHappend === undefined) {
        new TextToSpeech(this).run(method, voiceObj)
        return currentTime
      }
      return ttsLastHappend
    }

    const ttsLastHappend = {}
    const methodArr = ["join", "leave", "move"]

    methodArr.forEach(method => {
      this.voiceStateAdapter.on(method, (voiceObj) => {
        // Check if bot
        if (voiceObj.voiceState.id !== this.user.id) {
          ttsLastHappend[voiceObj.voiceState.id] = TextToSpeechHandler(ttsLastHappend[voiceObj.voiceState.id], method, voiceObj)
        }
      })
    })
  }

  async connect (token) {
    try {
      await this.login(token)
    }
    catch (err) {
      console.log(`Failed to connect to Discord, retrying in 5 seconds...\n${err.message}`)
      setTimeout(async () => {
        await this.connect(token)
      }, 5000)
    }
  }
}