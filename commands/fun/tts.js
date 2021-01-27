const { Command } = require("discord.js-commando")
const { textToStream } = require("../../helpers")

class TtsCommand extends Command {
  constructor (client) {
    super(client, {
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
        music.syncTime()

        const notInVoice = !msg.guild.voice || !msg.guild.voice.channel
        if (notInVoice) {
          await msg.member.voice.channel.join()
        }

        await TtsCommand.speak(msg, args.text)

        if (notInVoice) {
          msg.member.voice.channel.leave()
        }
        else {
          music.play()
        }
      }
      else {
        msg.react("🖕")
      }
    }
    catch (err) {
      msg.reply(err.message)
    }
  }

  static async speak (msg, text) {
    const stream = await textToStream(text)

    return new Promise((resolve, reject) => {
      const dispatcher = msg.guild.voice.connection.play(stream, { volume: 5 })
      dispatcher.on("finish", () => resolve())
      dispatcher.on("error", err => reject(err))
    })
  }
}

module.exports = TtsCommand