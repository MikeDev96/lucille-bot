import prism from "prism-media"
import { msToTimestamp, playDlDiscord12CompatabilityWrapper } from "../helpers.js"
import { Readable, PassThrough } from "stream"
import { stream_from_info as streamFromInfo, video_info as videoInfo } from "play-dl"

const playDlCache = new Map()

export const getFfmpegStream = (url, { startTime, filters = {} } = {}) => {
  console.log("Using ffmpeg")
  const isStream = url instanceof Readable
  const transcoder = new prism.FFmpeg({
    args: [
      "-ss", msToTimestamp(startTime, { ms: true }),
      "-i", isStream ? "-" : url,
      "-analyzeduration", "0",
      "-loglevel", "0",
      "-f", "s16le",
      "-ar", "48000",
      "-ac", "2",
      "-af", `bass=g=${filters.gain || 0},atempo=${filters.tempo || 1}`,
    ],
  })
  if (isStream) {
    url.pipe(transcoder)
  }
  const passThrough = new PassThrough({ highWaterMark: 1 << 25 })
  const opus = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 })
  const stream = transcoder.pipe(passThrough).pipe(opus)
  stream.on("close", () => {
    transcoder.destroy()
    passThrough.destroy()
    opus.destroy()
  })
  return stream
}

export const getStream = async (url, options) => {
  if (!playDlCache.has(url)) {
    console.time("play-dl")
    const info = await videoInfo(url)
    console.timeEnd("play-dl")

    playDlCache.set(url, info)
  }
  else {
    console.log("Fetched stream info from cache")
  }

  const info = playDlCache.get(url)

  if (options.filters && (options.filters.gain !== 0 || options.filters.tempo !== 1)) {
    const audioFormats = getSortedAudioFormats(info.format)

    if (!audioFormats.length) {
      throw new Error("No audio formats available")
    }

    return { stream: getFfmpegStream(audioFormats[0].url, options), type: "opus" }
  }
  else {
    const stream = await streamFromInfo(info, { seek: options.startTime / 1000 })
    // return playDlDiscord12CompatabilityWrapper({ ...stream, type: stream.type === "arbitrary" ? "unknown" : stream.type })
    return stream
  }
}

const getSortedAudioFormats = formats => {
  return formats.filter(f => f.audioQuality).sort((a, b) => {
    const [, aType] = /(audio|video)\/(\w+?);/.exec(a.mimeType)
    const [, bType] = /(audio|video)\/(\w+?);/.exec(b.mimeType)

    // Sort by audio only and then bitrate
    return (((bType === "audio" ? 1 : 0) - (aType === "audio" ? 1 : 0)) ||
      (b.bitrate - a.bitrate)
    )
  })
}