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
const TextToSpeech = require("./TextToSpeech")
const StocksPortfolio = require("./StocksPortfolio")

module.exports = class LucilleClient extends CommandoClient {
  constructor (options) {
    super(options)

    this.db = new MasterDatabase()
    this.voiceTracker = new VoiceTracker(this)
    this.bangaTracker = new BangaTracker()
    this.aliasTracker = new AliasTracker()
    this.voiceStateAdapter = new VoiceStateAdapter(this)
    this.stocksPortfolio = new StocksPortfolio()

    this.createMessageInterceptor()
    this.createDailyTracker()
    this.createTTS()

    this.on("guildCreate", guild => guild.createEmojis())
    this.on("voiceStateUpdate", (_oldVoice, newVoice) => {
      if (newVoice.id === this.user.id && newVoice.channelID) {
        newVoice.guild.music.setState({ voiceChannel: newVoice.channel })
      }
    })

    this.on("messageReactionAdd", (messageReaction, user) => {
      if (user.id !== this.user.id && messageReaction.emoji.name === "🐪") {
        const embed = messageReaction.message.embeds[0]
        if (embed) {
          const match = /(?<=\/dp\/)\w.+?\b/.exec(embed.url)
          if (match) {
            messageReaction.users.remove(user)

            if (!messageReaction.message.originalImage) {
              messageReaction.message.originalImage = embed.image.url
            }

            const newEmbed = embed.setImage(embed.image.url.includes("camelcamelcamel") ? messageReaction.message.originalImage : `https://charts.camelcamelcamel.com/uk/${match[0]}/amazon-new.png?force=1&zero=0&w=855&h=513&desired=false&legend=1&ilt=1&tp=all&fo=0&lang=en`)
            messageReaction.message.edit({ embed: newEmbed })
          }
        }
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
    }))
  }

  createTTS () {
    const TextToSpeechHandler = (ttsLastHappendTime, method, voiceObj) => {
      var currentTime = new Date().getTime()
      // Rate limit reduced for the time being
      if (ttsLastHappendTime + (5 * 1000) < currentTime || ttsLastHappendTime === undefined) {
        new TextToSpeech(this).run(method, voiceObj)
        return currentTime
      }
      return ttsLastHappendTime
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