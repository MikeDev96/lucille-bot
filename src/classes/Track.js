export default class Track {
  constructor (artists, title) {
    this.artists = artists || ""
    this.title = title || ""
    this.finished = false
    this.startTime = 0
    this.listenTime = 0
  }

  setArtists (artists) {
    this.artists = artists
    return this
  }

  setTitle (title) {
    this.title = title
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

  setYouTubeLink (youTubeLink) {
    this.youTubeLink = youTubeLink
    return this
  }

  setDuration (duration) {
    this.duration = duration
    return this
  }

  setRequestStream (requestStream) {
    this.requestStream = requestStream
    return this
  }

  setRadio (radio) {
    this.radio = radio
    return this
  }

  setStartTime (startTime) {
    this.startTime = startTime
    return this
  }

  setRadioMetadata (radioMetadata) {
    this.radioMetadata = radioMetadata
    return this
  }

  setFinished (finished = true) {
    this.finished = finished
    return this
  }

  setSpotifyUri (spotifyUri) {
    this.spotifyUri = spotifyUri
    return this
  }

  setRadioInstance (radioInstance) {
    this.radioInstance = radioInstance
    return this
  }

  setRadioMusicToX (radioMusicToX) {
    this.radioMusicToX = radioMusicToX
    return this
  }

  setYouTubeId (youTubeId) {
    this.youTubeId = youTubeId
    return this
  }

  setTracked (tracked) {
    this.tracked = tracked
    return this
  }

  setListenTime (listenTime) {
    this.listenTime = listenTime
    return this
  }

  clone (track) {
    this.artists = track.artists
    this.title = track.title
    this.requestee = track.requestee
    this.link = track.link
    this.platform = track.platform
    this.query = track.query
    this.youTubeTitle = track.youTubeTitle
    this.youTubeLink = track.youTubeLink
    this.duration = track.duration
    this.requestStream = track.requestStream
    this.radio = track.radio
    this.startTime = track.startTime
    this.radioMetadata = track.radioMetadata
    this.finished = track.finished
    this.spotifyUri = track.spotifyUri
    this.radioInstance = track.radioInstance
    this.radioMusicToX = track.radioMusicToX
    this.youTubeId = track.youTubeId
    this.tracked = track.tracked
    this.listenTime = track.listenTime
    return this
  }

  reset () {
    return this
      .setStartTime(0)
      .setListenTime(0)
      .setTracked(false)
      .setFinished(false)
  }
};