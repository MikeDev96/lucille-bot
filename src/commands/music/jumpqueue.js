import Commando from "discord.js-commando"
import { commandConfig, run } from "./play.js"
const { Command } = Commando

export default class PlayCommand extends Command {
  constructor (client) {
    super(client, {
      ...commandConfig,
      name: "jumpqueue",
      memberName: "jumpqueue",
      description: "Same as the play command except it jumps the queue",
      aliases: ["jump", "jq", "jump", "j"],
    })
  }

  async run (msg, args) {
    await run(msg, args, true)
  }
}