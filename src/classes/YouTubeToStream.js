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
  const stream = await streamFromInfo(info, { seek: options.startTime / 1000 })

  return playDlDiscord12CompatabilityWrapper(stream)
}