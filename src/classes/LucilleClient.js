// import VoiceTracker from "./VoiceTracker.js"
// import VoiceStateAdapter from "./VoiceStateAdapter.js"
// import MusicTracker from "./MusicTracker.js"
// import BangaTracker from "./BangaTracker.js"
// import AliasTracker from "./AliasTracker.js"
// import DailyTracker from "./DailyTracker.js"
// import MasterDatabase from "./MasterDatabase.js"
// import RedditRipper from "./RedditRipper.js"
// import MessageInterceptor from "./MessageInterceptor.js"
// import AmazonRipper from "./AmazonRipper.js"
// import TikTokRipper from "./TikTokRipper.js"
// import { ppResetDaily } from "../commands/fun/pp.js"
// import TextToSpeech from "./TextToSpeech.js"
// import StocksPortfolio from "./StocksPortfolio.js"
// import VoiceCommands from "./VoiceCommands.js"
import { globby } from "globby"
import { Client, Events, GatewayIntentBits } from "discord.js"

export default class LucilleClient {
  constructor () {
    this.client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages] })
    this.client.once("ready", () => console.log("Discord client ready"))
    this.registerCommands()
    this.monitorCommands()

    // this.db = new MasterDatabase()
    // this.voiceTracker = new VoiceTracker(this)
    // this.bangaTracker = new BangaTracker()
    // this.aliasTracker = new AliasTracker()
    // this.voiceStateAdapter = new VoiceStateAdapter(this)
    // this.stocksPortfolio = new StocksPortfolio()
    // this.voiceCommands = new VoiceCommands(this)

    // this.createMessageInterceptor()
    // this.createDailyTracker()
    // this.createTTS()

    // this.on("guildCreate", guild => guild.createEmojis())
    // this.on("voiceStateUpdate", (_oldVoice, newVoice) => {
    //   if (newVoice.id === this.user.id && newVoice.channelID) {
    //     newVoice.guild.music.setState({ voiceChannel: newVoice.channel })
    //   }
    // })
  }

  createMessageInterceptor () {
    // const amazonRipper = new AmazonRipper(this)

    // this.messageInterceptor = new MessageInterceptor(this)
    // this.messageInterceptor.on("message", msg => {
    //   new MusicTracker().run(msg)
    //   new RedditRipper().runMessage(msg)
    //   amazonRipper.runMessage(msg)
    //   // new TikTokRipper().runMessage(msg)
    // })
  }

  createDailyTracker () {
    // this.dailyTracker = new DailyTracker(this, "18:00:00")
    // this.dailyTracker.on("reset", () => this.guilds.cache.forEach(guild => {
    //   ppResetDaily(this, guild)
    // }))
  }

  createTTS () {
    // const TextToSpeechHandler = (ttsLastHappendTime, method, voiceObj) => {
    //   const currentTime = new Date().getTime()
    //   // Rate limit reduced for the time being
    //   if (ttsLastHappendTime + (5 * 1000) < currentTime || ttsLastHappendTime === undefined) {
    //     new TextToSpeech(this).run(method, voiceObj)
    //     return currentTime
    //   }
    //   return ttsLastHappendTime
    // }

    // const ttsLastHappend = {}
    // const methodArr = ["join", "leave", "move"]

    // methodArr.forEach(method => {
    //   this.voiceStateAdapter.on(method, (voiceObj) => {
    //     // Check if bot
    //     if (voiceObj.voiceState.id !== this.user.id) {
    //       ttsLastHappend[voiceObj.voiceState.id] = TextToSpeechHandler(ttsLastHappend[voiceObj.voiceState.id], method, voiceObj)
    //     }
    //   })
    // })
  }

  async connect (token) {
    try {
      await this.client.login(token)
    }
    catch (err) {
      console.log(`Failed to connect to Discord, retrying in 5 seconds...\n${err.message}`)
      setTimeout(async () => {
        await this.connect(token)
      }, 5000)
    }
  }

  async registerCommands () {
    try {
      const commandFilenames = (await globby("src/commands/**/*.js", { absolute: true })).filter(c => /yousync/.test(c))
      const commands = (await Promise.all(commandFilenames.map(l => import(`file://${l}`)))).map(c => c.default)
      this.commands = commands

      console.log(`Registered ${commands.length} commands`)
    }
    catch (err) {
      console.error(`Failed to import commands\n${err.toString()}`)
      return []
    }
  }

  async monitorCommands () {
    this.client.on(Events.MessageCreate, msg => this.executeCommand(msg))
  }

  async executeCommand (msg) {
    try {
      const match = msg.content.match(/^;(?<cmd>\w+?)\s+?(?<args>.+?)$/)
      if (!match) return

      const { cmd: cmdName, args } = match.groups

      const argsArr = args.split(" ")

      const cmd = this.commands.find(c => c.config.name === cmdName)
      const argsMap = cmd.config.args.reduce((acc, cur, idx) => {
        acc[cur.key] = argsArr[idx] ?? ""
        return acc
      }, {})

      try {
        cmd.run(msg, argsMap)
      }
      catch (err) {
        msg.reply(`Oh snap, something went wrong... see error below,\n\n${err.toString()}`)
      }
    }
    catch (err) {
      console.error(err)
    }
  }
}

export const lucilleClient = new LucilleClient()