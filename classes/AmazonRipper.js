const fetch = require("node-fetch")
const he = require("he")
const { getEmoji } = require("../helpers")
const { getAmazonInfo } = require("../worker/bindings")
const cheerio = require("cheerio")

const AmazonRipper = class {
  constructor (client) {
    client.on("messageReactionAdd", async (messageReaction, user) => {
      // If the bot is restarted then the message will no longer be in the cache
      const msg = await messageReaction.message.fetch()

      if (user.id !== client.user.id && messageReaction.emoji.name === "🐪") {
        const embed = messageReaction.message.embeds[0]
        if (embed) {
          const match = /(?<=\/dp\/)\w.+?\b/.exec(embed.url)
          if (match) {
            messageReaction.users.remove(user)

            if (!msg.amazonRipper) {
              msg.amazonRipper = this.processMessage(msg, embed.url)
            }

            const ar = await msg.amazonRipper

            const showCamel = !embed.image.url.includes("camelcamelcamel")

            embed.setImage(showCamel ? `https://charts.camelcamelcamel.com/uk/${match[0]}/amazon-new.png?force=1&zero=0&w=855&h=513&desired=false&legend=1&ilt=1&tp=all&fo=0&lang=en` : ar.images[ar.imageIndex])
            embed.setFooter(showCamel ? "CamelCamelCamel" : `Image ${ar.imageIndex + 1} of ${ar.images.length}`)
            messageReaction.message.edit({ embed })
          }
        }
      }
      else if (user.id !== client.user.id && messageReaction.emoji.name === "⬅") {
        await this.cycleImage(msg, -1, messageReaction, user)
      }
      else if (user.id !== client.user.id && messageReaction.emoji.name === "➡") {
        await this.cycleImage(msg, 1, messageReaction, user)
      }
    })
  }

  async cycleImage (msg, dir, reaction, user) {
    const embed = msg.embeds[0]
    if (embed) {
      if (this.isAmazonLink(embed.url)) {
        reaction.users.remove(user)

        if (embed.image.url.includes("camelcamelcamel")) {
          return
        }

        if (!msg.amazonRipper) {
          msg.amazonRipper = this.processMessage(msg, embed.url)
        }

        const ar = await msg.amazonRipper

        ar.imageIndex = ar.imageIndex + dir < 0 ? ar.images.length - 1 : ar.imageIndex + dir > ar.images.length - 1 ? 0 : ar.imageIndex + dir

        embed.setImage(ar.images[ar.imageIndex])
        embed.setFooter(`Image ${ar.imageIndex + 1} of ${ar.images.length}`)
        msg.edit({ embed })
      }
    }
  }

  async processMessage (msg, url) {
    const reaction = msg.react("⏳")
    const info = await getAmazonInfo(url)
    reaction.then(r => r.remove())
    return info
  }

  async runMessage (msg) {
    if (!this.isAmazonLink(msg.content)) {
      return
    }

    const info = await this.processMessage(msg, msg.content)

    if (info) {
      const embedMsg = msg.reply({
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
            ...info.colour !== "initial" ? [
              {
                name: "Colour",
                value: info.colour,
                inline: true,
              },
            ] : [],
            ...info.overview.length ? [
              {
                name: "Overview",
                value: info.overview.map(({ key, value }) => `${key}: ${value}`).join("\n").substr(0, 1024),
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
            url: info.images[0],
          },
          footer: {
            text: `Image 1 of ${info.images.length}`,
          },
        },
      })

      embedMsg.then(msg => {
        msg.amazonRipper = Promise.resolve(info)
        msg.react("⬅").then(() => msg.react("➡").then(() => msg.react("🐪")))
      })
    }
  }

  isAmazonLink (url) {
    return /\bhttps?:\/\/(?:www\.)?amazon.[a-zA-Z.]{1,3}\b/.test(url)
  }

  static async getInfo (url) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.104 Safari/537.36",
        },
      })

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

      const match = /var data = ({\s*?'colorImages':.+?});/gs.exec(html)
      if (!match) {
        return
      }

      const [, json] = match

      const t = process.hrtime()
      const $ = cheerio.load(html)

      const validJson = json.replace(/,\s+?'airyConfig' :A\.\$\.parseJSON\(.+?'\)/, "").replace("Date.now()", "\"\"").replace(/'/g, "\"")
      const data2 = JSON.parse(validJson)

      const price = $("#priceblock_ourprice, #priceblock_dealprice, #priceblock_saleprice, #apex_desktop .a-price.apexPriceToPay > span:not(.a-offscreen), #apex_desktop .a-price.priceToPay > span:not(.a-offscreen)").first().text()
      const overview = $("[data-feature-name='productOverview'] tbody tr").map((_idx, el) => {
        const [key, value] = $(el).find("td").map((_idx, cell) => $(cell).text().trim()).toArray()
        return { key, value }
      }).toArray()
      const features = $("#feature-bullets > ul.a-unordered-list > li:not(.aok-hidden) > span.a-list-item").map((_idx, el) => $(el).text().trim()).toArray()
      const rating = $("span[data-hook='rating-out-of-text']").text()

      // When a product has colour options, it seems to store the images in data2 instead of data
      const imageData = data.landingAsinColor === "initial" ? data2 : data

      const elapsed = process.hrtime(t)
      console.log(`Ripped Amazon in ${elapsed[0] + (elapsed[1] / 1e9)}s... - ${data.title}`)

      return {
        title: data.title,
        images: imageData.colorImages[data.landingAsinColor].map(img => img.large),
        price,
        overview,
        features,
        rating,
        imageIndex: 0,
        colour: data.landingAsinColor,
      }
    }
    catch (err) {
      console.log(err)
    }

    return null
  }
}

module.exports = AmazonRipper