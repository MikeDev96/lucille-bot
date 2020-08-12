const { Command } = require("discord.js-commando")
const radios = require("../../radios.json")
const { getRequestee, getVoiceChannel, getMusic } = require("../../messageHelpers")

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
    const music = getMusic(msg)
    const success = music.add(radios[args.station].url, getRequestee(msg), getVoiceChannel(msg), undefined)
    if (success) {
      msg.react("📻")
    }
  }
}