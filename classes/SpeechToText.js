const speech = require("@google-cloud/speech")
const { throttle } = require("lodash")
const EventEmitter = require("events")

const request = {
  config: {
    encoding: "LINEAR16",
    sampleRateHertz: 16000,
    languageCode: "en-GB",
  },
  interimResults: true,
}

class SpeechToText extends EventEmitter {
  constructor ({ stream, throttle = 0 }) {
    super()
    this.stream = stream
    this.throttle = throttle
    this.recognizeStream = null
    this.init()
  }

  init () {
    const client = new speech.SpeechClient()

    let handleTranscript = (transcript, isFinal) => this.emit("transcript", transcript, isFinal)
    if (this.throttle) {
      handleTranscript = throttle(handleTranscript, this.throttle)
    }

    const recognizeStream = client
      .streamingRecognize(request)
      .on("error", console.error)
      .on("data", data => {
        if (data.results[0] && data.results[0].alternatives[0]) {
          handleTranscript(data.results[0].alternatives[0].transcript, data.results[0].isFinal)
        }
      })

    this.recognizeStream = recognizeStream
    this.stream.pipe(recognizeStream)

    // setTimeout(() => {
    //   this.stream.unpipe(recognizeStream)
    //   this.stream.resume()
    //   recognizeStream.end(() => {
    //     console.log("google stream ended")
    //     // this.stream.on("data", this.onData)
    //     this.emit("done")
    //   })
    // }, 5000)
  }

  stopListening () {
    this.stream.unpipe(this.recognizeStream)
    this.stream.resume()
    this.recognizeStream.end(() => {
      this.emit("done")
    })
  }
}

module.exports = SpeechToText