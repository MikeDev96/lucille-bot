const { Util } = require("discord.js")
const GTTS = require("gtts")
const { PassThrough } = require("stream")
const Requestee = require("./classes/Requestee")
const config = require("./config.json")

const noop = () => { }

const safeJoin = (array, seperator) => {
  return array.filter(s => s.trim()).join(seperator)
}

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const msToTimestamp = (duration, { ms = false } = {}) => {
  const milliseconds = duration % 1000
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  const days = Math.floor(duration / (1000 * 60 * 60 * 24))

  let out = ""

  if (days > 0) {
    out += `${days}:`
  }

  if (hours > 0) {
    if (days) {
      out += `${hours.toString().padStart(2, "0")}:`
    }
    else {
      out += `${hours}:`
    }
  }

  out += `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

  if (ms && milliseconds > 0) {
    out += `.${milliseconds}`
  }

  return out
}

const selectRandom = array => {
  return array[Math.floor(Math.random() * array.length)]
}

const escapeMarkdown = text => {
  return Util.escapeMarkdown(text || "")
}

const getEmoji = (guild, emoji) => {
  return (guild.emojis.cache.find(e => e.name === emoji) || "").toString()
}

const textToStream = text => {
  return new Promise((resolve, reject) => {
    const gtts = new GTTS(text, "en-uk")
    const passThrough = new PassThrough()
    const stream = gtts.stream()
    const output = stream.pipe(passThrough)

    stream.on("close", () => passThrough.destroy())
    stream.on("error", err => reject(err))

    return resolve(output)
  })
}

const getRequestee = msg => {
  return new Requestee(msg.member.displayName, msg.author.displayAvatarURL(), msg.author.id)
}

const getVoiceChannel = msg => {
  return msg.member.voice.channel || msg.guild.channels.cache.find(c => c.type === "voice")
}

const isInBotsVoiceChannel = msg => {
  return msg.author.id === config.discord.owner || (msg.guild.voice && msg.guild.voice.channelID && msg.guild.voice.channelID === msg.member.voice.channelID) || msg.member.voice.deaf
}

const paginatedEmbed = async (msg, embedTemplate, embedList, emojiList = ["⏪", "◀️", "▶️", "⏩"], timeout = 120000) => {
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

module.exports.noop = noop
module.exports.safeJoin = safeJoin
module.exports.shuffle = shuffle
module.exports.sleep = sleep
module.exports.msToTimestamp = msToTimestamp
module.exports.selectRandom = selectRandom
module.exports.escapeMarkdown = escapeMarkdown
module.exports.getEmoji = getEmoji
module.exports.textToStream = textToStream
module.exports.getRequestee = getRequestee
module.exports.getVoiceChannel = getVoiceChannel
module.exports.isInBotsVoiceChannel = isInBotsVoiceChannel
module.exports.paginatedEmbed = paginatedEmbed