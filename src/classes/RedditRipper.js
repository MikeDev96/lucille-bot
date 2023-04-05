import fs, { promises as fsp } from "fs"
import fetch from "node-fetch"
import ffmpegStatic from "ffmpeg-static"
import { spawn } from "child_process"
import sanitise from "sanitize-filename"
import path from "path"
import { globby } from "globby"
import express from "express"
// import { MessageAttachment } from "discord.js"

export const router = express.Router()

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

export default class RedditRipper {
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
      const res = await this.run(url, id)
      if (!res) {
        reaction.then(r => r.remove())
        return
      }

      const [type, filename, endpoint] = res

      if (type === "image") {
        await msg.reply(filename)
      }
      else if (type === "video") {
        const fileStats = fs.statSync(filename)
        const limit = (msg.guild.premiumTier < 2 ? 8 : msg.guild.premiumTier < 3 ? 50 : 100) * Math.pow(1024, 2) - 512 // https://www.reddit.com/r/discordapp/comments/aflp3p/the_truth_about_discord_file_upload_limits/

        if (fileStats.size > limit) {
          await msg.reply(new URL(endpoint, process.env.PUBLIC_URL).href)
        }
        else {
          // const attach = new MessageAttachment(filename)
          // await msg.reply(attach)
        }
      }

      reaction.then(r => r.remove())
    }
    catch (err) {
      msg.reply(err.message)
      await msg.reactions.removeAll()
    }
  }

  // https://www.reddit.com/r/ProgrammerHumor/comments/k98mnh/i_just_want_to_cry_at_the_moment/
  // https://v.redd.it/hilitbi0lc461
  async parseLink (url) {
    const shortMatch = /\bhttps?:\/\/(?:www.)?v.redd.it\/[a-zA-Z0-9-_]+?\b/.exec(url)
    if (shortMatch) {
      const res = await fetch(shortMatch[0], { redirect: "manual" })
      const res2 = await fetch(res.headers.get("location"), { redirect: "manual" })

      url = res2.headers.get("location")
    }

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
      return ["video", paths[0], `/reddit/video/${id}`]
    }

    return await (this.processing[id] = this.process(url, id))
  }

  async process (url, id, depth = 0) {
    try {
      const res = await fetch(url)
      const html = await res.text()

      // May be a better solution - but it works for now
      if (res.status === 503 && !depth) {
        return await this.process(url, id, 1)
      }

      const titleMatch = /<meta\s+?property="og:title"\s+?content="(.+?)"\s*?\/>/.exec(html)
      const jsonMatch = /(?<=<script id="data">window\.___r = ).+?(?=;<\/script>)/s.exec(html)

      if (!titleMatch || !jsonMatch) {
        return
      }

      const [json] = jsonMatch
      const data = JSON.parse(json)

      const model = data.posts.models[`t3_${id}`]
      const media = model.crosspostParentId ? data.posts.models[model.crosspostParentId].media : model.media

      if (media) {
        if (media.type === "image") {
          return ["image", media.content]
        }
        else if (media.type !== "video" && media.type !== "gifvideo") {
          return
        }

        const [, title] = titleMatch
        const key = media.type === "video" ? "dashUrl" : "content"
        const filename = path.join(VIDEOS_PATH, `${sanitise(title)} ${id}.mp4`)

        try {
          await fsp.access(VIDEOS_PATH)
        }
        catch (err) {
          // If this errors, let it bubble up
          await fsp.mkdir(VIDEOS_PATH, { recursive: true })
        }

        return await this.convertVideo(media[key], filename, id)
      }
      else {
        if (model.source && model.source.url) {
          return ["image", model.source.url]
        }
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
          resolve(["video", filename, `/reddit/video/${id}`])
        }
        else {
          reject(new Error(`FFMpeg error code ${code}`))
        }
      })
    })
  }
}