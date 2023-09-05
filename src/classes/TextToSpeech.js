import LucilleClient from "./LucilleClient.js"
import Requestee from "../models/Requestee.js"
import Track from "../models/Track.js"
import { PLATFORM_TTS } from "./TrackExtractor.js"
/*
* TODO:
* Queue messages ie 2 people join at once
* Random voice each time
*/
export default class TextToSpeech {
  constructor (client) {
    this.client = client
  }

  run (event, voiceObj) {
    const { voiceState } = voiceObj
    const botID = this.client.user.id

    // Check for bot being in moved into or moved from channel
    if (event === "move") {
      if (!(voiceObj.fromChannel.members.has(botID) || voiceObj.toChannel.members.has(botID))) {
        return
      }
    }
    else {
      if (!voiceState.channel.members.has(botID)) {
        return
      }
    }

    voiceState.guild.members.fetch(voiceState.id)
      .then(async res => {
        const user = this.validUsername(res.displayName) ? res.displayName : "User"
        const channel = event === "move" ? voiceObj.toChannel.name : voiceState.channel.name
        const music = LucilleClient.Instance.getGuildInstance(voiceState.guild).music

        const requestee = new Requestee(voiceState.guild.members.me.displayName, voiceState.guild, voiceState.guild.client.user.id)
        const track = TextToSpeech.getTtsTrack(requestee, this.getMessage(event, user, channel))
        music.add([track], requestee, voiceState.channel, false, voiceState.guild.systemChannel)
      })
  }

  getMessage (event, user, channel) {
    switch (event) {
      case "join": return `${user} has joined ${channel}`
      case "leave": return `${user} has left ${channel}`
      case "move": return `${user} has moved to ${channel}`
      default: throw new Error("Invalid case passed")
    }
  }

  validUsername (username) {
    if (username === null || username.length > 32 || !/^[a-zA-Z0-9 .]*$/.test(username)) {
      return false
    }
    return true
  }

  static getTtsTrack (requestee, text) {
    return new Track()
      .setRequestee(requestee)
      .setPlatform(PLATFORM_TTS)
      .setQuery(text)
      .setLink("LINK")
      .setTitle(`TTS - ${text}`)
      .setDuration(0)
  }
}