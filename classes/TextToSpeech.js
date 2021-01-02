const gTTS = require('gtts')
const { PassThrough } = require('stream')
const Track = require('./Track')
const Requestee = require("./Requestee")
const { getMusic } = require('../classes/Helpers')
const { PLATFORM_TTS } = require('../classes/TrackExtractor')

module.exports = class TextToSpeech {

    constructor(client) {
        this.client = client
    }

    async run(event, voiceObj) {

        const { voiceState } = voiceObj
        const botID = this.client['user']['id']

        //Check if bot is joining
        if(voiceState['id'] == botID)
            return 
        
        // Check for bot being in moved into or moved from channel
        if (event === "move") {
            if (!(voiceObj.fromChannel['members'].has(botID) || voiceObj.toChannel['members'].has(botID)))
                return
        } else {
            if (!voiceState.channel['members'].has(botID))
                return
        }

        voiceState.guild.members.fetch(voiceState.id)
            .then(res => {
                const gtts = new gTTS(
                    this.getMessage(
                        event,
                        this.validUsername(res['displayName']) ? res['displayName'] : 'User')
                    , 'en-au')

                const passThroughStream = new PassThrough({ highWaterMark: 1 << 25 })
                const output = gtts.stream().pipe(passThroughStream)
                const music = getMusic(voiceState.guild)

                if (music.state.queue.length == 0) {
                    const dispatcher = this.client['voice']['connections']
                        .get(voiceState.guild.id)
                        .play(output)
                    dispatcher.setVolumeLogarithmic(3)
                } else {

                    music.state.playTime += music.dispatcherExec(d => d.streamTime) || 0

                    const dispatcher = this.client['voice']['connections']
                        .get(voiceState.guild.id)
                        .play(output)
                    dispatcher.setVolumeLogarithmic(3)
                    
                    music.play("after")
                }
            })
    }

    getMessage(event, user) {
        switch (event) {
            case "join": return `${user} has joined`
            case "leave": return `${user} has left`
            case "move": return `${user} has moved`
            default: throw new Error("Invalid case passed")
        }
    }

    validUsername(username) {
        if (username === null || username.length > 10 || !(RegExp(`^[a-zA-Z0-9]*$`).test(username)))
            return false
        return true
    }
}