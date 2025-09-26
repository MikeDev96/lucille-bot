import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"
import TextToSpeech from "../../classes/TextToSpeech.js"
import { shouldIgnoreMessage } from "../../helpers.js"
import Requestee from "../../models/Requestee.js"

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
      if (shouldIgnoreMessage(LucilleClient.Instance, msg)) {
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
    try {
      if (!msg.member.voice || !msg.member.voice.channel) {
        throw new Error("You need to be in a voice channel to use TTS")
      }
      
      const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
      const track = TextToSpeech.getTtsTrack(Requestee.create(msg), text)

      await music.add([track], track.requestee, msg.member.voice.channel, false, msg.guild.systemChannel)
    } catch (error) {
      throw new Error(`TTS failed: ${error.message}`)
    }
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "🎙️ TTS Command Help",
          description: "Convert text to speech and play it in your voice channel!",
          color: 0x1e90ff,
          fields: [
            {
              name: "🎤 Usage",
              value: `\`${prefix}tts <text>\`\nConvert text to speech\nExample: \`${prefix}tts Hello world!\``,
              inline: false
            },
            {
              name: "🔊 Requirements",
              value: "• You must be in a voice channel\n• Bot must have voice permissions\n• Text will be added to music queue",
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• TTS is automatically used by the joke command\n• Works with any text input\n• Uses the bot's music system",
              inline: false
            }
          ],
          footer: {
            text: "Speak your mind! 🗣️",
          },
        },
      ],
    }
  }
}

export default TtsCommand