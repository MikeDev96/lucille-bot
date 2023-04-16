import SpotifyWebApi from "spotify-web-api-node"
import fetch from "node-fetch"
import Track from "./Track.js"
import parseDuration from "parse-duration"
import { Client, Video } from "youtubei"
import { URL } from "url"
import { getFreeClientID } from "play-dl"

export const PLATFORM_SPOTIFY = "spotify"
export const PLATFORM_TIDAL = "tidal"
export const PLATFORM_APPLE = "apple"
export const PLATFORM_YOUTUBE = "youtube"
export const PLATFORM_SOUNDCLOUD = "soundcloud"
export const PLATFORM_OTHER = "other"
export const PLATFORM_RADIO = "radio"
export const PLATFORM_CONNECT = "connect"
export const PLATFORM_DISCONNECT = "disconnect"
export const PLATFORM_TTS = "tts"

export default class TrackExtractor {
  constructor (input) {
    this.input = input
  }

  parseLinks () {
    this.links = []
    let input = this.input

    const spotPattern = /(?:open\.)?spotify(?:.com)?[/:](track|album|artist|playlist)[/:](\w+)/g
    let spotMatch
    while ((spotMatch = spotPattern.exec(input))) {
      const [, type, id] = spotMatch
      this.links.push({ platform: "spotify", type, id })
    }

    input = input.replace(spotPattern, "")

    const tidalPattern = /tidal(?:.com)?(?:\/browse)?:?\/\/?(track|album|artist|playlist)[/:]([\w-]+)/g
    let tidalMatch
    while ((tidalMatch = tidalPattern.exec(input))) {
      const [, type, id] = tidalMatch
      this.links.push({ platform: "tidal", type, id })
    }

    input = input.replace(tidalPattern, "")

    const applePattern = /music.apple.com\/[a-z]{2}\/(album|artist|playlist)\/(?:.+?\/)?(?:(\d+)(?:\?i=(\d+))?|(pl.\w+))/g
    let appleMatch
    while ((appleMatch = applePattern.exec(input))) {
      const [, type, id, songId, playlistId] = appleMatch
      this.links.push({ platform: "apple", type: type === "album" ? songId ? "track" : type : type, id: playlistId || songId || id })
    }

    input = input.replace(applePattern, "")

    const youtubePattern = /(?:https?:\/\/www.)?youtu(?:be.com\/watch\?v=|.be\/)([\w-]+)/g
    let youtubeMatch
    while ((youtubeMatch = youtubePattern.exec(input))) {
      const [url, id] = youtubeMatch
      const link = { platform: "youtube", type: "track", id, startTime: 0 }
      const queryParams = new URL(url).searchParams
      if (queryParams.has("t")) {
        const timeParam = queryParams.get("t")
        const startTime = !/[a-zA-Z]/.test(timeParam) ? timeParam + "s" : timeParam
        const duration = parseDuration(startTime, "s")
        if (duration) {
          link.startTime = duration * 1000
        }
      }
      this.links.push(link)
    }

    input = input.replace(youtubePattern, "")

    const youtubePlaylistPattern = /(?:https?:\/\/www.)?youtube.com\/playlist\?list=([\w-]+)/g
    let youtubePlaylistMatch
    while ((youtubePlaylistMatch = youtubePlaylistPattern.exec(input))) {
      const [, id] = youtubePlaylistMatch
      const link = { platform: "youtube", type: "playlist", id }
      this.links.push(link)
    }

    input = input.replace(youtubePlaylistPattern, "")

    const soundCloudPattern = /soundcloud.com\/((?:[\w-]+?)\/(?:sets\/)?(?:[\w-]+)(?:\/\b[\w-]+)?)\b/g
    let soundCloudMatch
    while ((soundCloudMatch = soundCloudPattern.exec(input))) {
      const [, id] = soundCloudMatch
      this.links.push({ platform: "soundcloud", type: "track", id })
    }

    input = input.replace(soundCloudPattern, "")

    const otherPattern = /https?:\/\/(?:www.)?\w+.\w+(?:.\w+).+/g
    let otherMatch
    while ((otherMatch = otherPattern.exec(input))) {
      const [id] = otherMatch
      this.links.push({ platform: PLATFORM_OTHER, type: "track", id })
    }

    input = input.replace(otherPattern, "")

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
        )
          .setPlatform(PLATFORM_SPOTIFY)
          .setSpotifyUri(res.body.uri)]
      }
      else if (type === "album") {
        const res = await spotifyApi.getAlbum(id)

        return res.body.tracks.items.map(t => new Track(
          t.artists.map(a => a.name).join(", "),
          t.name,
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
      clientId: process.env.SPOTIFY_CLIENTID,
      clientSecret: process.env.SPOTIFY_CLIENTSECRET,
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
      const res = await fetch(`https://api.tidal.com/v1/${type}s/${id}${["playlist", "album"].includes(type) ? "/tracks" : type === "artist" ? "/toptracks" : ""}?limit=10000&countryCode=GB`, {
        headers: {
          "x-tidal-token": process.env.TIDAL_TOKEN,
        },
      })

      if (res.ok) {
        const data = await res.json()

        return [].concat(data.items || data).map(t => new Track(
          t.artists.map(a => a.name).join(", "),
          t.title,
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
      const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song`)
      const data = await res.json()

      if (res.ok && data.resultCount > 0) {
        return data.results.filter(t => t.wrapperType === "track").map(t => new Track(
          t.artistName,
          t.trackName,
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
        const video = await new Client().getVideo(id)
        if (video) {
          return [
            new Track(video.channel.name, video.title)
              .setPlatform(PLATFORM_YOUTUBE)
              .setLink(`https://www.youtube.com/watch?v=${video.id}`)
              .setYouTubeId(video.id)
              .setYouTubeTitle(video.title)
              .setDuration(video instanceof Video ? video.duration : 0)
              .setStartTime(startTime || 0),
          ]
        }
      }
      else if (type === "playlist") {
        const playlist = await new Client().getPlaylist(id)
        await playlist.videos.next(0)

        return playlist.videos.items.map(item =>
          new Track(item.channel.name, item.title)
            .setPlatform(PLATFORM_YOUTUBE)
            .setLink(`https://www.youtube.com/watch?v=${item.id}`)
            .setYouTubeId(item.id)
            .setYouTubeTitle(item.title)
            .setDuration(item.duration),
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
      const clientId = await getSoundCloudClientId()
      const res = await fetch(`https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(`https://soundcloud.com/${id}`)}&client_id=${clientId}`)
      const data = await res.json()

      if (res.ok && data) {
        const tracks = data.kind === "track" ? [data] : data.tracks
        const validTracks = tracks.filter(t => t.media && t.media.transcodings)

        const audioLinks = (await Promise.all(validTracks.map(t => this.getSoundCloudLink(t.media.transcodings))))

        return validTracks.filter((_t, tIdx) => audioLinks[tIdx]).map((t, tIdx) => new Track(
          t.user.username,
          t.title,
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
        const parsedUrl = new URL(transcoding.url)
        parsedUrl.searchParams.set("client_id", await getSoundCloudClientId())

        const res = await fetch(parsedUrl.href)
        const data = await res.json()

        if (res.ok && data) {
          return data.url
        }
      }
    }

    return null
  }

  async getOther (id) {
    try {
      const res = await fetch(id)
      const contentType = res.headers.get("content-type")

      if (contentType && (contentType.startsWith("audio/") || contentType.startsWith("video/"))) {
        const track = new Track("Custom Link", id)
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

let scClientId = ""
let scLastGenerated

const getSoundCloudClientId = async () => {
  if (!scClientId || !scLastGenerated || Date.now() - scLastGenerated >= 60 * 60 * 1e3) {
    scClientId = await getFreeClientID()
    scLastGenerated = Date.now()
  }

  return scClientId
}