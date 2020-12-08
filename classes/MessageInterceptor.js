const EventEmitter = require("events")

module.exports = class extends EventEmitter {
  constructor (client) {
    super()

    client.on("message", msg => this.run(msg))

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