const { Guild, Client, Util } = require("discord.js")
const Requestee = require("./Requestee")
const Music = require("./Music")

module.exports = class Helpers {
  static getRequestee (msg) {
    return new Requestee(msg.member.displayName, msg.author.displayAvatarURL(), msg.author.id)
  }

  static getVoiceChannel (msg) {
    return msg.member.voice.channel || msg.guild.channels.cache.find(c => c.type === "voice")
  }

  static getMusic (guild) {
    if (!(guild instanceof Guild)) {
      throw Error("Guild param must be instance of Guild")
    }

    return guild && guild.lucille
  }

  static getOrCreateMusic (msg) {
    return Helpers.getMusic(msg.channel.guild) || (msg.channel.guild.lucille = new Music(msg.channel))
  }

  static bootClientFromAllVoiceChannels (client) {
    if (!(client instanceof Client)) {
      throw Error("Client param must be instance of Client")
    }

    client.guilds.cache.forEach(guild => {
      guild.channels.cache.forEach(channel => {
        if (channel.type === "voice") {
          channel.members.forEach(member => {
            if (member.user === client.user) {
              member.voice.setChannel(null)
            }
          })
        }
      })
    })
  }

  static escapeMarkdown (text) {
    return Util.escapeMarkdown(text || "")
  }
}