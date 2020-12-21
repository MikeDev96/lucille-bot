const fetch = require("node-fetch")
const he = require("he")
const { getEmoji } = require("./Helpers")

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

  async getInfo (url) {
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

      const priceMatch = /<span id="priceblock_(?:ourprice|dealprice|saleprice)" .+?>(.+?)<\/span>/.exec(html)
      const [, price] = priceMatch || [null, ""]

      const featuresMatch = /<div id="feature-bullets" class="a-section a-spacing-medium a-spacing-top-small">.+?<ul class="a-unordered-list .+?">(.+?)<\/ul>/s.exec(html)
      const [, featuresMatchHtml] = featuresMatch || [null, ""]
      const featureMatches = [...featuresMatchHtml.matchAll(/<span class="a-list-item">(.+?)<\/span>/gs)].map(([, innerText]) => innerText.trim())

      const ratingMatch = /<span data-hook="rating-out-of-text" class="a-size-medium a-color-base">(.+?)<\/span>/s.exec(html)
      const [, rating] = ratingMatch || [null, ""]

      return {
        title: data.title,
        image: imageUrl,
        price,
        features: featureMatches,
        rating,
      }
    }
    catch (err) {
      console.log(err)
    }

    return null
  }
}

module.exports.default = AmazonRipper