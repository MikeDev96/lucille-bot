// import VoiceTracker from "./VoiceTracker.js"
import VoiceStateAdapter from "./VoiceStateAdapter.js"
import MusicTracker from "./MusicTracker.js"
import BangaTracker from "./BangaTracker.js"
import AliasTracker from "./AliasTracker.js"
import DailyTracker from "./DailyTracker.js"
import MasterDatabase from "./MasterDatabase.js"
import RedditRipper from "./RedditRipper.js"
import MessageInterceptor from "./MessageInterceptor.js"
import AmazonRipper from "./AmazonRipper.js"
// import TikTokRipper from "./TikTokRipper.js"
import { ppResetDaily } from "../commands/fun/pp.js"
import TextToSpeech from "./TextToSpeech.js"
import StocksPortfolio from "./StocksPortfolio.js"
// import VoiceCommands from "./VoiceCommands.js"
import { globby } from "globby"
import { Client, Events, GatewayIntentBits } from "discord.js"
import LucilleGuild from "./LucilleGuild.js"

export default class LucilleClient {
  static Instance = new LucilleClient()

  constructor () {
    this.client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageReactions] })
    this.client.once(Events.ClientReady, () => console.log("Discord client ready"))
    this.registerCommands()
    this.monitorCommands()
    this.guildInstances = {}

    this.db = new MasterDatabase()
    // this.voiceTracker = new VoiceTracker(this)
    this.bangaTracker = new BangaTracker()
    this.aliasTracker = new AliasTracker()
    this.voiceStateAdapter = new VoiceStateAdapter(this.client)
    this.stocksPortfolio = new StocksPortfolio()
    // this.voiceCommands = new VoiceCommands(this)

    this.createMessageInterceptor()
    this.createDailyTracker()
    this.createTTS()

    this.client.on(Events.VoiceStateUpdate, (_oldVoice, newVoice) => {
      if (newVoice.id === this.client.user.id && newVoice.channelId) {
        LucilleClient.Instance.getGuildInstance(newVoice.guild).music.setState({ voiceChannel: newVoice.channel })
      }
    })

    this.setupGuilds()
  }

  createMessageInterceptor () {
    const amazonRipper = new AmazonRipper(this.client)

    this.messageInterceptor = new MessageInterceptor(this)
    this.messageInterceptor.on("message", msg => {
      new MusicTracker().run(msg)
      new RedditRipper().runMessage(msg)
      amazonRipper.runMessage(msg)
      // new TikTokRipper().runMessage(msg)
    })
  }

  createDailyTracker () {
    this.dailyTracker = new DailyTracker(this, "18:00:00")
    this.dailyTracker.on("reset", () => this.client.guilds.cache.forEach(guild => {
      ppResetDaily(this.client, guild)
    }))
  }

  createTTS () {
    const TextToSpeechHandler = (ttsLastHappendTime, method, voiceObj) => {
      const currentTime = new Date().getTime()
      // Rate limit reduced for the time being
      if (ttsLastHappendTime + (5 * 1000) < currentTime || ttsLastHappendTime === undefined) {
        new TextToSpeech(this.client).run(method, voiceObj)
        return currentTime
      }
      return ttsLastHappendTime
    }

    const ttsLastHappend = {}
    const methodArr = ["join", "leave", "move"]

    methodArr.forEach(method => {
      this.voiceStateAdapter.on(method, (voiceObj) => {
        // Check if bot
        if (voiceObj.voiceState.id !== this.client.user.id) {
          ttsLastHappend[voiceObj.voiceState.id] = TextToSpeechHandler(ttsLastHappend[voiceObj.voiceState.id], method, voiceObj)
        }
      })
    })
  }

  async connect (token) {
    try {
      await this.client.login(token)
    }
    catch (err) {
      console.log(`Failed to connect to Discord, retrying in 5 seconds...\n${err.message}`)
      setTimeout(async () => {
        await this.client.login(token)
      }, 5000)
    }
  }

  async registerCommands () {
    try {
      const commandFilenames = (await globby("src/commands/**/*.js", { absolute: true }))
      const commands = []

      for (const commandFilename of commandFilenames) {
        const Command = await this.importCommand(commandFilename)
        if (!Command) continue

        const cmd = new Command()
        commands.push(cmd)
        commands.push(...cmd.config.aliases.map(a => {
          const cmd = new Command()
          cmd.config.name = a
          return cmd
        }))
      }

      this.commands = commands

      console.log(`Registered ${commandFilenames.length} commands`)
    }
    catch (err) {
      console.error(`Failed to import commands\n${err.toString()}`)
      return []
    }
  }

  async importCommand (filename) {
    try {
      const c = await import(`file://${filename}`)
      return c.default
    }
    catch (err) {
      console.error(`Failed to import ${filename}\n${err}`)
    }
  }

  async monitorCommands () {
    this.client.on(Events.MessageCreate, msg => this.executeCommand(msg))
  }

  async executeCommand (msg) {
    try {
      const match = this.parseMessage(msg)
      if (!match) return

      const { cmd: cmdName, args } = match.groups

      const cmd = this.commands.find(c => c.config.name === cmdName)
      if (!cmd) return

      const argsRes = this.parseArguments(cmd.config.args, args)
      if (typeof argsRes === "string") {
        msg.reply(argsRes)
        return
      }

      try {
        cmd.run(msg, argsRes)
      }
      catch (err) {
        msg.reply(`Oh snap, something went wrong... see error below,\n\n${err.toString()}`)
      }
    }
    catch (err) {
      console.error(err)
    }
  }

  parseMessage (msg) {
    return msg.content.match(new RegExp(`^${this.commandPrefix}(?<cmd>\\w+?)(?:\\s+?(?<args>.+?))?$`))
  }

  castValue (type, value) {
    switch (type) {
      case "integer": return parseInt(value)
      case "float": return parseFloat(value)
      default: return value
    }
  }

  parseArguments (configArgs, userArgs) {
    const argsArr = userArgs?.split(" ")

    const argsMap = {}
    for (let idx = 0; idx < configArgs?.length; idx++) {
      const cur = configArgs[idx]
      const strValue = argsArr?.[idx] ?? cur.default ?? ""
      const value = this.castValue(cur.type, strValue)

      const valid = cur.validate ? cur.validate(value) : true
      if (typeof valid === "string" || !valid) {
        return valid ? `${cur.key} - ${valid}` : cur.prompt
      }

      argsMap[cur.key] = cur.type === "integer" ? parseInt(strValue) : strValue
    }

    return argsMap
  }

  setupGuilds () {
    this.client.once(Events.ClientReady, () => {
      for (const [, guild] of this.client.guilds.cache) {
        this.getGuildInstance(guild)
      }
    })

    this.client.on(Events.GuildCreate, guild => this.getGuildInstance(guild))
  }

  getGuildInstance (guild) {
    return this.guildInstances[guild.id] || (this.guildInstances[guild.id] = new LucilleGuild(guild))
  }

  get commandPrefix () {
    return process.env.DISCORD_PREFIX
  }
}