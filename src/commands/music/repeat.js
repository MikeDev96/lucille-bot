import Commando from "discord.js-commando"
import { mapRepeatTypeToEmoji } from "../../classes/Music.js"
const { Command } = Commando

export default class PlayCommand extends Command {
  constructor (client) {
    super(client, {
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
    const music = msg.guild.music
    music.setRepeat(args.type)

    const emoji = mapRepeatTypeToEmoji(args.type)
    if (emoji) {
      msg.react(emoji)
    }
  }
}