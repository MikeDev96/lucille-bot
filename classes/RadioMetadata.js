const { EventEmitter } = require("events")
const WebSocket = require("ws")
const debounce = require("lodash.debounce")
const axios = require("axios")
const EventSource = require("eventsource")
const io = require("socket.io-client")
const fetch = require("node-fetch")

const RadioMetadata = class extends EventEmitter {
  constructor ({ type, url, summon, provider, payload }, stream) {
    super()

    this.stream = stream
    this.provider = provider
    this.payload = payload
    this.state = {
      type,
      url,
      summon,
      disposed: false,
      startTime: null,
      initiated: false,
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
    else if (this.state.type === "socket.io") {
      if (provider === "aiir") {
        this.aiir(payload)
      }
    }
  }

  webSocket () {
    const ws = new WebSocket(this.state.url)

    ws.on("open", () => {
      if (this.state.disposed) {
        ws.close()
      }
      else {
        ws.send(JSON.stringify(this.state.summon))
      }
    })

    const emitInfo = debounce(info => {
      this.emit("data", info)
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

    ws.on("error", err => {
      console.log("Error when grabbing radio metadata via ws")
      console.log(err)
    })

    this.ws = ws
  }

  sse () {
    const [setCookie] = this.stream.headers["set-cookie"]
    const [sessionId] = /(?<=AISSessionId=).+?(?=;)/.exec(setCookie)

    const es = new EventSource(this.state.url, {
      headers: {
        cookie: `AISSessionId=${sessionId}`,
      },
    })

    es.onopen = () => {
      if (this.state.disposed) {
        es.close()
      }
      else {
        if (!this.state.initiated) {
          this.state.initiated = true
          this.state.startTime = Date.now()
        }
      }
    }

    es.onmessage = async (event) => {
      const data = JSON.parse(event.data)
      const list = data["metadata-list"]

      for (const item of list) {
        if (item.metadata && item.start) {
          const match = /(title=".+?",)?url="(.+?)"/.exec(item.metadata)
          if (match) {
            const [, title, url] = match
            const out = { artist: "", title: "" }

            if (title && url) {
              try {
                const res = await axios(url)
                if (res.status === 200 && res.data) {
                  out.artist = res.data.eventSongArtist
                  out.title = res.data.eventSongTitle
                }
              }
              catch (err) {
                console.log("Error when trying to resolve radio metadata")
                console.log(err)
              }
            }

            const delay = this.state.startTime + parseInt(item.start) - Date.now()
            setTimeout(() => {
              this.emit("data", out)
            }, delay)
          }
        }
      }
    }

    es.on("error", err => {
      console.log("Error when grabbing radio metadata via sse")
      console.log(err)
    })

    this.es = es
  }

  poll () {
    const fire = async () => {
      try {
        const res = await axios(this.state.url)
        if (res.status === 200 && res.data) {
          const nowPlaying = res.data.data.find(item => item.type === "segment_item" && item.offset.now_playing)
          if (nowPlaying) {
            this.emit("data", {
              artist: nowPlaying.titles.primary,
              title: nowPlaying.titles.secondary,
            })
          }
          else {
            this.emit("data", {
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

  aiir ({ service, initUrl }) {
    const handleData = e => {
      if (e && (!e.type || e.type === "new-item") && e.feed && e.feed.items && e.feed.items[0]) {
        const item = e.feed.items[0]
        if (item.type === "song") {
          this.emit("data", {
            artist: item.title,
            title: item.desc,
          })
        }
        else if (item.type === "onair") {
          this.emit("data", {
            artist: "",
            title: `${item.name} ${item.caption}`,
          })
        }
      }
      else {
        this.emit("data", {
          artist: "",
          title: "",
        })
      }
    }

    const sock = io(this.state.url)
      .on("connect", () => {
        sock.emit("subscribe", service)
        fetch(initUrl).then(res => res.json()).then(handleData)
      })
      .on("message", handleData)

    this.socket = sock
  }

  destroy () {
    this.state.disposed = true
    this.stream = null
    this.removeAllListeners("data")

    if (this.state.type === "ws") {
      if (this.ws.readyState === this.ws.OPEN) {
        this.ws.close()
      }
    }
    else if (this.state.type === "sse") {
      if (this.es.readyState === this.es.OPEN) {
        this.es.close()
      }
    }
    else if (this.state.type === "poll") {
      clearInterval(this.poll)
    }
    else if (this.state.type === "socket.io") {
      if (this.socket) {
        this.socket.close()
        this.socket = null
      }
    }
  }
}

module.exports = {
  RadioMetadata,
}