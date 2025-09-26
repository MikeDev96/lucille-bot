import fetch from "node-fetch"
import { sleep } from "../../helpers.js"
import TtsCommand from "./tts.js"
import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
      name: "joke",
      aliases: [],
      group: "fun",
      memberName: "joke",
      description: "Tell me a joke",
      args: [
        {
          key: "category",
          prompt: "Enter a joke category",
          type: "string",
          oneOf: ["any", "misc", "programming", "dark", "pun", "spooky", "christmas"],
          default: "any",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    try {
      const res = await fetch(`https://v2.jokeapi.dev/joke/${args.category}`)
      const json = await res.json()

      const text = `Here's a ${json.category.toLowerCase()} joke:\n${json.type === "single" ? json.joke : json.setup}`
      const reply = msg.reply(text)

      const doDelivery = () => reply.then(msg => msg.edit(`${text}\n\n**${json.delivery}**`))

      if (msg.member.voice.channel) {
        // TODO: Get 2 TTS streams and combine them with a pause in the middle and pass that to the music player instead
        await TtsCommand.speak(msg, text)

        const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
        const ttsStream = music.playing.stream

        ttsStream.once("finish", async () => {
          if (json.type === "twopart") {
            await sleep(1000)
            doDelivery()
            TtsCommand.speak(msg, json.delivery)
          }
        })
      }
      else {
        if (json.type === "twopart") {
          await sleep(3000)
          doDelivery()
        }
      }
    }
    catch (err) {
      msg.reply(err.message)
    }
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "😄 Joke Command Help",
          description: "Get random jokes with optional categories and TTS support!",
          color: 0xffa500,
          fields: [
            {
              name: "🎭 Categories",
              value: `\`${prefix}joke\` - Random joke\n\`${prefix}joke any\` - Any category\n\`${prefix}joke misc\` - Miscellaneous\n\`${prefix}joke programming\` - Programming jokes\n\`${prefix}joke dark\` - Dark humor\n\`${prefix}joke pun\` - Puns\n\`${prefix}joke spooky\` - Spooky jokes\n\`${prefix}joke christmas\` - Christmas jokes`,
              inline: false
            },
            {
              name: "🎙️ TTS Support",
              value: "If you're in a voice channel, jokes will be spoken aloud!",
              inline: true
            },
            {
              name: "💡 Tips",
              value: "• Two-part jokes have a 3-second delay for the punchline\n• TTS works automatically in voice channels\n• All jokes are from JokeAPI",
              inline: false
            }
          ],
          footer: {
            text: "Powered by JokeAPI • Laugh responsibly! 😂",
          },
        },
      ],
    }
  }
}