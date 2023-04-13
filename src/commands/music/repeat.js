import Command from "../../classes/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"
import { mapRepeatTypeToEmoji } from "../../classes/Music.js"

export default class extends Command {
  constructor () {
    super({
      name: "repeat",
      aliases: ["rep"],
      group: "music",
      memberName: "repeat",
      description: "Repeat a track",
      args: [
        {
          key: "type",
          prompt: "Repeat the currently playing track or all tracks in the queue?",
          type: "string",
          oneOf: ["off", "one", "all"],
          default: "one",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = LucilleClient.Instance.getMusicInstance(msg.guild)
    music.setRepeat(args.type)

    const emoji = mapRepeatTypeToEmoji(args.type)
    if (emoji) {
      msg.react(emoji)
    }
  }
}