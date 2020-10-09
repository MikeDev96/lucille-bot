const EventEmitter = require("events")

const TIMEOUT_DURATION = 10000
const VOLUME_OFF = 100
const VOLUME_LOWER = 30
const VOLUME_MUTE = 0
const METHOD_OFF = "off"
const METHOD_LOWER = "lower"
const METHOD_MUTE = "mute"

class RadioAdBlock extends EventEmitter {
  constructor () {
    super()
    this.volume = VOLUME_OFF
    this.method = METHOD_OFF
    this.blocking = false
    this.blockHandle = null
  }

  setVolume (volume) {
    this.volume = volume
  }

  setMethod (method) {
    this.method = method
    this.broadcast()
  }

  activate () {
    this.blockHandle = setTimeout(() => {
      this.blockHandle = null

      this.blocking = true
      this.broadcast()
    }, TIMEOUT_DURATION)
  }

  deactivate () {
    if (this.blockHandle) {
      clearTimeout(this.blockHandle)
    }

    this.blocking = false
    this.broadcast()
  }

  broadcast () {
    const volume = this.blocking ? this.method === METHOD_LOWER ? VOLUME_LOWER : this.method === METHOD_MUTE ? VOLUME_MUTE : this.volume : this.volume
    this.emit("volume", volume)
  }

  toggle (bool) {
    if (bool) {
      this.activate()
    }
    else {
      this.deactivate()
    }
  }

  isMethod (method) {
    return this.method === method
  }

  isBlocking () {
    return this.blocking
  }
}

module.exports = RadioAdBlock
module.exports.METHOD_OFF = METHOD_OFF
module.exports.METHOD_LOWER = METHOD_LOWER
module.exports.METHOD_MUTE = METHOD_MUTE