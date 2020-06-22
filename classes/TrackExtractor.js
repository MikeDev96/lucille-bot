const SpotifyWebApi = require("spotify-web-api-node")
const config = require("../config.json")
const axios = require("axios")
const ytdl = require("discord-ytdl-core")
const Track = require("./Track")

const PLATFORM_SPOTIFY = "spotify"
const PLATFORM_TIDAL = "tidal"
const PLATFORM_APPLE = "apple"
const PLATFORM_YOUTUBE = "youtube"

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
      this.links.push({ platform: "youtube", type: "track", id })
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
        case PLATFORM_YOUTUBE: return await this.getYouTube(link.type, link.id)
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
        ).setPlatform(PLATFORM_SPOTIFY)]
      }
      else if (type === "album") {
        const res = await spotifyApi.getAlbum(id)

        return res.body.tracks.items.map(t => new Track(
          t.artists.map(a => a.name).join(", "),
          t.name,
          res.body.images[0].url,
        ).setPlatform(PLATFORM_SPOTIFY))
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
        ).setPlatform(PLATFORM_SPOTIFY))
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

  async getYouTube (type, id) {
    return new Promise((resolve, reject) => {
      ytdl.getBasicInfo(`https://youtube.com/watch?v=${id}`, (err, info) => {
        if (!err) {
          resolve([new Track(
            info.author.name,
            info.title,
            info.player_response.videoDetails.thumbnail.thumbnails[info.player_response.videoDetails.thumbnail.thumbnails.length - 1].url,
          ).setPlatform(PLATFORM_YOUTUBE)
            .setLink(info.video_url)
            .setYouTubeTitle(info.title)
            .setDuration(parseInt(info.length_seconds)),
          ])
        }
        else {
          console.log(err)
          reject(err)
        }
      })
    })
  }
}