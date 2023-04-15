import Command from "../../classes/Command.js"
import TextToSpeech from "../../classes/TextToSpeech.js"
import { getRequestee } from "../../helpers.js"

class TtsCommand extends Command {
  constructor () {
    super({
      name: "tts",
      aliases: [],
      group: "fun",
      memberName: "tts",
      description: "Text to speech",
      args: [
        {
          key: "text",
          prompt: "Enter the text you want to speak",
          type: "string",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    try {
      if (msg.member.voice.channel) {
        msg.react("🎙️")

        const music = msg.guild.music
        const track = TextToSpeech.getTtsTrack(getRequestee(msg), args.text)

        music.add([track], track.requestee, msg.member.voice.channel, false, msg.guild.systemChannel)
      }
      else {
        msg.react("🖕")
      }
    }
    catch (err) {
      msg.reply(err.message)
    }
  }
}

export default TtsCommand