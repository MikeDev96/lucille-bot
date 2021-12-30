const { EventEmitter } = require("events")

module.exports = class extends EventEmitter {
  constructor (refreshInterval) {
    super()

    this.textChannel = null
    this.message = null
    this.messageContents = null
    this.busy = false
    this.shouldClear = false
    this.refreshHandle = null
    this.refreshInterval = refreshInterval
  }

  setChannel (textChannel) {
    this.textChannel = textChannel
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
    const delMsg = async () => {
      await this.deleteMessage()
      this.message = null
    }

    // Check if a previous message is cached
    if (this.message) {
      // If there's no content, then we're deleting
      if (!this.messageContents || this.shouldClear) {
        await delMsg()
      }
      else {
        // There's content, but we don't want to edit, so delete
        if (!this.messageContents.edit) {
          // Check if the cached message is still the latest message, if so we don't need to delete/create a new message
          const latestMessage = this.textChannel.messages.cache.last()
          if (latestMessage && latestMessage.id === this.message.id) {
            // Change to an edit
            this.messageContents.edit = true
          }
          else {
            await delMsg()
          }
        }
      }
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

  startRefresh (message) {
    this.endRefresh()

    if (message && this.refreshInterval) {
      this.refreshHandle = setTimeout(() => {
        console.log("[TMMP] Refreshing message...")
        this.refreshHandle = null
        this.set(message.embeds[0] ? { embed: message.embeds[0] } : message.content, false)
        this.startRefresh(message)
      }, this.refreshInterval)
    }
  }

  endRefresh () {
    if (this.refreshHandle) {
      clearTimeout(this.refreshHandle)
      this.refreshHandle = null
    }
  }

  async sendMessage (messageContents) {
    try {
      this.message = await this.textChannel.send(messageContents)
      this.startRefresh(this.message)
      this.emit("create", this.message)
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
      this.endRefresh()
      await this.message.delete()
    }
    catch (err) {
      console.log("Failed to delete message in TMMP")
      console.error(err)
    }
  }
}