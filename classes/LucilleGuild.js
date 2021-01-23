const { Structures } = require("discord.js")
const Music = require("./Music")
const fs = require("fs")

module.exports = Structures.extend("Guild", Guild => {
  class LucilleGuild extends Guild {
    constructor (client, data) {
      super(client, data)

      this.music = new Music(this)
      this.customEmojis = {}

      this.client.once("ready", () => {
        this.createEmojis()
      })
    }

    createEmojis () {
      const emojiPermissions = this.members.cache.find(m => m.user.id === this.client.user.id).hasPermission("MANAGE_EMOJIS")
      if (emojiPermissions) {
        const botRole = this.roles.cache.find(r => r.name !== "@everyone" && r.members.has(this.client.user.id))
        emojis.forEach(emoji => {
          if (!this.emojis.cache.find(e => e.name === emoji.name)) {
            fs.readFile(emoji.path, (err, data) => {
              if (!err) {
                this.emojis.create(data, emoji.name, { roles: [botRole], reason: "Used by Lucille" })
              }
              else {
                console.log(err)
              }
            })
          }

          this.customEmojis[emoji.name] = this.emojis.cache.find(e => e.name === emoji.name).toString()
        })
      }
      else {
        console.log("Could not create emojis on " + this.name)
      }
    }
  }

  return LucilleGuild
})

const emojis = [
  { name: "youtube", path: "assets/emojis/youtube.png" },
  { name: "spotify", path: "assets/emojis/spotify.png" },
  { name: "tidal", path: "assets/emojis/tidal_white.png" },
  { name: "apple", path: "assets/emojis/applemusic.png" },
  { name: "soundcloud", path: "assets/emojis/soundcloud.png" },
  { name: "amazon", path: "assets/emojis/amazon.png" },
]