const { Util } = require("discord.js")
const GTTS = require("gtts")
const { PassThrough } = require("stream")
const Requestee = require("./classes/Requestee")

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

  let out = ""

  if (hours > 0) {
    out += `${hours}:`
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