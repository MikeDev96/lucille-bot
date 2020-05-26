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
            msg.react("❌")
            const numberChars = [":one:", ":two:", ":three:", ":four:", ":five:"]
            const replyMsg = await msg.reply("Select one of the videos below by reacting with the corresponding number:\n" + searchResults.map((r, i) => `${numberChars[i]} ${r.title}`).join("\n"))

            const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"]
            const filter = (reaction, user) => numberEmojis.includes(reaction.emoji.name) && user.id === msg.author.id
            replyMsg.awaitReactions(filter, { time: 60000, max: 1 })
              .then(collected => {
                replyMsg.delete()

                const firstKey = collected.firstKey()
                if (firstKey) {
                  msg.react(firstKey)

                  const index = numberEmojis.indexOf(firstKey)

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
              })
              .catch(err => console.log(err))

            for (let i = 0; i < numberEmojis.length; i++) {
              const char = numberEmojis[i]
              try {
                await replyMsg.react(char)
              }
              catch {
                // If it errors (probably because it's been deleted) then we don't care
                break
              }
            }
          }
        }
      }
    }
  }
}