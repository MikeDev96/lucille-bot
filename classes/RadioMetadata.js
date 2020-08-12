const events = require("events")
const WebSocket = require("ws")
const debounce = require("lodash/debounce")
const { default: Axios } = require("axios")
const EventSource = require("eventsource")

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
    else if (this.state.type === "sse") {
      this.sse()
    }
    else if (this.state.type === "poll") {
      this.poll()
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
      else if (nowPlaying.type === "show") {
        emitInfo({
          artist: "",
          title: nowPlaying.name,
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

  sse () {
    const [setCookie] = this.state.summon.headers["set-cookie"]
    const [sessionId] = /(?<=AISSessionId=).+?(?=;)/.exec(setCookie)

    const es = new EventSource(this.state.url, {
      headers: {
        cookie: `AISSessionId=${sessionId}`,
      },
    })

    es.onmessage = async (event) => {
      const data = JSON.parse(event.data)
      const list = data["metadata-list"]
      const item = list[list.length - 1]

      const match = /(title=".+?",)?url="(.+?)"/.exec(item.metadata)
      if (match) {
        const [, title, url] = match
        if (title) {
          try {
            const res = await Axios(url)
            if (res.status === 200 && res.data) {
              this.state.event.emit("info", {
                artist: res.data.eventSongArtist,
                title: res.data.eventSongTitle,
              })
            }
          }
          catch (err) {
            console.log("Error when trying to resolve radio metadata")
            console.log(err)
          }
        }
        else {
          this.state.event.emit("info", {
            artist: "",
            title: "",
          })
        }
      }
    }

    this.es = es
  }

  poll () {
    const fire = async () => {
      try {
        const res = await Axios(this.state.url)
        if (res.status === 200 && res.data) {
          const nowPlaying = res.data.data.find(item => item.type === "segment_item" && item.offset.now_playing)
          if (nowPlaying) {
            this.state.event.emit("info", {
              artist: nowPlaying.titles.primary,
              title: nowPlaying.titles.secondary,
            })
          }
          else {
            this.state.event.emit("info", {
              artist: "",
              title: "",
            })
          }
        }
      }
      catch (err) {
        console.log("Error when polling radio metadata")
        console.log(err)
      }
    }

    this.poll = setInterval(fire, this.state.summon * 1000)
    fire()
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
      if (this.ws.readyState !== this.ws.CLOSED) {
        this.ws.close()
      }
    }
    else if (this.state.type === "sse") {
      if (this.es.readyState !== this.es.CLOSED) {
        this.es.close()
      }
    }
    else if (this.state.type === "poll") {
      clearInterval(this.poll)
    }
  }
}

module.exports = {
  RadioMetadata,
}