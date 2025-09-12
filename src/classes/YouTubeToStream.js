import prism from "prism-media"
import { msToTimestamp } from "../helpers.js"
import { Readable, PassThrough } from "stream"
import Innertube, { ClientType, UniversalCache } from "youtubei.js"
import { StreamType } from "@discordjs/voice"
import debug from "../utils/debug.js"

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
  
  const transcoder = new prism.FFmpeg({
    args: ffmpegArgs,
  })
  if (isStream) {
    url.pipe(transcoder)
  }
  const passThrough = new PassThrough({ highWaterMark: 1 << 25 })
  const opus = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 })
  const stream = transcoder.pipe(passThrough).pipe(opus)
  
  // Add error handling
  transcoder.on("error", (error) => {
    debug.error("FFmpeg transcoder error:", error)
  })
  
  passThrough.on("error", (error) => {
    debug.error("PassThrough error:", error)
  })
  
  opus.on("error", (error) => {
    debug.error("Opus encoder error:", error)
  })
  
  stream.on("error", (error) => {
    debug.error("Stream error:", error)
  })
  
  stream.on("close", () => {
    debug.stream("FFmpeg stream closed")
    transcoder.destroy()
    passThrough.destroy()
    opus.destroy()
  })
  
  stream.on("end", () => {
    debug.stream("FFmpeg stream ended")
  })
  
  return stream
}

export const getStream = async (url, options) => {
  const match = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  const videoId = match[1]

  debug.stream(`Getting stream for video: ${videoId}`)
  debug.stream(`Options:`, options)

  console.time("youtubei.js")

  const yt = await Innertube.create({
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
    client_type: ClientType.ANDROID,
    cache: new UniversalCache(true),
  })
  const video = await yt.getBasicInfo(videoId)

  console.timeEnd("youtubei.js")

  const audioFormats = getSortedAudioFormats([...video.streaming_data.adaptive_formats, ...video.streaming_data.formats])
  const format = audioFormats[0]

  if (!audioFormats.length) {
    throw new Error("No audio formats available")
  }

  // Always use ffmpeg processing to ensure proper stream format - 
  // Since updating Discord.js we need to use ffmpeg to ensure the stream is in the correct format.
  // as Discord.js seems to be stricter with the stream format.
  console.time("youtubei.js dl")

  const stream = await video.download(format)
  const nodeStream = Readable.fromWeb(stream, { highWaterMark: 1 << 25 })

  console.timeEnd("youtubei.js dl")

  return { stream: getFfmpegStream(nodeStream, options), type: "opus" }
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