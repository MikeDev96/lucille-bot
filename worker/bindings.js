const workerpool = require("workerpool")
const path = require("path")

const pool = workerpool.pool(path.join(__dirname, "worker.js"))

const searchYouTube = async query => {
  try {
    return await pool.exec("searchYouTube", [query])
  }
  catch (err) {
    console.error("searchYouTube worker error:")
    console.error(err.message)
    throw err
  }
  finally {
    pool.terminate()
  }
}

const getAmazonInfo = async url => await pool.exec("getAmazonInfo", [url])

module.exports.searchYouTube = searchYouTube
module.exports.getAmazonInfo = getAmazonInfo
module.exports.pool = pool