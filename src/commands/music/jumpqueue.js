import Command from "../../models/Command.js"
import { commandConfig, run } from "./play.js"

export default class PlayCommand extends Command {
  constructor () {
    super({
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