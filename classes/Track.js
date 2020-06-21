module.exports = class Track {
  constructor (artists, title, thumbnail) {
    this.artists = artists || ""
    this.title = title || ""
    this.thumbnail = thumbnail || ""
  }

  setArtists (artists) {
    this.artists = artists
    return this
  }

  setTitle (title) {
    this.title = title
    return this
  }

  setThumbnail (thumbnail) {
    this.thumbnail = thumbnail
    return this
  }

  setRequestee (requestee) {
    this.requestee = requestee
    return this
  }

  setLink (link) {
    this.link = link
    return this
  }

  setPlatform (platform) {
    this.platform = platform
    return this
  }

  setQuery (query) {
    this.query = query
    return this
  }

  setYouTubeTitle (youTubeTitle) {
    this.youTubeTitle = youTubeTitle
    return this
  }

  setDuration (duration) {
    this.duration = duration
    return this
  }

  clone (track) {
    this.artists = track.artists
    this.title = track.title
    this.thumbnail = track.thumbnail
    this.requestee = track.requestee
    this.link = track.link
    this.platform = track.platform
    this.query = track.query
    this.youTubeTitle = track.youTubeTitle
    return this
  }
}