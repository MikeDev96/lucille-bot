const { Command } = require("discord.js-commando")
const radios = require("../../radios.json")
const { getRequestee, getVoiceChannel } = require("../../messageHelpers")
const Music = require("../../classes/Music")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "radio",
      aliases: ["rad", "fm"],
      group: "music",
      memberName: "radio",
      description: "Plays a radio station",
      args: [
        {
          key: "station",
          prompt: "Search for a song or paste some link(s) to play.",
          type: "string",
          oneOf: Object.keys(radios),
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (!msg.channel.guild.lucille) {
      msg.channel.guild.lucille = new Music(msg.channel)
    }

    const success = msg.channel.guild.lucille.add(radios[args.station].url, getRequestee(msg), getVoiceChannel(msg), undefined)
    if (success) {
      msg.react("▶️")
    }
  }
}