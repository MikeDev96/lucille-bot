const { Command } = require("discord.js-commando")
const scrapeYt = require("scrape-yt").scrapeYt
const Track = require("../../classes/Track")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "wrong",
      aliases: [],
      group: "music",
      memberName: "wrong",
      description: "Allows you to pick another song if the topmost result isn't the one you want.",
      args: [
        {
          key: "index",
          prompt: "If a track in the queue is wrong then append the index of the song to this command.",
          type: "integer",
          default: -1,
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (msg.channel.guild.lucille) {
      const queueIndex = args.index === -1 ? 0 : args.index
      const queueItem = msg.channel.guild.lucille.state.queue[queueIndex]
      // We can only 'correct' a item in the queue that has been searched on YT
      if (queueItem && queueItem.link) {
        const query = queueItem.query
        if (query) {
          const searchResults = await scrapeYt.search(query, { limit: 5 })
          if (searchResults) {
            msg.react("🔍")

            await msg.reply("Respond with the number you'd like to replace.\nRespond with `cancel` to cancel the command. The command will automatically be cancelled in 30 seconds.\n\n" + searchResults.map((r, i) => `\`${i + 1}\` ${r.title}`).join("\n"))

            const filter = (message) => (/^[1-5]$/.test(message.content) || message.content === "cancel") && message.author.id === msg.author.id
            const collected = await msg.channel.awaitMessages(filter, { time: 30000, max: 1 })

            const reply = collected.first()
            if (reply && reply.content !== "cancel") {
              const index = parseInt(reply.content) - 1
              reply.react(["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"][index])

              const track = new Track()
                .clone(queueItem)
                .setYouTubeTitle(searchResults[index].title)
                .setThumbnail(searchResults[index].thumbnail)
                .setLink(`https://www.youtube.com/watch?v=${searchResults[index].id}`)

              if (queueIndex === 0) {
                msg.channel.guild.lucille.state.queue.splice(queueIndex + 1, 0, track)
                msg.channel.guild.lucille.dispatcherExec(d => d.end())
              }
              else {
                msg.channel.guild.lucille.state.queue.splice(queueIndex, 1, track)
                msg.channel.guild.lucille.updateEmbed()
              }
            }
            else {
              msg.reply("Cancelled command.")
            }
          }
        }
      }
    }
  }
}