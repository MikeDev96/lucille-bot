import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"
import TextToSpeech from "../../classes/TextToSpeech.js"
import { getRequestee, shouldIgnoreMessage } from "../../helpers.js"

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
      if (shouldIgnoreMessage(msg)) {
        msg.react("🖕")
        return
      }

      msg.react("🎙️")
      await TtsCommand.speak(msg, args.text)
    }
    catch (err) {
      msg.reply(err.message)
    }
  }

  static async speak (msg, text) {
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    const track = TextToSpeech.getTtsTrack(getRequestee(msg), text)

    await music.add([track], track.requestee, msg.member.voice.channel, false, msg.guild.systemChannel)
  }
}

export default TtsCommand