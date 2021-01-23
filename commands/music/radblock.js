const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "radblock",
      aliases: ["radioadblock", "radb"],
      group: "music",
      memberName: "radblock",
      description: "",
      guildOnly: true,
      args: [
        {
          key: "method",
          prompt: "Specify how you'd like to block the ads",
          type: "string",
          oneOf: ["lower", "mute", "off"],
          default: "lower",
        },
      ],
    })
  }

  async run (msg, args) {
    const music = msg.guild.music
    music.state.radioAdBlock.setMethod(args.method)
  }
}