import { Util } from "discord.js"
import { PassThrough, Readable } from "stream"
import Requestee from "./classes/Requestee.js"
import fetch from "node-fetch"
import { Duration } from "luxon"
import { Client } from "youtubei"
import gtts from "google-tts-api"

export const noop = () => { }

export const safeJoin = (array, seperator) => {
  return array.filter(s => s.trim()).join(seperator)
}

export const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const msToTimestamp = (duration, { ms = false } = {}) => {
  const milliseconds = duration % 1000
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  const days = Math.floor(duration / (1000 * 60 * 60 * 24))

  let out = ""

  if (days > 0) {
    out += `${days}:${hours.toString().padStart(2, "0")}:`
  }
  else if (hours > 0) {
    out += `${hours}:`
  }

  out += `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

  if (ms && milliseconds > 0) {
    out += `.${milliseconds}`
  }

  return out
}

export const selectRandom = array => {
  return array[Math.floor(Math.random() * array.length)]
}

export const escapeMarkdown = text => {
  return Util.escapeMarkdown(text || "")
}

export const getEmoji = (guild, emoji) => {
  return (guild.emojis.cache.find(e => e.name === emoji) || "").toString()
}

export const textToStream = text => {
  return gtts
    .getAudioBase64(text, { lang: "en", slow: false, host: "https://translate.google.com", timeout: 10000 })
    .then(data => Readable.from(Buffer.from(data, "base64")))
}

export const getRequestee = msg => {
  return new Requestee(msg.member.displayName, msg.author.displayAvatarURL(), msg.author.id)
}

export const getVoiceChannel = msg => {
  return msg.member.voice.channel || msg.guild.channels.cache.find(c => c.type === "voice")
}

export const isInBotsVoiceChannel = msg => {
  return msg.author.id === process.env.DISCORD_OWNER || (msg.guild.voice && msg.guild.voice.channelID && msg.guild.voice.channelID === msg.member.voice.channelID) || msg.member.voice.deaf
}

export const paginatedEmbed = async (msg, embedTemplate, embedList, emojiList = ["⏪", "◀️", "▶️", "⏩"], timeout = 120000) => {
  if (!msg || !msg.channel || !embedList || emojiList.length !== 4) return

  let embedIndex = 0
  embedTemplate.embed.fields = embedList[embedIndex]
  const currentEmbed = await msg.channel.send(embedTemplate)

  for (const emoji of emojiList) await currentEmbed.react(emoji)

  const reactionCollector = currentEmbed.createReactionCollector((reaction, user) => emojiList.includes(reaction.emoji.name) && !user.bot, { time: timeout })
  reactionCollector.on("collect", reaction => {
    reaction.users.remove(msg.author)

    switch (reaction.emoji.name) {
    case emojiList[0] : { embedIndex = 0; break }
    case emojiList[1] : { embedIndex = (embedIndex > 0) ? --embedIndex : embedList.length - 1; break }
    case emojiList[2] : { embedIndex = (embedIndex + 1 < embedList.length) ? ++embedIndex : 0; break }
    case emojiList[3] : { embedIndex = embedList.length - 1; break }
    default: break
    }

    embedTemplate.embed.fields = embedList[embedIndex]
    currentEmbed.edit(embedTemplate)
  })

  reactionCollector.on("end", () => currentEmbed.reactions.removeAll())
  return currentEmbed
}

export const padInlineFields = fields => [
  ...fields,
  Array(3 - (((fields.length) % 3) || 3)).fill(0).map(() => ({ name: "\u200b", value: "\u200b", inline: true })),
]

const youtube = new Client()

export const searchYouTube = async query => {
  const t = process.hrtime()

  if (process.env.YOUTUBE_DATA_API_V3_KEY) {
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=${encodeURIComponent(query)}&key=${process.env.YOUTUBE_DATA_API_V3_KEY}`)
    const searchVideos = await searchRes.json()

    const videoIds = searchVideos.items.map(v => v.id.videoId).join(",")

    const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${process.env.YOUTUBE_DATA_API_V3_KEY}`)
    const videos = await videosRes.json()

    console.log(`Searched Youtube Data API for '${query}' in ${getHRTimeDiff(t)}s...`)

    const videosMap = new Map(videos.items.map(i => [i.id, i.contentDetails]))

    return searchVideos.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      duration: Duration.fromISO(videosMap.get(item.id.videoId).duration).shiftTo("seconds").seconds,
    }))
  }
  else {
    const searchResults = await youtube.search(query, { type: "video" })

    console.log(`Searched youtubei for '${query}' in ${getHRTimeDiff(t)}s...`)

    return searchResults.items.map(v => ({
      id: v.id,
      title: v.title,
      duration: v.duration,
    }))
  }
}

export const getHRTimeDiff = time => {
  const elapsed2 = process.hrtime(time)
  return elapsed2[0] + (elapsed2[1] / 1e9)
}

export const playDlDiscord12CompatabilityWrapper = stream => {
  const wrapperStream = new PassThrough()
    .on("close", () => stream.stream.destroy())

  stream.stream
    .on("data", chunk => wrapperStream.push(chunk))
    .on("finish", () => wrapperStream.push(null))
    // .on("error", err => wrapperStream.destroy(err))

  return { ...stream, stream: wrapperStream }
}

export const getEpoch = () => Date.now() / 1000

export const logarithmic = value => Math.pow(value, 1.660964)

export const fixDispatcher = dispatcher => {
  dispatcher.once("close", () => {
    // Discord.js only destroys child streams when the finish event fires...
    // Lets also destroy them when the dispatch gets destroyed.
    for (const stream in dispatcher.streams) {
      dispatcher.streams[stream].destroy()
    }

    console.log("Cleaned up underlying streams")
  })

  return dispatcher
}