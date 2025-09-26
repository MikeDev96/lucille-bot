import fetch from "node-fetch"
import he from "he"
import { getEmoji, padInlineFields, getHRTimeDiff } from "../helpers.js"
import { parse } from "node-html-parser"
import { EmbedBuilder, Events } from "discord.js"

const AmazonRipper = class {
  constructor (client) {
    client.on(Events.MessageReactionAdd, async (messageReaction, user) => {
      // If the bot is restarted then the message will no longer be in the cache
      const msg = await messageReaction.message.fetch()

      if (user.id !== client.user.id && messageReaction.emoji.name === "🐪") {
        const embedData = messageReaction.message.embeds[0]
        if (embedData) {
          const embed = new EmbedBuilder(embedData)
          const match = /(?<=\/dp\/)\w.+?\b/.exec(embed.data.url)
          if (match) {
            messageReaction.users.remove(user)

            if (!msg.amazonRipper) {
              msg.amazonRipper = this.processMessage(msg, embed.data.url)
            }

            const ar = await msg.amazonRipper

            const showCamel = !embed.data.image || !embed.data.image.url.includes("camelcamelcamel")

            embed.setImage(showCamel ? `https://charts.camelcamelcamel.com/uk/${match[0]}/amazon-new.png?force=1&zero=0&w=855&h=513&desired=false&legend=1&ilt=1&tp=all&fo=0&lang=en` : ar.images[ar.imageIndex])
            if (ar.images.length > 1) {
              embed.setFooter({ text: showCamel ? "CamelCamelCamel" : `Image ${ar.imageIndex + 1} of ${ar.images.length}` })
            }

            messageReaction.message.edit({ embeds: [embed] })
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
    if (msg.embeds[0]) {
      const embed = new EmbedBuilder(msg.embeds[0])
      if (this.isAmazonLink(embed.data.url)) {
        reaction.users.remove(user)

        if (!embed.data.image || embed.data.image.url.includes("camelcamelcamel")) {
          return
        }

        if (!msg.amazonRipper) {
          msg.amazonRipper = this.processMessage(msg, embed.data.url)
        }

        const ar = await msg.amazonRipper

        if (ar.images.length < 2) {
          return
        }

        ar.imageIndex = ar.imageIndex + dir < 0 ? ar.images.length - 1 : ar.imageIndex + dir > ar.images.length - 1 ? 0 : ar.imageIndex + dir

        embed.setImage(ar.images[ar.imageIndex])
        embed.setFooter({ text: `Image ${ar.imageIndex + 1} of ${ar.images.length}` })
        msg.edit({ embeds: [embed] })
      }
    }
  }

  async processMessage (msg, url) {
    const reaction = msg.react("⏳")
    const info = await AmazonRipper.getInfo(url)
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
        embeds: [
          {
            color: 0xfffffe,
            title: `${getEmoji(msg.guild, "amazon")} ${he.decode(info.title)}`,
            url: msg.content,
            fields: [
              ...padInlineFields([
                info.price && { name: "Price", value: info.price, inline: true },
                info.rating && { name: "Rating", value: info.rating, inline: true },
                ...info.variations.map(v => ({
                  name: v.name,
                  value: v.value,
                  inline: true,
                })),
              ].filter(f => f)),
              ...(info.overview.length
                ? [
                  {
                    name: "Overview",
                    value: info.overview.map(({ key, value }) => `${key}: ${value}`).join("\n").substring(0, 1024),
                  },
                ]
                : []),
              ...(info.features.length
                ? [
                  {
                    name: "Features",
                    value: info.features.map(feat => `• ${feat}`).join("\n").substring(0, 1024),
                  },
                ]
                : []),
            ],
            author: {
              name: msg.member.displayName,
              icon_url: msg.author.displayAvatarURL(),
            },
            image: {
              url: info.images[0],
            },
            ...(info.images.length > 1
              ? {
                footer: {
                  text: `Image 1 of ${info.images.length}`,
                },
              }
              : {}),
          },
        ],
      })

      embedMsg.then(msg => {
        msg.amazonRipper = Promise.resolve(info);
        (info.images.length > 1 ? msg.react("⬅").then(() => msg.react("➡")) : Promise.resolve()).then(() => msg.react("🐪"))
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

      const t = process.hrtime()

      const dom = parse(html, {
        lowerCaseTagName: false,
        comment: false,
        blockTextElements: {
          script: true,
          noscript: true,
          style: true,
          pre: true,
        },
      })

      const price = (dom.querySelector("#priceblock_ourprice, #priceblock_dealprice, #priceblock_saleprice, #apex_desktop .a-price.apexPriceToPay > span:not(.a-offscreen), #apex_desktop .a-price.priceToPay > span:not(.a-offscreen)") || {}).textContent || ""

      const overview = dom.querySelectorAll("[data-feature-name='productOverview'] tr").map(el => {
        let [key, value] = el.querySelectorAll("td").map(el => el.textContent.trim())

        const seeMorePopupMatch = /\(function\(f\) {[\s\S]+?}\)\);\s+([\s\S]+?)\s+?See more/.exec(value)
        if (seeMorePopupMatch) {
          value = seeMorePopupMatch[1]
        }

        return { key, value }
      })

      const features = dom.querySelectorAll("#feature-bullets > ul.a-unordered-list > li:not(.aok-hidden) > span.a-list-item").map(el => el.textContent.trim())
      const rating = (dom.querySelector("span[data-hook='rating-out-of-text']") || {}).textContent || ""

      const images = this.getImages(data)

      const twisterData = /(?<=P\.register\('twister-js-init-dpx-data', function\(\) {\s+?var dataToReturn = ){[\s\S]+?}(?=;\s+?return dataToReturn)/.exec(html)
      // eslint-disable-next-line no-eval
      const variations = twisterData ? eval(`(${twisterData[0]})`) : {}

      console.log(`Ripped Amazon in ${getHRTimeDiff(t)}s... - ${data.title}`)

      return {
        title: data.title,
        images,
        price,
        overview,
        features,
        rating,
        imageIndex: 0,
        variations: variations.dimensions ? variations.dimensions.map(key => ({ name: variations.variationDisplayLabels[key], value: variations.variationValues[key][variations.selectedVariationValues[key]] })) : [],
      }
    }
    catch (err) {
      console.log(err)
    }

    return null
  }

  static getImages (data) {
    return data.colorImages[data.landingAsinColor].map(img => img.large)
  }
}

export default AmazonRipper