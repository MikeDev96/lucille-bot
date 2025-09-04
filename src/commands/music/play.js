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
}

export const run = async (msg, args, jump) => {
  const music = LucilleClient.Instance.getGuildInstance(msg.guild).music

  if (shouldIgnoreMessage(LucilleClient.Instance, msg)) {
    msg.react("🖕")
    return
  }

  if (music.state.pauser !== "" && args.input === "") {
    resume(msg)
    return
  }

  const searchReaction = msg.react("🔍")

  if (args.input !== "") {
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
    msg.reply("Please provide a link or search term for the song you wish to play")
  }
}