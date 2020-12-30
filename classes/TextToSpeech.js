const gTTS = require('gtts')
const fs = require('fs')

module.exports = class TextToSpeech {

    constructor(client) {
        this.client = client
    }

    async run(event, voiceObj) {

        const { voiceState } = voiceObj
        const botID = this.client['user']['id']

        if (event === "move") {
            if (!voiceObj.fromChannel['members'].has(botID) || !voiceObj.toChannel['members'].has(botID))
                return 
        } else {
            if (!voiceState.channel['members'].has(botID))
                return
        }

        voiceState.guild.members.fetch(voiceState.id)
            .then(res => {

                var gtts = new gTTS(this.getMessage(event, res['nickname'], 'en'), 'en-au')

                const path = "assets/tts/"
                gtts.save(`${path}tts.mp3`, (err, result) => {
                    if (err) throw new Error(err)
                    //Get the bots voice connection
                    this.client['voice']['connections'].get(voiceState.guild.id).play(fs.createReadStream(`${path}tts.mp3`))
                })
            })
    }

    getMessage(event, nickname) {
        switch (event) {
            case "join": return `${nickname} joined the channel`
            case "leave": return `${nickname} left channel`
            case "move": return `${nickname} moved channel`
            default: throw new Error("Invalid case passed")
        }
    }
}