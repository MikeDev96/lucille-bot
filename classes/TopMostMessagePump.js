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
      await this.deleteMessage()
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
      await this.editMessage(messageContents)
    }
    else {
      await this.sendMessage(messageContents)
    }

    if ((this.messageContents && this.messageContents.message) || this.shouldClear) {
      await this.send()
    }
  }

  async sendMessage (messageContents) {
    try {
      this.message = await this.textChannel.send(messageContents)
    }
    catch (err) {
      console.log("Failed to send message in TMMP")
      console.error(err)
    }
  }

  async editMessage (messageContents) {
    try {
      this.message = await this.message.edit(messageContents)
    }
    catch (err) {
      console.log("Failed to edit message in TMMP")
      console.error(err)
    }
  }

  async deleteMessage () {
    try {
      await this.message.delete()
    }
    catch (err) {
      console.log("Failed to delete message in TMMP")
      console.error(err)
    }
  }
}