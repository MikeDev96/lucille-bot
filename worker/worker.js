const workerpool = require("workerpool")
const scrapeYt = require("scrape-yt")
const AmazonRipper = require("../classes/AmazonRipper")

const searchYouTube = async query => {
  const searchResults = (await scrapeYt.search(query)).filter(res => res.type === "video")
  return searchResults
}

const getAmazonInfo = async url => await AmazonRipper.getInfo(url)

workerpool.worker({
  searchYouTube,
  getAmazonInfo,
})