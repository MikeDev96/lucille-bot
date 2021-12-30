const workerpool = require("workerpool")
const scrapeYt = require("scrape-yt")
const AmazonRipper = require("../classes/AmazonRipper")

const searchYouTube = async query => {
  const searchResults = (await scrapeYt.search(query)).filter(res => res.type === "video")

  const patterns = ["radio edit", "radio", "audio only", "audio", "official audio", "official lyrics?", "lyrics?"]

  const sortedResults = searchResults
    .map((item, idx) => ({ info: item, pts: patterns.reduce((acc, cur) => acc + new RegExp(`\\b${cur}\\b`, "i").test(item.title), 0), order: idx }))
    .sort((a, b) => b.pts - a.pts || a.order - b.order)

  return sortedResults.map(item => item.info)
}

const getAmazonInfo = async url => await AmazonRipper.getInfo(url)

workerpool.worker({
  searchYouTube,
  getAmazonInfo,
})