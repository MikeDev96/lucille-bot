const workerpool = require("workerpool")
const { Client } = require("youtubei")
const AmazonRipper = require("../classes/AmazonRipper")
const fetch = require("node-fetch")
const { Duration } = require("luxon")

const youtube = new Client()

const searchYouTube = async query => {
  const t = process.hrtime()

  if (process.env.YOUTUBE_DATA_API_V3_KEY) {
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=${encodeURIComponent(query)}&key=${process.env.YOUTUBE_DATA_API_V3_KEY}`)
    const searchVideos = await searchRes.json()

    const videoIds = searchVideos.items.map(v => v.id.videoId).join(",")

    const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${process.env.YOUTUBE_DATA_API_V3_KEY}`)
    const videos = await videosRes.json()

    const elapsed = process.hrtime(t)
    console.log(`Searched Youtube Data API for '${query}' in ${elapsed[0] + (elapsed[1] / 1e9)}s...`)

    const videosMap = new Map(videos.items.map(i => [i.id, i.contentDetails]))

    return searchVideos.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.default.url,
      duration: Duration.fromISO(videosMap.get(item.id.videoId).duration).shiftTo("seconds").seconds,
    }))
  }
  else {
    const searchResults = await youtube.search(query, { type: "video" })

    const elapsed = process.hrtime(t)
    console.log(`Searched youtubei for '${query}' in ${elapsed[0] + (elapsed[1] / 1e9)}s...`)

    return searchResults.map(v => ({
      id: v.id,
      title: v.title,
      thumbnail: v.thumbnails[0].url,
      duration: v.duration,
    }))
  }
}

const getAmazonInfo = async url => await AmazonRipper.getInfo(url)

workerpool.worker({
  searchYouTube,
  getAmazonInfo,
})