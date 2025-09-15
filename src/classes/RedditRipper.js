import fs, { promises as fsp } from "fs"
import fetch from "node-fetch"
import { spawn } from "child_process"
import sanitise from "sanitize-filename"
import path from "path"
import { globby } from "globby"
import { AttachmentBuilder } from "discord.js"
import { getConfig } from "../helpers.js"

const VIDEOS_PATH = getConfig("assets/videos/reddit")

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

      const [type, filename] = res

      if (type === "image") {
        await msg.reply(filename)
      }
      else if (type === "video") {
        const fileStats = fs.statSync(filename)
        const limit = (msg.guild.premiumTier < 2 ? 25 : msg.guild.premiumTier < 3 ? 50 : 500) * Math.pow(1024, 2) - 512 // https://www.reddit.com/r/discordapp/comments/aflp3p/the_truth_about_discord_file_upload_limits/

        if (fileStats.size > limit) {
          await msg.reply("File is too large to upload")
        }
        else {
          const attach = new AttachmentBuilder(filename)
          await msg.reply({ files: [attach] })
        }
      }
      else if (type === "link") {
        await msg.reply(filename)
      }

      reaction.then(r => r.remove())
    }
    catch (err) {
      msg.reply(err.message)
      await msg.reactions.removeAll()
    }
  }

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
      return ["video", paths[0]]
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

      const dataMatch = /<shreddit-screenview-data\s*data="(.+?)"\s*><\/shreddit-screenview-data>/s.exec(html)
      if (!dataMatch) return

      const [, json] = dataMatch
      const decodedJson = json.replace(/&quot;/g, `"`)
      const data = JSON.parse(decodedJson)

      if (data.post.type === "image" || data.post.type === "gif") {
        return ["image", data.post.url]
      }
      else if (data.post.type === "link") {
        return ["link", data.post.url]
      }
      else if (data.post.type === "crosspost") {
        const crosspostMatch = /<shreddit-post.+?content-href="(.+?)"/s.exec(html)
        if (!crosspostMatch) return

        const crosspostUrl = `https://reddit.com${crosspostMatch[1]}`

        return await this.process(crosspostUrl, id, 1)
      }
      else if (data.post.type === "video") {
        const titleMatch = /<shreddit-title title="(.+?)"><\/shreddit-title>/.exec(html)
        const videoMatch = /(?<=<shreddit-player\s+data-post-click-location="video-player"\s+src=").+?(?=")/s.exec(html)
        if (!titleMatch || !videoMatch) return

        const [, title] = titleMatch
        const [videoUrl] = videoMatch

        const filename = path.join(VIDEOS_PATH, `${sanitise(title)} ${id}.mp4`)

        try {
          await fsp.access(VIDEOS_PATH)
        }
        catch (err) {
          // If this errors, let it bubble up
          await fsp.mkdir(VIDEOS_PATH, { recursive: true })
        }

        return await this.convertVideo(videoUrl, filename)
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

  convertVideo (url, filename) {
    return new Promise((resolve, reject) => {
      const args = [
        "-i", url,
        "-c", "copy",
        filename,
        "-nostdin",
        "-y",
      ]

      const ffmpeg = spawn("ffmpeg", args, { windowsHide: true })

      ffmpeg.on("exit", code => {
        if (code === 0) {
          resolve(["video", filename])
        }
        else {
          reject(new Error(`FFMpeg error code ${code}`))
        }
      })
    })
  }
}

// Links to test if the Reddit ripper is working

// crosspost to a gif
// https://www.reddit.com/r/gif/comments/165evkf/fashion_cup/
// crosspost to a video
// https://www.reddit.com/r/gif/comments/166o5ii/she_has_muscles_in_places_i_dont_even_have_places/
// video
// https://www.reddit.com/r/davinciresolve/comments/169g7kk/how_did_they_do_this_shot/
// image
// https://www.reddit.com/r/ProgrammerHumor/comments/130zdy6/give_it_a_try/
// gif
// https://www.reddit.com/r/EAF/comments/7lffjk/fashion_cup/
// link - youtube
// https://www.reddit.com/r/videos/comments/169xh5i/all_star_but_they_dont_stop_coming_pitch_rip/
// short link
// https://v.redd.it/hilitbi0lc461