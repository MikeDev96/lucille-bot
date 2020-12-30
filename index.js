const Commando = require("discord.js-commando")
const path = require("path")
const config = require("./config.json")
const fs = require("fs")
const VoiceTracker = require("./classes/VoiceTracker")
const VoiceStateAdapter = require("./classes/VoiceStateAdapter")
const MusicTracker = require("./classes/MusicTracker")
const BangaTracker = require("./classes/BangaTracker")
const AliasTracker = require("./classes/AliasTracker")
const DailyTracker = require("./classes/DailyTracker")
const MasterDatabase = require("./classes/MasterDatabase")
const TextToSpeech = require("./classes/TextToSpeech")
// const VoiceCommands = require("./classes/VoiceCommands")
const { bootClientFromAllVoiceChannels } = require("./classes/Helpers")
const { ppResetDaily } = require("./commands/fun/pp")
const { aocResetDaily } = require("./commands/fun/aocleaderboard")
const { imposterReleaseCountdown } = require("./commands/fun/imposter")
const { bansheeResetDaily } = require("./commands/destiny/banshee")
const express = require("express")
const dotenv = require("dotenv")
const { default: RedditRipper, router: redditRoutes } = require("./classes/RedditRipper")
const MessageInterceptor = require("./classes/MessageInterceptor")
const { default: AmazonRipper } = require("./classes/AmazonRipper")
const { default: TikTokRipper, router: tiktokRoutes } = require("./classes/TikTokRipper")

dotenv.config()

const emojis = [
  { name: "youtube", path: "assets/emojis/youtube.png" },
  { name: "spotify", path: "assets/emojis/spotify.png" },
  { name: "tidal", path: "assets/emojis/tidal_white.png" },
  { name: "apple", path: "assets/emojis/applemusic.png" },
  { name: "soundcloud", path: "assets/emojis/soundcloud.png" },
  // { name: "search", path: "assets/emojis/search_white.png" },
  { name: "amazon", path: "assets/emojis/amazon.png" },
]

const app = express()
const client = new Commando.CommandoClient({
  owner: config.discord.owner,
  commandPrefix: config.discord.prefix,
})

client.registry
  .registerGroup("music", "Music")
  .registerGroup("whitelist", "Whitelist")
  .registerGroup("misc", "Miscellaneous")
  .registerGroup("fun", "Fun")
  .registerGroup("destiny", "Destiny")
  .registerDefaults()
  .registerCommandsIn(path.join(__dirname, "commands"))

const createEmojis = guild => {
  const emojiPermissions = guild.members.cache.find(m => m.user.id === client.user.id).hasPermission("MANAGE_EMOJIS")
  if (emojiPermissions) {
    const botRole = guild.roles.cache.find(r => r.name !== "@everyone" && r.members.has(client.user.id))
    emojis.forEach(emoji => {
      if (!guild.emojis.cache.find(e => e.name === emoji.name)) {
        fs.readFile(emoji.path, (err, data) => {
          if (!err) {
            guild.emojis.create(data, emoji.name, { roles: [botRole], reason: "Used by Lucille" })
          }
          else {
            console.log(err)
          }
        })
      }
    })
  }
  else {
    console.log("Could not create emojis on " + guild.name)
  }
}

client.once("ready", () => {
  console.log("Discord client ready")

  client.guilds.cache.forEach(createEmojis)

  client.db = new MasterDatabase()
  client.dailyTracker = new DailyTracker(client, "18:00:00")
  client.voiceTracker = new VoiceTracker(client)
  client.bangaTracker = new BangaTracker(client)
  client.aliasTracker = new AliasTracker(client)
  client.voiceStateAdapter = new VoiceStateAdapter(client)
  // client.voiceCommands = new VoiceCommands(client)

  client.messageInterceptor = new MessageInterceptor(client)
  client.messageInterceptor.on("message", msg => {
    new MusicTracker().run(msg)
    new RedditRipper().runMessage(msg)
    new AmazonRipper().runMessage(msg)
    new TikTokRipper().runMessage(msg)
  })

  bootClientFromAllVoiceChannels(client)

  client.dailyTracker.on("reset", () => client.guilds.cache.forEach(guild => {
    ppResetDaily(client, guild)
    aocResetDaily(guild)
    imposterReleaseCountdown(client, guild)

    // Destiny daily reset
    bansheeResetDaily(guild)
  }))

  client.voiceStateAdapter.on("join", (voiceObj) => {new TextToSpeech(client).run("join", voiceObj)})
  client.voiceStateAdapter.on("leave", (voiceObj) => {new TextToSpeech(client).run("leave", voiceObj)})
  client.voiceStateAdapter.on("move", (voiceObj) => {new TextToSpeech(client).run("move", voiceObj)})

})

client.on("guildCreate", createEmojis)

const connect = async () => {
  try {
    await client.login(config.discord.token)
  }
  catch (err) {
    console.log(`Failed to connect to Discord, retrying in 5 seconds...\n${err.message}`)
    setTimeout(async () => {
      await connect()
    }, 5000)
  }
}

connect()

app.use("/", redditRoutes)
app.use("/", tiktokRoutes)
app.listen(process.env.PORT, () => console.log(`Lucille API listening at http://localhost:${process.env.PORT}`))

exports.emojis = emojis