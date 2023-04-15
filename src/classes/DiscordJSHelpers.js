import { Message, User } from "discord.js"
import prism from "prism-media"
import LucilleClient from "./LucilleClient.js"

export function createStream (user, { mode = "opus", end = "silence" } = {}) {
  user = this.connection.client.users.resolve(user)
  if (!user) throw new Error("VOICE_USER_MISSING")
  const stream = this.packets.makeStream(user.id, end)
  if (mode === "pcm") {
    const decoder = new prism.opus.Decoder({ channels: 1, rate: 16000, frameSize: 512 })
    stream.pipe(decoder)
    return decoder
  }
  return stream
}

export const proxyCommand = (message, author = message.author, content, handlePrefix = true) => {
  if (!(message instanceof Message)) {
    return Error("Message must be an instance of Message")
  }

  if (!(author instanceof User)) {
    return Error("Author must be an instance of User")
  }

  message.content = `${handlePrefix ? LucilleClient.Instance.commandPrefix : ""}${content}`
  message.author = author

  LucilleClient.Instance.executeCommand(message, content)
}