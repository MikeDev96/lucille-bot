const config = require("../config.json")
const TrackExtractor = require("./TrackExtractor")
const MusicToX = require("./MusicToX")
const { PLATFORM_SPOTIFY, PLATFORM_TIDAL, PLATFORM_APPLE } = require("./TrackExtractor")
const { getEmoji } = require("../helpers")

module.exports = class {
  async run (msg) {
    try {
      const te = new TrackExtractor(msg.content)
      if (te.parseLinks()) {
        const filteredLinks = te.links.slice(0, 25).filter(l => [PLATFORM_SPOTIFY, PLATFORM_TIDAL, PLATFORM_APPLE].includes(l.platform) && ["track", "album", "artist"].includes(l.type))
        if (filteredLinks.length) {
          const processedLinks = await Promise.all(filteredLinks.map(l => new MusicToX(l).processLink()))

          const spotifyEmoji = getEmoji(msg.guild, "spotify")
          const tidalEmoji = getEmoji(msg.guild, "tidal")
          const appleEmoji = getEmoji(msg.guild, "apple")

          const embed = {
            embed: {
              color: 0x0099ff,
              title: "Lucille :musical_note:",
              author: {
                name: msg.member.displayName,
                icon_url: msg.author.displayAvatarURL(),
              },
              fields: processedLinks.map(t => {
                const splitApple = (t.appleId || "").split("-")
                const appleLink = `music.apple.com/gb/${t.type === "track" ? "album" : t.type}/${splitApple[0]}${splitApple[1] ? "?i=" + splitApple[1] : ""}`
                return {
                  name: [t.artists, t.name].filter(s => s).join(" - "),
                  value: [
                    t.spotifyId && `[${spotifyEmoji}](https://open.spotify.com/${t.type}/${t.spotifyId})`,
                    t.tidalId && `[${tidalEmoji}](https://tidal.com/browse/${t.type}/${t.tidalId})`,
                    t.appleId && `[${appleEmoji}](https://${appleLink})`,
                  ].filter(s => s).join(" "),
                }
              }),
              footer: {
                text: config.discord.footer,
                icon_url: config.discord.authorAvatarUrl,
              },
            },
          }

          msg.reply(embed)
        }
      }
    }
    catch (err) {
      console.log("Error in music tracker")
      console.log(err)
    }
  }
}