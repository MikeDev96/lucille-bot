module.exports = class {
  constructor (strings) {
    this.strings = strings
  }

  split () {
    const tracks = [...this.strings]
    const out = { strings: [], remaining: [] }
    let trackCount = 0
    let fieldCount = 0

    while (!!tracks.length && trackCount < 10 && fieldCount < 5) {
      let queue = ""
      let prevQueue = ""
      const startTracks = trackCount
      while (!!tracks.length && trackCount < 10) {
        const [content] = tracks.splice(0, 1)
        if (queue) {
          queue += "\n"
        }
        queue += content

        if (queue.length > 1024) {
          tracks.unshift(content)
          queue = prevQueue
          break
        }

        trackCount++
        prevQueue = queue
      }

      out.strings.push({ subString: queue, startIndex: startTracks, endIndex: trackCount - 1 })
      fieldCount++
    }

    if (tracks.length) {
      out.remaining = tracks
    }

    return out
  }
}