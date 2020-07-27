const puppeteer = require("puppeteer")
const axios = require("axios").default
const config = require("../config.json")

class SoundCloudRipper {
  constructor () {
    this.browser = puppeteer.launch({ headless: true })
  }

  async run (url) {
    const browser = await this.browser
    const page = await browser.newPage()
    await page.goto(url)

    const bodyHTML = await page.evaluate(() => document.body.innerHTML)

    await page.close()

    const match = /\[{"id":.+?}]}]/.exec(bodyHTML)
    const json = JSON.parse(match[0])

    const dataChunk = json.find(chunk => chunk.id === 18)
    if (dataChunk) {
      const transcoding = dataChunk.data[0].media.transcodings.find(transcoding => transcoding.format.protocol === "progressive")
      if (transcoding) {
        const mp3CdnUrl = `${transcoding.url}?client_id=${config.soundCloud.clientId}`
        const res = await axios.get(mp3CdnUrl)

        if (res.data) {
          const mp3Url = res.data.url
          return {
            url: mp3Url,
            artist: dataChunk.data[0].user.username,
            title: dataChunk.data[0].title,
            thumbnail: dataChunk.data[0].artwork_url,
            duration: dataChunk.data[0].duration / 1000,
          }
        }
      }
    }

    return null
  }
}

module.exports = new SoundCloudRipper()