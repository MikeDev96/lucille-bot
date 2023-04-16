import LucilleClient from "../../classes/LucilleClient.js"
import { searchYouTube, msToTimestamp } from "../../helpers.js"
import Track from "../../classes/Track.js"
import Command from "../../classes/Command.js"
import { escapeMarkdown } from "discord.js"

export default class extends Command {
  constructor () {
    super({
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
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    const queueIndex = args.index === -1 ? 0 : args.index
    const queueItem = music.state.queue[queueIndex]
    // We can only 'correct' a item in the queue that has been searched on YT
    if (queueItem && queueItem.link) {
      const query = queueItem.query
      if (query) {
        const searchResults = (await searchYouTube(query)).slice(0, 5)
        if (searchResults) {
          msg.react("🔍")

          await msg.reply("Respond with the number you'd like to replace.\nRespond with `cancel` to cancel the command. The command will automatically be cancelled in 30 seconds.\n\n" + searchResults.map((r, i) => `\`${i + 1}\` ${escapeMarkdown(r.title)} \`${msToTimestamp(r.duration * 1000)}\``).join("\n"))

          const filter = (message) => (/^[1-5]$/.test(message.content) || message.content === "cancel") && message.author.id === msg.author.id
          const collected = await msg.channel.awaitMessages({ filter, time: 30000, max: 1 })

          const reply = collected.first()
          if (reply && reply.content !== "cancel") {
            const index = parseInt(reply.content) - 1
            reply.react(["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"][index])

            const track = new Track()
              .clone(queueItem)
              .setYouTubeTitle(searchResults[index].title)
              .setLink(`https://www.youtube.com/watch?v=${searchResults[index].id}`)
              .setDuration(searchResults[index].duration)
              .setStartTime(0)

            if (queueIndex === 0) {
              music.state.queue.splice(queueIndex + 1, 0, track)
              music.setState({ queue: music.state.queue })
              music.player.stop()
            }
            else {
              music.state.queue.splice(queueIndex, 1, track)
              music.setState({ queue: music.state.queue })
              music.updateEmbed()
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