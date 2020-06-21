module.exports = class {
  constructor (textChannel) {
    this.textChannel = textChannel
    this.message = null
    this.messageContents = null
    this.busy = false
    this.shouldClear = false
  }

  async set (message, edit) {
    this.messageContents = { message, edit }
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
    if (this.message && (!this.messageContents || !this.messageContents.edit)) {
      await this.message.delete()
      this.message = null
    }

    if (this.shouldClear) {
      this.messageContents = null
      this.shouldClear = false
      return
    }

    const messageContents = typeof this.messageContents.message === "object" ? { ...this.messageContents.message } : this.messageContents.message
    const messageEdit = this.messageContents.edit
    this.messageContents = null

    if (messageEdit && this.message) {
      this.message = await this.message.edit(messageContents)
    }
    else {
      this.message = await this.textChannel.send(messageContents)
    }

    if ((this.messageContents && this.messageContents.message) || this.shouldClear) {
      await this.send()
    }
  }
}