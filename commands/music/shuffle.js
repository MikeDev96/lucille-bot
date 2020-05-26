const { Command } = require("discord.js-commando")
const { shuffle } = require("../../helpers")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "shuffle",
      aliases: ["shuf", "shuff"],
      group: "music",
      memberName: "shuffle",
      description: "Shuffles the queue.",
      args: [],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (msg.channel.guild.lucille) {
      const shuffledTracks = msg.channel.guild.lucille.state.queue.splice(1)
      shuffle(shuffledTracks)
      msg.channel.guild.lucille.state.queue.push(...shuffledTracks)
      msg.channel.guild.lucille.updateEmbed()
      msg.react("🔀")
    }
  }
}