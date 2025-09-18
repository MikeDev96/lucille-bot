import TrackExtractor, { PLATFORM_SPOTIFY, PLATFORM_TIDAL, PLATFORM_APPLE } from "./TrackExtractor.js"
import MusicToX from "./MusicToX.js"
import { getEmoji } from "../helpers.js"

export default class {
  async run (msg) {
    try {
      const te = new TrackExtractor(msg.content)
      
      if (te.parseLinks()) {
        msg.react("▶️")

        const filteredLinks = te.links.slice(0, 25).filter(l => [PLATFORM_SPOTIFY, PLATFORM_TIDAL, PLATFORM_APPLE].includes(l.platform) && ["track", "album", "artist"].includes(l.type))
        
        if (filteredLinks.length) {
          const processedLinks = (await Promise.all(filteredLinks.map(l => new MusicToX(l).processLink()))).filter(link => link !== undefined)

          // Check if we have any valid processed links
          if (processedLinks.length === 0) {
            msg.reply("🎵 Sorry, I couldn't find any valid music links in your message.")
            return
          }

          const spotifyEmoji = getEmoji(msg.guild, "spotify")
          const tidalEmoji = getEmoji(msg.guild, "tidal")
          const appleEmoji = getEmoji(msg.guild, "apple")

          const embed = {
            embeds: [
              {
                color: 0x0099ff,
                title: "Lucille 🎵",
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
                  text: process.env.DISCORD_FOOTER,
                  icon_url: process.env.DISCORD_AUTHORAVATARURL,
                },
              },
            ],
          }

          msg.reply(embed)
        }
      }
    }
    catch (err) {
      console.log("Error in music tracker")
      console.log(err)
      msg.reply("🎵 Oops! Something went wrong while processing your music links. Please try again later!")
    }
  }
}