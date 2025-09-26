import Command from "../../models/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"
import { getVoiceChannel, shouldIgnoreMessage } from "../../helpers.js"
import { resume } from "./resume.js"
import Requestee from "../../models/Requestee.js"

export const commandConfig = {
  name: "play",
  aliases: ["p"],
  group: "music",
  memberName: "play",
  description: "Play command",
  args: [
    {
      key: "input",
      prompt: "Search for a song or paste some link(s) to play.",
      type: "string",
      default: "",
    },
  ],
  guildOnly: true,
}

export default class extends Command {
  constructor () {
    super(commandConfig)
  }

  async run (msg, args) {
    await run(msg, args, false)
  }

  getHelpMessage = (prefix) => {
    return {
      embeds: [
        {
          title: "▶️ Play Command Help",
          description: "Play music from YouTube, Spotify, or search for songs!",
          color: 0x1db954,
          fields: [
            {
              name: "🎵 Usage",
              value: `\`${prefix}play <song/link>\`\nPlay a song or add to queue\n\`${prefix}p <song/link>\`\nShort alias\nExample: \`${prefix}play never gonna give you up\``,
              inline: false
            },
            {
              name: "🔗 Supported Sources",
              value: "• YouTube videos and playlists\n• Spotify tracks and albums\n• SoundCloud tracks\n• Direct audio file links",
              inline: false
            },
            {
              name: "🎯 Features",
              value: "• Search by song name or artist\n• Add multiple songs at once\n• Automatic queue management\n• Resume paused music if no input",
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• Use quotes for specific searches\n• Playlists are added as multiple songs\n• Bot joins your voice channel automatically\n• Use 'summon' if bot isn't connected",
              inline: false
            }
          ],
          footer: {
            text: "Let's play some music! 🎶",
          },
        },
      ],
    }
  }
}

export const run = async (msg, args, jump) => {
  const music = LucilleClient.Instance.getGuildInstance(msg.guild).music

  if (shouldIgnoreMessage(LucilleClient.Instance, msg)) {
    msg.react("🖕")
    return
  }

  if (music.state.pauser !== "" && !args.input) {
    resume(msg)
    return
  }
  
  const searchReaction = msg.react("🔍")

  if (!!args.input) {
    const success = await music.add(args.input, Requestee.create(msg), getVoiceChannel(msg), jump, msg.channel)
    searchReaction.then(r => r.remove())
    await (await searchReaction).remove()
    if (success) {
      msg.react("▶️")
    }
    else {
      msg.reply(`❌ Sorry, I couldn't find a YouTube video for \`${args.input}\`, please try again...`)
    }
  }
  else {
    msg.reply("🔗 Please provide a link or search term for the song you wish to play")
  }
}
