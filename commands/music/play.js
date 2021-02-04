const { Command } = require("discord.js-commando")
const { getRequestee, getVoiceChannel } = require("../../helpers")
const { resume } = require("./resume")
const config = require("../../config.json")

const commandConfig = {
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

module.exports = class PlayCommand extends Command {
  constructor (client) {
    super(client, commandConfig)
  }

  async run (msg, args) {
    await run(msg, args, false)
  }
}

const run = async (msg, args, jump) => {
  const music = msg.guild.music

  if (msg.author.id !== config.discord.owner && (!msg.member.voice.channelID || (msg.guild.voice && msg.guild.voice.channelID && msg.guild.voice.channelID !== msg.member.voice.channelID))) {
    msg.react("🖕")
    return
  }

  if (music.state.pauser !== "" && args.input === "") {
    resume(msg)
    return
  }

  const searchReaction = msg.react("🔍")

  if (args.input !== "") {
    const success = await music.add(args.input, getRequestee(msg), getVoiceChannel(msg), jump, msg.channel)
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
    msg.reply("Please provide a link or search term for the song you wish to play")
  }
}

module.exports.commandConfig = commandConfig
module.exports.run = run