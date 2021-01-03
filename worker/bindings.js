const workerpool = require("workerpool")
const path = require("path")

const pool = workerpool.pool(path.join(__dirname, "worker.js"))

module.exports = {
  searchYouTube: async query => await pool.exec("searchYouTube", [query]),
  getAmazonInfo: async url => await pool.exec("getAmazonInfo", [url]),
}