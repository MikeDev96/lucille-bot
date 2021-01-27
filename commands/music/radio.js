const { Command } = require("discord.js-commando")
const radios = require("../../radios.json")
const { getRequestee, getVoiceChannel } = require("../../helpers")
const { PLATFORM_RADIO } = require("../../classes/TrackExtractor")
const Track = require("../../classes/Track")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "radio",
      aliases: ["r", "rad", "fm"],
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
    const radio = radios[args.station]
    if (!radio) {
      return
    }

    const track = new Track("", radio.name, "")
      .setPlatform(PLATFORM_RADIO)
      .setLink(radio.url)
      .setDuration(0)
      .setRadio(radio)

    const music = msg.guild.music
    const success = music.add([track], getRequestee(msg), getVoiceChannel(msg), false, msg.channel)
    if (success) {
      msg.react("📻")
    }
  }
}