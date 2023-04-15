// import { User } from "discord.js"
import prism from "prism-media"

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
  // if (!(message instanceof CommandoMessage)) {
  //   return Error("Message must be an instance of CommandoMessage")
  // }

  // if (!(author instanceof User)) {
  //   return Error("Author must be an instance of User")
  // }

  // const prefix = message.guild ? message.guild.commandPrefix : message.client.dispatcher.client.commandPrefix
  // const fakeMessage = new CommandoMessage(message.client, { id: message.id, content: `${handlePrefix ? prefix : ""}${content}`, author }, message.channel)
  // message.client.dispatcher.handleMessage(fakeMessage)
}