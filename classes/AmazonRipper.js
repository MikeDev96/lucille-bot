const fetch = require("node-fetch")
const he = require("he")

const AmazonRipper = class {
  async runMessage (msg) {
    if (!this.isAmazonLink(msg.content)) {
      return
    }

    const reaction = msg.react("⏳")
    const info = await this.getInfo(msg.content)

    if (info) {
      msg.reply({
        embed: {
          color: 0x0099ff,
          title: he.decode(info.title),
          url: msg.content,
          author: {
            name: msg.member.displayName,
            icon_url: msg.author.displayAvatarURL(),
          },
          image: {
            url: info.image,
          },
        },
      })
    }

    reaction.then(r => r.remove())
  }

  isAmazonLink (url) {
    return /\bhttps?:\/\/(?:www\.)?amazon\.co\.uk\b/.test(url)
  }

  async getInfo (url) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Lucille/1.0.0" } }) // PostmanRuntime/7.26.8 | Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36
      const html = await res.text()

      const jsonMatch = /var obj = jQuery\.parseJSON\('(.+?)'\)/.exec(html)
      if (!jsonMatch) {
        return
      }

      const data = JSON.parse(jsonMatch[1])

      const imageMatch = /var data = ({\s+'colorImages':.+?});/gs.exec(html)
      if (!imageMatch) {
        return
      }

      const [, imageData] = imageMatch
      const largeMatch = /"large":"(.+?)"/.exec(imageData)
      if (!largeMatch) {
        return
      }

      const [, imageUrl] = largeMatch

      return {
        title: data.title,
        image: imageUrl,
      }
    }
    catch (err) {
      console.log(err)
    }

    return null
  }
}

module.exports.default = AmazonRipper