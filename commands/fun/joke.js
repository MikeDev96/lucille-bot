const { Command } = require("discord.js-commando")
const fetch = require("node-fetch")
const { sleep } = require("../../helpers")
const TtsCommand = require("./tts")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
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
        const isBotInSameChannel = msg.member.voice.channel.members.has(this.client.user.id)

        await msg.member.voice.channel.join()
        await TtsCommand.speak(msg, text)

        if (json.type === "twopart") {
          await sleep(1000)
          doDelivery()
          await TtsCommand.speak(msg, json.delivery)
        }

        if (!isBotInSameChannel) {
          msg.member.voice.channel.leave()
        }
        else {
          const music = msg.guild.music
          music.play()
        }
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
}