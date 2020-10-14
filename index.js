const Commando = require("discord.js-commando")
const path = require("path")
const config = require("./config.json")
const fs = require("fs")
const VoiceTracker = require("./classes/VoiceTracker")
const MusicTracker = require("./classes/MusicTracker")
const BangaTracker = require("./classes/BangaTracker")
const AliasTracker = require("./classes/AliasTracker")
const MasterDatabase = require("./classes/MasterDatabase")

require("dotenv").config()

const emojis = [
  { name: "youtube", path: "assets/emojis/youtube.png" },
  { name: "spotify", path: "assets/emojis/spotify.png" },
  { name: "tidal", path: "assets/emojis/tidal_white.png" },
  { name: "apple", path: "assets/emojis/applemusic.png" },
  { name: "soundcloud", path: "assets/emojis/soundcloud.png" },
  // { name: "search", path: "assets/emojis/search_white.png" },
]

const client = new Commando.CommandoClient({
  owner: config.discord.owner,
})

client.registry
  .registerGroup("music", "Music")
  .registerGroup("whitelist", "Whitelist")
  .registerGroup("misc", "Miscellaneous")
  .registerGroup("fun", "Fun")
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
            guild.emojis.create(data, emoji.name, { roles: [botRole], reason: "Used by Tidify" })
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

  client.voiceTracker = new VoiceTracker(client)
  client.musicTracker = new MusicTracker(client)
  client.bangaTracker = new BangaTracker(client)
  client.aliasTracker = new AliasTracker(client)
  client.db = new MasterDatabase()

  client.on("message", msg => client.musicTracker.run(msg))
})

client.on("guildCreate", createEmojis)

client.login(config.discord.token)

exports.emojis = emojis