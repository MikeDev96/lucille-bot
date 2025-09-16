import prism from "prism-media"
import { msToTimestamp } from "../helpers.js"
import { Readable, PassThrough } from "stream"
import Innertube, { ClientType, UniversalCache } from "youtubei.js"
import debug from "../utils/debug.js"
import { URL } from "url"
import { spawn } from "child_process"

const ytCache = new Map()

export const getFfmpegStream = (url, { startTime, filters = {} } = {}) => {
  debug.stream("Using ffmpeg with filters:", filters)
  const isStream = url instanceof Readable
  const ffmpegArgs = [
    "-ss", msToTimestamp(startTime, { ms: true }),
    "-i", isStream ? "-" : url,
    "-analyzeduration", "0",
    "-loglevel", "0",
    "-f", "s16le",
    "-ar", "48000",
    "-ac", "2",
    "-af", `bass=g=${filters.gain || 0},atempo=${filters.tempo || 1}`,
  ]

  debug.stream("FFmpeg args:", ffmpegArgs)
  
  const transcoder = spawn("ffmpeg", ffmpegArgs.concat(["pipe:1"]), { stdio: ["pipe", "pipe", "inherit"] })
  if (isStream) {
    url.pipe(transcoder.stdin)
  }
  const passThrough = new PassThrough({ highWaterMark: 1 << 25 })
  const opus = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 })
  const stream = transcoder.stdout.pipe(passThrough).pipe(opus)
  
  // Add error handling
  transcoder.on("error", (error) => debug.error("FFmpeg transcoder spawn error:", error))
  transcoder.stdin.on("error", (error) => debug.error("FFmpeg transcoder input error:", error))
  transcoder.stdout.on("error", (error) => debug.error("FFmpeg transcoder output error:", error))
  passThrough.on("error", (error) => debug.error("PassThrough error:", error))
  opus.on("error", (error) => debug.error("Opus encoder error:", error))
  stream.on("error", (error) => debug.error("Stream error:", error))
  
  stream.on("close", () => {
    debug.stream("FFmpeg stream closed")
    transcoder.stdin.end()
    passThrough.destroy()
    opus.destroy()
  })
  
  stream.on("end", () => debug.stream("FFmpeg stream ended"))
  
  return stream
}

export const getStream = async (url, options) => {
  const match = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  const videoId = match[1]

  debug.stream(`Getting stream for video: ${videoId}`)
  debug.stream(`Options:`, options)

  const isCached = ytCache.has(url)
  const hasExpired = isCached && Math.floor(Date.now() / 1000) - ytCache.get(url).expire >= 0

  if (!isCached || hasExpired) {
    console.time("youtubei.js")

    const yt = await Innertube.create({
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
      client_type: ClientType.ANDROID,
      cache: new UniversalCache(true),
    })

    const video = await yt.getBasicInfo(videoId)

    console.timeEnd("youtubei.js")

    const audioFormats = getSortedAudioFormats([...video.streaming_data.adaptive_formats, ...video.streaming_data.formats])

    if (!audioFormats.length) {
      throw new Error("No audio formats available")
    }

    const format = audioFormats[0]
    const decipheredUrl = format.decipher(yt.session.player)
    const urlParams = new URL(decipheredUrl).searchParams
    const expire = urlParams.get("expire")

    ytCache.set(url, { url: decipheredUrl, expire })
  }

  const cachedVideo = ytCache.get(url)

  return { stream: getFfmpegStream(cachedVideo.url, options), type: "opus" }
}

const getSortedAudioFormats = formats => {
  return formats.filter(f => f.audio_quality).sort((a, b) => {
    const [, aType] = /(audio|video)\/(\w+?);/.exec(a.mime_type)
    const [, bType] = /(audio|video)\/(\w+?);/.exec(b.mime_type)

    // Sort by audio only and then bitrate
    return (((bType === "audio" ? 1 : 0) - (aType === "audio" ? 1 : 0)) ||
      (b.bitrate - a.bitrate)
    )
  })
}