const { Command } = require("discord.js-commando")
module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "clear",
      aliases: ["cls"],
      group: "music",
      memberName: "clear",
      description: "Clears the queue.",
      guildOnly: true,
    })
  }

  async run (msg, _args) {
    const music = msg.guild.music
    if (music.state.queue.length > 1) {
      const replyMsg = await msg.reply(`Are you sure you want to clear ${music.state.queue.length - 1} song(s) from the queue?\nReply with yes or no [y | n]`)
      const collected = await replyMsg.channel.awaitMessages(resMsg => resMsg.author.id === msg.author.id && /y|n/i.test(resMsg.content), { max: 1, time: 15000 })

      replyMsg.delete()

      const firstMsg = collected.first()
      if (firstMsg) {
        if (/y/i.test(firstMsg.content)) {
          firstMsg.react("🗑️")
          music.state.queue.splice(1)
          music.setState({ queue: music.state.queue })
          music.updateEmbed()
        }
      }
    }
  }
}