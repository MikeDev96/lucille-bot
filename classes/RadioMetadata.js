const events = require("events")
const WebSocket = require("ws")
const debounce = require("lodash/debounce")

const RadioMetadata = class {
  constructor (type, url, summon) {
    this.state = {
      type,
      url,
      summon,
      event: new events.EventEmitter(),
    }

    if (this.state.type === "ws") {
      this.webSocket()
    }
  }

  webSocket () {
    const ws = new WebSocket(this.state.url)

    ws.on("open", () => {
      ws.send(JSON.stringify(this.state.summon))
    })

    const emitInfo = debounce(info => {
      this.state.event.emit("info", info)
    }, 500)

    ws.on("message", (json) => {
      const data = JSON.parse(json)
      const nowPlaying = data.now_playing

      if (nowPlaying.type === "track") {
        emitInfo({
          artist: nowPlaying.artist,
          title: nowPlaying.title,
        })
      }
      else {
        emitInfo({
          artist: "",
          title: "",
        })
      }
    })

    this.ws = ws
  }

  subscribe (callback) {
    this.state.event.on("info", callback)
    return callback
  }

  unsubscribe (callback) {
    this.state.event.off("info", callback)
  }

  dispose () {
    if (this.state.type === "ws") {
      if (this.ws.readyState === this.ws.OPEN) {
        this.ws.close()
      }
    }
  }
}

module.exports = {
  RadioMetadata,
}