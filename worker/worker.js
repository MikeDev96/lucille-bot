const workerpool = require("workerpool")
const scrapeYt = require("scrape-yt")
const { default: AmazonRipper } = require("../classes/AmazonRipper")

const searchYouTube = async query => {
  const searchResults = (await scrapeYt.search(query)).filter(res => res.type === "video")
  return searchResults[0]
}

const getAmazonInfo = async url => await AmazonRipper.getInfo(url)

workerpool.worker({
  searchYouTube,
  getAmazonInfo,
})