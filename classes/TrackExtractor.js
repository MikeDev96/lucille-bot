const SpotifyWebApi = require("spotify-web-api-node")
const config = require("../config.json")
const axios = require("axios")
const ytdl = require("ytdl-core")
const Track = require("./Track")
const queryString = require("query-string")
const parseDuration = require("parse-duration")
const ytpl = require("ytpl")
const parseTime = require("m3u8stream/dist/parse-time")

const PLATFORM_SPOTIFY = "spotify"
const PLATFORM_TIDAL = "tidal"
const PLATFORM_APPLE = "apple"
const PLATFORM_YOUTUBE = "youtube"
const PLATFORM_SOUNDCLOUD = "soundcloud"
const PLATFORM_OTHER = "other"
const PLATFORM_RADIO = "radio"

module.exports = class {
  constructor (input) {
    this.input = input
  }

  parseLinks () {
    this.links = []

    const spotPattern = /(?:open\.)?spotify(?:.com)?[/:](track|album|artist|playlist)[/:](\w+)/g
    let spotMatch
    while ((spotMatch = spotPattern.exec(this.input))) {
      const [, type, id] = spotMatch
      this.links.push({ platform: "spotify", type, id })
    }

    const tidalPattern = /tidal(?:.com)?(?:\/browse)?:?\/\/?(track|album|artist|playlist)[/:]([\w-]+)/g
    let tidalMatch
    while ((tidalMatch = tidalPattern.exec(this.input))) {
      const [, type, id] = tidalMatch
      this.links.push({ platform: "tidal", type, id })
    }

    const applePattern = /music.apple.com\/[a-z]{2}\/(album|artist|playlist)\/(?:.+?\/)?(?:(\d+)(?:\?i=(\d+))?|(pl.\w+))/g
    let appleMatch
    while ((appleMatch = applePattern.exec(this.input))) {
      const [, type, id, songId, playlistId] = appleMatch
      this.links.push({ platform: "apple", type: type === "album" ? songId ? "track" : type : type, id: playlistId || songId || id })
    }

    const youtubePattern = /(?:https?:\/\/www.)?youtu(?:be.com\/watch\?v=|.be\/)([\w-]+)/g
    let youtubeMatch
    while ((youtubeMatch = youtubePattern.exec(this.input))) {
      const [, id] = youtubeMatch
      const link = { platform: "youtube", type: "track", id }
      const queryParams = queryString.parseUrl(this.input).query
      if (queryParams.t) {
        const startTime = !/[a-zA-Z]/.test(queryParams.t) ? queryParams.t + "s" : queryParams.t
        const duration = parseDuration(startTime, "s")
        if (duration) {
          link.startTime = duration
        }
      }
      this.links.push(link)
    }

    const youtubePlaylistPattern = /(?:https?:\/\/www.)?youtube.com\/playlist\?list=([\w-]+)/g
    let youtubePlaylistMatch
    while ((youtubePlaylistMatch = youtubePlaylistPattern.exec(this.input))) {
      const [, id] = youtubePlaylistMatch
      if (ytpl.validateID(id)) {
        const link = { platform: "youtube", type: "playlist", id }
        this.links.push(link)
      }
    }

    const soundCloudPattern = /soundcloud.com\/((?:[\w-]+?)\/(?:sets\/)?(?:[\w-]+)(?:\/\b[\w-]+)?)\b/g
    let soundCloudMatch
    while ((soundCloudMatch = soundCloudPattern.exec(this.input))) {
      const [, id] = soundCloudMatch
      this.links.push({ platform: "soundcloud", type: "track", id })
    }

    const otherPattern = /https?:\/\/(?:www.)?\w+.\w+(?:.\w+).+/g
    let otherMatch
    while ((otherMatch = otherPattern.exec(this.input))) {
      const [id] = otherMatch
      this.links.push({ platform: PLATFORM_OTHER, type: "track", id })
    }

    return this.links.length > 0
  }

  async getAllLinkInfo () {
    try {
      const linksTracks = await Promise.all(this.links.map(l => this.getLinkTracks(l)))
      return linksTracks.reduce((acc, cur) => {
        acc.push(...cur)
        return acc
      }, [])
    }
    catch (err) {
      console.log(err)
      return []
    }
  }

  async getLinkTracks (link) {
    try {
      switch (link.platform) {
      case PLATFORM_SPOTIFY: return await this.getSpotify(link.type, link.id)
      case PLATFORM_TIDAL: return await this.getTidal(link.type, link.id)
      case PLATFORM_APPLE: return await this.getApple(link.type, link.id)
      case PLATFORM_YOUTUBE: return await this.getYouTube(link.type, link.id, link.startTime)
      case PLATFORM_SOUNDCLOUD: return await this.getSoundCloud(link.type, link.id)
      case PLATFORM_OTHER: return await this.getOther(link.id)
      }
    }
    catch (err) {
      console.log(err)
    }

    return []
  }

  async getSpotify (type, id) {
    const spotifyApi = await this.getSpotifyApi()
    if (!spotifyApi) {
      return null
    }

    try {
      if (type === "track") {
        const res = await spotifyApi.getTrack(id)
        return [new Track(
          res.body.artists.map(a => a.name).join(", "),
          res.body.name,
          res.body.album.images[0].url,
        )
          .setPlatform(PLATFORM_SPOTIFY)
          .setSpotifyUri(res.body.uri)]
      }
      else if (type === "album") {
        const res = await spotifyApi.getAlbum(id)

        return res.body.tracks.items.map(t => new Track(
          t.artists.map(a => a.name).join(", "),
          t.name,
          res.body.images[0].url,
        )
          .setPlatform(PLATFORM_SPOTIFY)
          .setSpotifyUri(t.uri),
        )
      }
      else if (type === "artist") {
        const res = await spotifyApi.getArtist(id)
        console.log(res)
        return []
      }
      else if (type === "playlist") {
        const playlistRes = await spotifyApi.getPlaylist(id)
        const tracks = playlistRes.body.tracks.items

        const calls = Math.floor(playlistRes.body.tracks.total / 100)
        const playlistTracksRequests = []
        for (let i = 0; i < calls; i++) {
          playlistTracksRequests.push(spotifyApi.getPlaylistTracks(id, { offset: 100 + i * 100 }))
        }

        const fulfilledPlaylistTracksRequests = await Promise.all(playlistTracksRequests)
        fulfilledPlaylistTracksRequests.forEach(p => tracks.push(...p.body.items))

        return tracks.map(t => new Track(
          t.track.artists.map(a => a.name).join(", "),
          t.track.name,
          playlistRes.body.images[0].url,
        )
          .setPlatform(PLATFORM_SPOTIFY)
          .setSpotifyUri(t.track.uri))
      }
    }
    catch (err) {
      console.log("Get Spotify failed")
      console.log(err)
    }

    return []
  }

  async getSpotifyApi () {
    return await (this.spotifyApi || (this.spotifyApi = this.spotifyApiFactory()))
  }

  async spotifyApiFactory () {
    const spotifyApi = new SpotifyWebApi({
      clientId: config.spotify.clientId,
      clientSecret: config.spotify.clientSecret,
    })

    try {
      const res = await spotifyApi.clientCredentialsGrant()
      spotifyApi.setAccessToken(res.body.access_token)
      console.log("Spotify service ready")
    }
    catch (err) {
      console.log(err)
      return null
    }

    return spotifyApi
  }

  async getTidal (type, id) {
    try {
      const res = await axios.get(`https://api.tidal.com/v1/${type}s/${id}${["playlist", "album"].includes(type) ? "/tracks" : type === "artist" ? "/toptracks" : ""}?limit=10000&countryCode=GB`, {
        headers: {
          "x-tidal-token": config.tidal.token,
        },
      })

      if (res && res.status === 200) {
        return [].concat(res.data.items || res.data).map(t => new Track(
          t.artists.map(a => a.name).join(", "),
          t.title,
          `https://resources.tidal.com/images/${t.album.cover.replace(/-/g, "/")}/320x320.jpg`,
        ).setPlatform(PLATFORM_TIDAL))
      }
    }
    catch (err) {
      console.log("Get Tidal failed")
      console.log(err)
    }

    return []
  }

  async getApple (type, id) {
    try {
      const res = await axios.get(`https://itunes.apple.com/lookup?id=${id}&entity=song`)

      if (res && res.status === 200 && res.data.resultCount > 0) {
        return res.data.results.filter(t => t.wrapperType === "track").map(t => new Track(
          t.artistName,
          t.trackName,
          t.artworkUrl100,
        ).setPlatform(PLATFORM_APPLE))
      }
    }
    catch (err) {
      console.log("Get Apple failed")
      console.log(err)
    }

    return []
  }

  async getYouTube (type, id, startTime) {
    try {
      if (type === "track") {
        const info = await ytdl.getBasicInfo(`https://youtube.com/watch?v=${id}`)
        return [
          new Track(
            info.videoDetails.author.name,
            info.videoDetails.title,
            info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
          ).setPlatform(PLATFORM_YOUTUBE)
            .setLink(info.videoDetails.video_url)
            .setYouTubeId(info.videoDetails.videoId)
            .setYouTubeTitle(info.videoDetails.title)
            .setDuration(parseInt(info.videoDetails.lengthSeconds))
            .setStartTime(startTime),
        ]
      }
      else if (type === "playlist") {
        const res = await ytpl(id, { limit: Infinity })
        return res.items.map(item =>
          new Track(item.author.name, item.title, item.thumbnail)
            .setPlatform(PLATFORM_YOUTUBE)
            .setLink(item.url_simple)
            .setYouTubeId(item.videoId)
            .setYouTubeTitle(item.title)
            .setDuration(Math.floor(parseTime.humanStr(item.duration) / 1000)),
        )
      }
    }
    catch (err) {
      console.log("Get YouTube failed")
      console.log(err)
    }

    return []
  }

  async getSoundCloud (type, id) {
    try {
      const res = await axios.get(`https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(`https://soundcloud.com/${id}`)}&client_id=${config.soundCloud.clientId}`)

      if (res.data) {
        const tracks = res.data.kind === "track" ? [res.data] : res.data.tracks
        const validTracks = tracks.filter(t => t.media && t.media.transcodings)

        const audioLinks = (await Promise.all(validTracks.map(t => this.getSoundCloudLink(t.media.transcodings))))

        return validTracks.filter((_t, tIdx) => audioLinks[tIdx]).map((t, tIdx) => new Track(
          t.user.username,
          t.title,
          t.artwork_url,
        ).setPlatform(PLATFORM_SOUNDCLOUD)
          .setLink(audioLinks[tIdx])
          .setDuration(t.duration / 1000))
      }
    }
    catch (err) {
      console.log("Get SoundCloud failed")
      console.log(err)
    }

    return []
  }

  async getSoundCloudLink (transcodings) {
    if (transcodings) {
      const transcoding = transcodings[0]
      if (transcoding) {
        const parsedUrl = queryString.parseUrl(transcoding.url)
        const audioCdnUrl = queryString.stringifyUrl({ url: parsedUrl.url, query: { ...parsedUrl.query, client_id: config.soundCloud.clientId } })
        const res = await axios.get(audioCdnUrl)

        if (res.data) {
          return res.data.url
        }
      }
    }

    return null
  }

  async getOther (id) {
    try {
      const res = await axios({
        method: "GET",
        url: id,
        responseType: "stream",
      })
      const contentType = res.headers["content-type"]
      if (contentType.startsWith("audio/")) {
        const track = new Track("Custom Link", id, "")
          .setPlatform(PLATFORM_OTHER)
          .setLink(id)
          .setDuration(0)

        return [track]
      }
    }
    catch (err) {
      console.log("Get other failed")
      console.log(err)
    }

    return []
  }
}

module.exports.PLATFORM_SPOTIFY = "spotify"
module.exports.PLATFORM_TIDAL = "tidal"
module.exports.PLATFORM_APPLE = "apple"
module.exports.PLATFORM_YOUTUBE = "youtube"
module.exports.PLATFORM_SOUNDCLOUD = "soundcloud"
module.exports.PLATFORM_RADIO = PLATFORM_RADIO
module.exports.PLATFORM_OTHER = PLATFORM_OTHER