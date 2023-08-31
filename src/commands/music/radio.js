import Command from "../../classes/Command.js"
import { getRequestee, getVoiceChannel, shouldIgnoreMessage } from "../../helpers.js"
import { PLATFORM_RADIO } from "../../classes/TrackExtractor.js"
import Track from "../../classes/Track.js"
import { createRequire } from "module"
import LucilleClient from "../../classes/LucilleClient.js"

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

    if (shouldIgnoreMessage(msg)) {
      msg.react("🖕")
      return
    }

    const track = new Track("", radio.name)
      .setPlatform(PLATFORM_RADIO)
      .setLink(radio.url)
      .setDuration(0)
      .setRadio(radio)

    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    const success = music.add([track], getRequestee(msg), getVoiceChannel(msg), false, msg.channel)
    if (success) {
      msg.react("📻")
    }
  }
}