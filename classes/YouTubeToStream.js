import prism from "prism-media"
import { msToTimestamp } from "../helpers.js"
import { Readable, PassThrough } from "stream"
import { stream } from "play-dl"

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
  const s = await stream(url, { seek: options.startTime / 1000 })
  return s
}