import EventEmitter from "events"

export default class extends EventEmitter {
  constructor (client) {
    super()

    client.client.on(Events.MessageCreate, msg => this.run(msg))

    this.client = client
  }

  async run (msg) {
    if (this.client.dispatcher.parseMessage(msg)) {
      return
    }

    if (msg.author.bot) {
      return
    }

    this.emit("message", msg)
  }
}