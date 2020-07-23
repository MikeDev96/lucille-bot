const { Command } = require("discord.js-commando")
const Music = require("../../classes/Music")
const { getRequestee, getVoiceChannel } = require("../../messageHelpers")

const commandConfig = {
  name: "play",
  aliases: [],
  group: "music",
  memberName: "play",
  description: "Play command",
  args: [
    {
      key: "input",
      prompt: "Search for a song or paste some link(s) to play.",
      type: "string",
    },
  ],
  guildOnly: true,
}

module.exports = class PlayCommand extends Command {
  constructor (client) {
    super(client, commandConfig)
  }

  async run (msg, args) {
    run(msg, args)
  }
}

const run = (msg, args, index) => {
  if (!msg.channel.guild.lucille) {
    msg.channel.guild.lucille = new Music(msg.channel)
  }

  const success = msg.channel.guild.lucille.add(args.input, getRequestee(msg), getVoiceChannel(msg), index)
  if (success) {
    msg.react("▶️")
  }
  else {
    msg.reply(`Sorry, I couldn't find a YouTube video for ${args.input}, please try again...`)
  }
}

module.exports.commandConfig = commandConfig
module.exports.run = run