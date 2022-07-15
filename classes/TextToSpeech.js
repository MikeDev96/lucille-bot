import { textToStream } from "../helpers.js"
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
        const output = await textToStream(this.getMessage(event, user, channel))
        const music = voiceState.guild.music

        if (music.state.queue.length === 0) {
          this.playGTTSStream(voiceState, output)
        }
        else {
          music.syncTime()
          await this.playGTTSStream(voiceState, output)
          music.play("resume")
        }
      })
  }

  getMessage (event, user, channel) {
    user = user.toLowerCase()
    switch (event) {
    case "join": return `${user} has joined ${channel}`
    case "leave": return `${user} has left ${channel}`
    case "move": return `${user} has moved to ${channel}`
    default: throw new Error("Invalid case passed")
    }
  }

  validUsername (username) {
    if (username === null || username.length > 32 || !(RegExp(`^[a-zA-Z0-9 .]*$`).test(username))) {
      return false
    }
    return true
  }

  playGTTSStream (voiceState, stream) {
    return new Promise((resolve) => {
      const dispatcher = this.client.voice.connections
        .get(voiceState.guild.id)
        .play(stream)
      dispatcher.setVolumeLogarithmic(3)
      dispatcher.once("close", () => stream.destroy())
      dispatcher.once("finish", () => resolve())
    })
  }
}