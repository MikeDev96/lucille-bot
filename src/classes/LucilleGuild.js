import { PermissionsBitField } from "discord.js"
import fs from "fs"
import MusicPlayer from "./MusicPlayer.js"

export default class LucilleGuild {
  constructor (guild) {
    this.guild = guild
    this.music = new MusicPlayer(guild)
    this.customEmojis = {}

    this.createEmojis()
  }

  createEmojis () {
    const emojiPermissions = this.guild.members.cache.find(m => m.user.id === this.guild.client.user.id).permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)
    if (emojiPermissions) {
      const botRole = this.guild.roles.cache.find(r => r.name !== "@everyone" && r.members.has(this.guild.client.user.id))
      emojis.forEach(emoji => {
        if (!this.guild.emojis.cache.find(e => e.name === emoji.name)) {
          fs.readFile(emoji.path, (err, data) => {
            if (!err) {
              this.guild.emojis.create(data, emoji.name, { roles: [botRole], reason: "Used by Lucille" })
                .then(guildEmoji => {
                  this.customEmojis[emoji.name] = guildEmoji.toString()
                })
            }
            else {
              console.log(err)
            }
          })
        }
        else {
          this.customEmojis[emoji.name] = this.guild.emojis.cache.find(e => e.name === emoji.name).toString()
        }
      })
    }
    else {
      console.log("Could not create emojis on " + this.guild.name)
    }
  }

  get voice () {
    return this.guild.voiceStates.cache.get(this.guild.client.user.id)
  }
}

const emojis = [
  { name: "youtube", path: "assets/emojis/youtube.png" },
  { name: "spotify", path: "assets/emojis/spotify.png" },
  { name: "tidal", path: "assets/emojis/tidal_white.png" },
  { name: "apple", path: "assets/emojis/applemusic.png" },
  { name: "soundcloud", path: "assets/emojis/soundcloud.png" },
  { name: "amazon", path: "assets/emojis/amazon.png" },
]