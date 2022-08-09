import { EventEmitter } from "events"
import WebSocket from "ws"
import { debounce } from "lodash-es"
import fetch from "node-fetch"
import EventSource from "eventsource"

export default class RadioMetadata extends EventEmitter {
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
  }

  webSocket () {
    const ws = new WebSocket(this.state.url)

    ws.on("open", () => {
      if (this.state.disposed) {
        ws.close()
      }
      else {
        ws.send(JSON.stringify(this.state.summon))

        if (this.provider === "aiir") {
          this.heartbeatHandle = setInterval(() => ws.send(JSON.stringify({ action: "heartbeat" })), 12e4)
        }
      }
    })

    const emitInfo = debounce(info => {
      this.emit("data", info)
    }, 500)

    ws.on("message", (json) => {
      const data = JSON.parse(json)

      if (this.provider === "musicradio") {
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
      }
      else if (this.provider === "aiir") {
        if (data && data.nowPlaying && data.nowPlaying.artist && data.nowPlaying.title) {
          this.emit("data", {
            artist: data.nowPlaying.artist,
            title: data.nowPlaying.title,
          })
        }
        else if (data && data.nowProgramme && data.nowProgramme.name && data.nowProgramme.description) {
          this.emit("data", {
            artist: "",
            title: `${data.nowProgramme.name} ${data.nowProgramme.description}`,
          })
        }
        else {
          this.emit("data", {
            artist: "",
            title: "",
          })
        }
      }
    })

    ws.on("error", err => {
      console.log("Error when grabbing radio metadata via ws")
      console.log(err)
    })

    ws.on("close", () => {
      if (this.heartbeatHandle) {
        clearInterval(this.heartbeatHandle)
        this.heartbeatHandle = null
      }
    })

    this.ws = ws
  }

  sse () {
    const setCookie = this.stream.headers.get("set-cookie")
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
                const res = await fetch(url)
                const data = await res.json()
                if (res.ok && data) {
                  out.artist = data.eventSongArtist
                  out.title = data.eventSongTitle
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
        const res = await fetch(this.state.url)
        const data = await res.json()
        if (res.ok && data) {
          const nowPlaying = data.data.find(item => item.type === "segment_item" && item.offset.now_playing)
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
  }
}