const fsp = require("fs").promises
const fs = require("fs")
const fetch = require("node-fetch")
const sanitise = require("sanitize-filename")
const path = require("path")
const globby = require("globby")
const express = require("express")
const { MessageAttachment } = require("discord.js")
const tts = require("tiktok-scraper")

const router = express.Router()

router.get("/tiktok/video/:videoId", async (req, res) => {
  const paths = await globby(`${VIDEOS_PATH}/* ${req.params.videoId}.mp4`)
  if (!paths.length) {
    return res.sendStatus(404)
  }

  const path = paths[0]
  const stat = fs.statSync(path)
  const fileSize = stat.size
  const range = req.headers.range
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : fileSize - 1
    const chunksize = (end - start) + 1
    const file = fs.createReadStream(path, { start, end })
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
    }
    res.writeHead(206, head)
    file.pipe(res)
  }
  else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    }
    res.writeHead(200, head)
    fs.createReadStream(path).pipe(res)
  }
})

const VIDEOS_PATH = "assets/videos/tiktok"

const TikTokRipper = class {
  constructor () {
    this.processing = {}
  }

  async runMessage (msg) {
    try {
      const link = await this.parseLink(msg.content)
      if (!link) {
        return
      }

      const reaction = msg.react("⏳")

      const [url, id] = link
      const [filename, endpoint] = await this.run(url, id)

      try {
        const attach = new MessageAttachment(filename)
        await msg.reply(attach)
      }
      catch (err) {
        msg.reply(new URL(endpoint, process.env.PUBLIC_URL).href)
      }

      reaction.then(r => r.remove())
    }
    catch (err) {
      msg.reply(err.message)
      await msg.reactions.removeAll()
    }
  }

  async parseLink (url) {
    const shortMatch = /\bhttps?:\/\/(?:www.)?vm.tiktok.com\/.+?\b/.exec(url)
    if (shortMatch) {
      const res = await fetch(shortMatch[0], { redirect: "manual" })
      const redirectRes = await fetch(res.headers.get("location"), { redirect: "manual" })

      url = redirectRes.url
    }

    const match = /\bhttps?:\/\/(?:www\.)?(?:m\.)?tiktok\.com\/(?:v|@.+?\/video)\/(\d+?)\b/.exec(url)
    if (!match) {
      return null
    }

    const [subUrl, id] = match
    return [subUrl, id]
  }

  async run (url, id) {
    if (this.processing[id]) {
      return this.processing[id]
    }

    const paths = await globby(`${VIDEOS_PATH}/* ${id}.mp4`)
    if (paths.length) {
      return [paths[0], `/tiktok/video/${id}`]
    }

    return await (this.processing[id] = this.process(url, id))
  }

  async process (url, id) {
    try {
      const res = await tts.getVideoMeta(url)
      const videoRes = await fetch(res.collector[0].videoUrl, { headers: res.headers })

      const filename = path.join(VIDEOS_PATH, `${sanitise(res.collector[0].text)} ${id}.mp4`)

      try {
        await fsp.access(VIDEOS_PATH)
      }
      catch (err) {
        // If this errors, let it bubble up
        await fsp.mkdir(VIDEOS_PATH, { recursive: true })
      }

      return await new Promise((resolve, reject) => {
        const str = fs.createWriteStream(filename)

        str.on("finish", () => {
          resolve([filename, `/tiktok/video/${id}`])
        })

        str.on("error", err => {
          reject(err)
        })

        videoRes.body.pipe(str)
      })
    }
    catch (err) {
      throw new Error(err.message)
    }
    finally {
      if (id in this.processing) {
        delete this.processing[id]
      }
    }
  }
}

module.exports = TikTokRipper
module.exports.router = router