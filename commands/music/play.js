const { Command } = require("discord.js-commando")
const { getRequestee, getVoiceChannel, getOrCreateMusic } = require("../../classes/Helpers")
const { resume } = require("./resume")

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
    await run(msg, args, this)
  }
}

const run = async (msg, args, index) => {
  const music = getOrCreateMusic(msg)

  if (music.state.pauser !== "" && args.input === "") {
    resume(msg)
    return
  }

  if (args.input !== "") {
    const success = await music.add(args.input, getRequestee(msg), getVoiceChannel(msg), index)
    if (success) {
      msg.react("▶️")
    }
    else {
      msg.reply(`:x: Sorry, I couldn't find a YouTube video for \`${args.input}\`, please try again...`)
    }
  }
  else {
    msg.reply("Please provide a link or search term for the song you wish to play")
  }
}

module.exports.commandConfig = commandConfig
module.exports.run = run