const { Command } = require("discord.js-commando")
const TrackExtractor = require("../../classes/TrackExtractor")
const scrapeYt = require("scrape-yt").scrapeYt
const Track = require("../../classes/Track")
const Requestee = require("../../classes/Requestee")
const Music = require("../../classes/Music")

module.exports = class PlayCommand extends Command {
  constructor (client) {
    super(client, {
      name: "play",
      aliases: [],
      group: "music",
      memberName: "play",
      description: "Play command",
      args: [
        {
          key: "input",
          prompt: "Search for a song or paste some link(s) to play.",
          type: "string",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (!msg.channel.guild.lucille) {
      msg.channel.guild.lucille = new Music(msg.channel)
    }

    const state = msg.channel.guild.lucille.state
    const requestee = new Requestee(msg.member.displayName, msg.author.displayAvatarURL(), msg.author.id)

    const trackExtractor = new TrackExtractor(args.input)
    if (trackExtractor.parseLinks()) {
      const links = await trackExtractor.getAllLinkInfo()
      state.queue.push(...links.map(l => l.setRequestee(requestee).setQuery(`${l.artists} ${l.title} official audio`.trim())))

      msg.react("▶️")
    }
    else {
      const searchResult = (await scrapeYt.search(args.input, { limit: 1 }))[0]
      if (searchResult) {
        const track = new Track()
          .setYouTubeTitle(searchResult.title)
          .setThumbnail(searchResult.thumbnail)
          .setRequestee(requestee)
          .setLink(`https://www.youtube.com/watch?v=${searchResult.id}`)
          .setPlatform("search")
          .setQuery(args.input)

        state.queue.push(track)

        msg.react("▶️")
      }
      else {
        msg.reply(`Sorry, I couldn't find a YouTube video for ${args.input}, please try again...`)
      }
    }

    if (state.queue.length > 0) {
      // Join the voice channel if not already joining/joined
      if (state.joinState === 0) {
        state.joinState = 1

        const voiceChannel = msg.member.voice.channel || msg.guild.channels.cache.find(c => c.type === "voice")
        voiceChannel.join().then(connection => {
          state.joinState = 2
          state.voiceChannel = voiceChannel
          state.voiceConnection = connection

          msg.channel.guild.lucille.searchAndPlay(state)
        }).catch(err => {
          state.joinState = 0
          console.log(err)
        })
      }
      else {
        msg.channel.guild.lucille.updateEmbed(state)
      }
    }
  }
}

// const QUEUE_TRACKS = 10
// const QUEUE_FIELD_MAX_CHARS = 1024