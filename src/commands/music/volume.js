import Command from "../../classes/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
      name: "volume",
      aliases: ["vol"],
      group: "music",
      memberName: "volume",
      description: "Changes the volume of the player.",
      args: [
        {
          key: "volume",
          prompt: "Enter volume between 1 & 300",
          type: "integer",
          validate: num => num >= 1 && num <= 300,
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    const currentVol = music.state.volume

    music.setVolume(args.volume)

    msg.react(args.volume > currentVol ? "🔊" : args.volume < currentVol ? "🔉" : "🔈")
  }
}