module.exports = class {
  constructor (textChannel) {
    this.textChannel = textChannel
    this.message = null
    this.messageContents = null
    this.busy = false
    this.shouldClear = false
  }

  async set (message) {
    this.messageContents = message
    await this.tryProcess()
  }

  async clear () {
    this.shouldClear = true
    await this.tryProcess()
  }

  async tryProcess () {
    if (!this.busy) {
      this.busy = true
      await this.send()
      this.busy = false
    }
  }

  async send () {
    if (this.message) {
      await this.message.delete()
      this.message = null
    }

    if (this.shouldClear) {
      this.messageContents = null
      this.shouldClear = false
      return
    }

    const messageContents = typeof this.messageContents === "object" ? { ...this.messageContents } : this.messageContents
    this.messageContents = null

    this.message = await this.textChannel.send(messageContents)

    if (this.messageContents || this.shouldClear) {
      await this.send()
    }
  }
}