const fsp = require("fs").promises
const fs = require("fs")
const fetch = require("node-fetch")
const ffmpegStatic = require("ffmpeg-static")
const { spawn } = require("child_process")
const sanitise = require("sanitize-filename")
const path = require("path")
const globby = require("globby")
const express = require("express")

const router = express.Router()

router.get("/reddit/video/:videoId", async (req, res) => {
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

const VIDEOS_PATH = "assets/videos/reddit"

const RedditRipper = class {
  constructor () {
    this.processing = {}
  }

  async runMessage (msg) {
    try {
      const link = this.parseLink(msg.content)
      if (!link) {
        return
      }

      const reaction = msg.react("⏳")

      const [url, id] = link
      const endpoint = await this.run(url, id)
      msg.reply(new URL(endpoint, process.env.PUBLIC_URL).href)

      reaction.then(r => r.remove())
    }
    catch (err) {
      msg.reply(`An error occurred while trying to rip the Reddit video`)
      console.error(err)
    }
  }

  parseLink (url) {
    const match = /\bhttps?:\/\/(?:www.)?reddit.com\/r\/[a-zA-Z0-9-_]+?\/comments\/([a-zA-Z0-9-_]+?)\/[a-zA-Z0-9-_]+?\b/.exec(url)
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
      return `/reddit/video/${id}`
    }

    return await (this.processing[id] = this.process(url, id))
  }

  async process (url, id) {
    try {
      const res = await fetch(url)
      const html = await res.text()

      const match = /"dashUrl":"(.+?)"/.exec(html)
      const titleMatch = /<meta\s+?property="og:title"\s+?content="(.+?)"\s*?\/>/.exec(html)

      if (match && titleMatch) {
        const [, url] = match
        const [, title] = titleMatch

        const filename = path.join(VIDEOS_PATH, `${sanitise(title)} ${id}.mp4`)

        try {
          await fsp.access(VIDEOS_PATH)
        }
        catch (err) {
          // If this errors, let it bubble up
          await fsp.mkdir(VIDEOS_PATH, { recursive: true })
        }

        return await this.convertVideo(url, filename, id)
      }
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

  convertVideo (url, filename, id) {
    return new Promise((resolve, reject) => {
      const args = [
        "-i", url,
        "-c", "copy",
        filename,
        "-nostdin",
        "-y",
      ]

      const ffmpeg = spawn(ffmpegStatic, args, { windowsHide: true })

      ffmpeg.on("exit", code => {
        if (code === 0) {
          resolve(`/reddit/video/${id}`)
        }
        else {
          reject(code)
        }
      })
    })
  }
}

module.exports.default = RedditRipper
module.exports.router = router