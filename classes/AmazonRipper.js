const fetch = require("node-fetch")
const he = require("he")
const { getEmoji } = require("../helpers")
const { getAmazonInfo } = require("../worker/bindings")
const cheerio = require("cheerio")

const AmazonRipper = class {
  async runMessage (msg) {
    if (!this.isAmazonLink(msg.content)) {
      return
    }

    const reaction = msg.react("⏳")
    const info = await getAmazonInfo(msg.content)

    if (info) {
      msg.reply({
        embed: {
          color: 0xfffffe,
          title: `${getEmoji(msg.guild, "amazon")} ${he.decode(info.title)}`,
          url: msg.content,
          fields: [
            ...info.price ? [
              {
                name: "Price",
                value: info.price,
                inline: true,
              },
            ] : [],
            ...info.rating ? [
              {
                name: "Rating",
                value: info.rating,
                inline: true,
              },
            ] : [],
            ...info.features.length ? [
              {
                name: "Features",
                value: info.features.map(feat => `• ${feat}`).join("\n").substr(0, 1024),
              },
            ] : [],
          ],
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
    return /\bhttps?:\/\/(?:www\.)?amazon.[a-zA-Z.]{1,3}\b/.test(url)
  }

  static async getInfo (url) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Lucille/1.0.0" } }) // PostmanRuntime/7.26.8 | Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36
      const html = await res.text()

      const jsonMatch = /var obj = jQuery\.parseJSON\('(.+?)'\)/.exec(html)
      if (!jsonMatch) {
        return
      }

      const data = JSON.parse(jsonMatch[1].replace(/\\'/g, "'"))

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

      const t = process.hrtime()
      const $ = cheerio.load(html)

      const price = $("#priceblock_ourprice, #priceblock_dealprice, #priceblock_saleprice").text()
      const features = $("#feature-bullets > ul.a-unordered-list > li:not(.aok-hidden) > span.a-list-item").map((_idx, el) => $(el).text().trim()).toArray()
      const rating = $("span[data-hook='rating-out-of-text']").text()

      const elapsed = process.hrtime(t)
      console.log(`Ripped Amazon in ${elapsed[0] + (elapsed[1] / 1e9)}s... - ${data.title}`)

      return {
        title: data.title,
        image: imageUrl,
        price,
        features,
        rating,
      }
    }
    catch (err) {
      console.log(err)
    }

    return null
  }
}

module.exports = AmazonRipper