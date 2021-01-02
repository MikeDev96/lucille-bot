const gTTS = require('gtts')
const { PassThrough } = require('stream')
const { getMusic } = require('../classes/Helpers')
/*
* TODO: 
* Queue messages ie 2 people join at once
* Random voice each time
*/
module.exports = class TextToSpeech {

    constructor(client) {
        this.client = client
    }

    async run(event, voiceObj) {

        const { voiceState } = voiceObj
        const botID = this.client['user']['id']

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
                        this.validUsername(res['displayName']) ? res['displayName'] : 'User',
                        event === "move" ? voiceObj.toChannel['name'] : voiceState.channel['name'] )
                    , 'en-au')

                const passThroughStream = new PassThrough({ highWaterMark: 1 << 25 })
                const output = gtts.stream().pipe(passThroughStream)
                const music = getMusic(voiceState.guild)

                if (music.state.queue.length == 0) {
                    this.playGTTSStream(voiceState, output)
                } else {
                    music.state.playTime += music.dispatcherExec(d => d.streamTime) || 0
                    this.playGTTSStream(voiceState, output)

                    //Gives a less abrupt end to the TTS message
                    setTimeout(() => {
                        music.play("after")
                    }, 400);
                }
            })
    }

    getMessage(event, user, channel) {
        switch (event) {
            case "join": return `${user} has joined ${channel}`
            case "leave": return `${user} has left ${channel}`
            case "move": return `${user} has moved to ${channel}`
            default: throw new Error("Invalid case passed")
        }
    }

    validUsername(username) {
        if (username === null || username.length > 15 || !(RegExp(`^[a-zA-Z0-9 ]*$`).test(username)))
            return false
        return true
    }

    playGTTSStream(voiceState, stream) {
        const dispatcher = this.client['voice']['connections']
            .get(voiceState.guild.id)
            .play(stream)
        dispatcher.setVolumeLogarithmic(3)
    }
}