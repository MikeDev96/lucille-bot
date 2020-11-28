const { Command } = require("discord.js-commando")
const { getOrCreateMusic } = require("../../classes/Helpers")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "reverse",
      aliases: ["rev"],
      group: "music",
      memberName: "reverse",
      description: "Reverses the queue including the current playing track.",
      args: [],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = getOrCreateMusic(msg)
    music.state.queue.reverse()
    music.searchAndPlay()
    msg.react("◀️")
  }
}