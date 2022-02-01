const workerpool = require("workerpool")
const { Client } = require("youtubei")
const AmazonRipper = require("../classes/AmazonRipper")

const youtube = new Client()

const searchYouTube = async query => {
  const searchResults = await youtube.search(query, { type: "video" })

  return searchResults.map(v => ({
    id: v.id,
    title: v.title,
    thumbnail: v.thumbnails[0].url,
    duration: v.duration,
  }))
}

const getAmazonInfo = async url => await AmazonRipper.getInfo(url)

workerpool.worker({
  searchYouTube,
  getAmazonInfo,
})