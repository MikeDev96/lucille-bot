import Command from "../../models/Command.js"
import { getVoiceChannel, shouldIgnoreMessage } from "../../helpers.js"
import { PLATFORM_RADIO } from "../../classes/TrackExtractor.js"
import Track from "../../models/Track.js"
import { createRequire } from "module"
import LucilleClient from "../../classes/LucilleClient.js"
import Requestee from "../../models/Requestee.js"

const require = createRequire(import.meta.url)
const radios = require("../../../radios.json")

export default class extends Command {
  constructor () {
    super({
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

    if (shouldIgnoreMessage(LucilleClient.Instance, msg)) {
      msg.react("🖕")
      return
    }

    const track = new Track("", radio.name)
      .setPlatform(PLATFORM_RADIO)
      .setLink(radio.url)
      .setDuration(0)
      .setRadio(radio)

    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    const success = music.add([track], Requestee.create(msg), getVoiceChannel(msg), false, msg.channel)
    if (success) {
      msg.react("📻")
    }
  }
}