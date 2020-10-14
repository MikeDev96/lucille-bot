const Porcupine = require("@picovoice/porcupine-node")
const EventEmitter = require("events")

class HotwordDetector extends EventEmitter {
  constructor ({ stream, hotwordFile, sensitivity }) {
    super()
    this.handle = new Porcupine([hotwordFile], [sensitivity])
    this.frameAccumulator = []
    this.stream = stream
    this.handleData = this.onData.bind(this)
    this.stream.on("data", this.handleData)
  }

  onData (data) {
    // Two bytes per Int16 from the data buffer
    const newFrames16 = new Array(data.length / 2)
    for (let i = 0; i < data.length; i += 2) {
      newFrames16[i / 2] = data.readInt16LE(i)
    }

    // Split the incoming PCM integer data into arrays of size Porcupine.frameLength. If there's insufficient frames, or a remainder,
    // store it in 'frameAccumulator' for the next iteration, so that we don't miss any audio data
    this.frameAccumulator = this.frameAccumulator.concat(newFrames16)
    const frames = this.chunkArray(this.frameAccumulator, this.handle.frameLength)

    if (frames[frames.length - 1].length !== this.handle.frameLength) {
      // store remainder from divisions of frameLength
      this.frameAccumulator = frames.pop()
    }
    else {
      this.frameAccumulator = []
    }

    for (const frame of frames) {
      const index = this.handle.process(frame)
      if (index !== -1) {
        this.stream.off("data", this.handleData)
        this.emit("hotword", () => this.stream.on("data", this.handleData))
      }
    }
  }

  // node_modules\@picovoice\porcupine-node\wave_util.js
  chunkArray (array, size) {
    return Array.from({ length: Math.ceil(array.length / size) }, (v, index) =>
      array.slice(index * size, index * size + size),
    )
  }
}

module.exports = HotwordDetector