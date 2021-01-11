const ytdl = require("ytdl-core")
const prism = require("prism-media")
const { msToTimestamp } = require("../helpers")

// https://github.com/amishshah/ytdl-core-discord

const urlCache = new Map()

const filter = format => {
  return format.codecs === "opus" &&
    format.container === "webm" &&
    format.audioSampleRate === "48000"
}

const nextBestFormat = (formats, isLive) => {
  let filter = format => format.audioBitrate
  if (isLive) {
    filter = format => format.audioBitrate && format.isHLS
  }

  formats = formats.filter(filter).sort((a, b) => b.audioBitrate - a.audioBitrate)
  return formats.find(format => !format.bitrate) || formats[0]
}

const getWebmStream = info => {
  console.log("Using webm")
  const demuxer = new prism.opus.WebmDemuxer()
  return ytdl.downloadFromInfo(info, { filter }).pipe(demuxer).on("end", () => demuxer.destroy())
}

const getFfmpegStream = (url, { startTime, filters = {} } = {}) => {
  console.log("Using ffmpeg")
  const transcoder = new prism.FFmpeg({
    args: [
      "-reconnect", "1",
      "-reconnect_streamed", "1",
      "-reconnect_delay_max", "5",
      "-ss", msToTimestamp(startTime, { ms: true }),
      "-i", url,
      "-analyzeduration", "0",
      "-loglevel", "0",
      "-f", "s16le",
      "-ar", "48000",
      "-ac", "2",
      "-af", `equalizer=f=40:width_type=h:width=50:g=${filters.gain || 0},atempo=${filters.tempo || 1}`,
    ],
  })
  const opus = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 })
  const stream = transcoder.pipe(opus)
  stream.on("close", () => {
    transcoder.destroy()
    opus.destroy()
  })
  return stream
}

const requiresFfmpeg = options => options && (options.startTime || (options.filters && (options.filters.gain > 0 || options.filters.tempo !== 1)))

const getEpoch = () => Date.now() / 1000

const cacheUrl = (url, videoId) => {
  const [expiry] = /\b(?<=expire=)\d+?\b/.exec(url) || []
  if (expiry && expiry > getEpoch()) {
    urlCache.set(videoId, { url, expiry })
  }
}

const getCachedUrl = id => {
  if (urlCache.has(id)) {
    const { url, expiry } = urlCache.get(id)
    if (getEpoch() < expiry) {
      urlCache.delete(id)
      return url
    }
  }

  return false
}

exports.getStream = async (url, options) => {
  const cachedUrl = getCachedUrl(url)
  if (cachedUrl) {
    console.log("Fetched YT url from cache")
    return getFfmpegStream(cachedUrl, options)
  }
  else {
    const info = await ytdl.getInfo(url)

    const bestFormat = nextBestFormat(info.formats, info.player_response.videoDetails.isLiveContent)
    if (!bestFormat) {
      throw new Error("No suitable format found")
    }

    cacheUrl(bestFormat.url, url)

    const format = info.formats.find(filter)
    const canDemux = format && info.videoDetails.lengthSeconds !== "0"

    if (canDemux && !requiresFfmpeg(options)) {
      return getWebmStream(info)
    }
    else {
      return getFfmpegStream(bestFormat.url, options)
    }
  }
}