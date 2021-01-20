const { PLATFORM_SPOTIFY, PLATFORM_TIDAL, PLATFORM_APPLE, PLATFORM_RADIO } = require("./TrackExtractor")
const axios = require("axios")
const SpotifyWebApi = require("spotify-web-api-node")
const config = require("../config.json")

module.exports = class {
  constructor (music) {
    this.music = music
  }

  async processLink () {
    if (this.music.platform === PLATFORM_SPOTIFY) {
      const spotifyRes = await this.getSpotify()
      if (spotifyRes) {
        const tidalRes = this.music.type !== "playlist" && await this.searchTidal(spotifyRes.artists, spotifyRes.title)
        const appleRes = this.music.type !== "playlist" && await this.searchApple(spotifyRes.artists, spotifyRes.title)
        return {
          spotifyId: this.music.id,
          tidalId: (tidalRes || {}).id,
          appleId: (appleRes || {}).id,
          type: this.music.type,
          artists: spotifyRes.artists,
          name: spotifyRes.title,
          thumbnail: spotifyRes.thumbnail,
        }
      }
    }
    else if (this.music.platform === PLATFORM_TIDAL) {
      const tidalRes = await this.getTidal()
      if (tidalRes.success) {
        const spotifyRes = await this.searchSpotify(tidalRes.artists, tidalRes.title)
        const appleRes = await this.searchApple(tidalRes.artists, tidalRes.title)
        return {
          spotifyId: (spotifyRes || {}).id,
          tidalId: this.music.id,
          appleId: (appleRes || {}).id,
          type: this.music.type,
          artists: tidalRes.artists,
          name: tidalRes.title,
          thumbnail: tidalRes.thumbnail,
        }
      }
    }
    else if (this.music.platform === PLATFORM_APPLE) {
      const appleRes = await this.getApple()
      if (appleRes) {
        const spotifyRes = await this.searchSpotify(appleRes.artists, appleRes.title)
        const tidalRes = await this.searchTidal(appleRes.artists, appleRes.title)
        return {
          spotifyId: (spotifyRes || {}).id,
          tidalId: (tidalRes || {}).id,
          appleId: this.music.id,
          type: this.music.type,
          artists: appleRes.artists,
          name: appleRes.title,
          thumbnail: appleRes.thumbnail,
        }
      }
    }
    else if (this.music.platform === PLATFORM_RADIO) {
      const spotifyRes = await this.searchSpotify(this.music.artists, this.music.title)
      const tidalRes = await this.searchTidal(this.music.artists, this.music.title)
      const appleRes = await this.searchApple(this.music.artists, this.music.title)

      if (!spotifyRes || !spotifyRes.id) {
        console.log(`MusicToX Spotify failure - Artists: '${this.music.artists}', Title: '${this.music.title}'`)
      }

      if (!tidalRes || !tidalRes.id) {
        console.log(`MusicToX Tidal failure - Artists: '${this.music.artists}', Title: '${this.music.title}'`)
      }

      if (!appleRes || !appleRes.id) {
        console.log(`MusicToX Apple failure - Artists: '${this.music.artists}', Title: '${this.music.title}'`)
      }

      return {
        spotifyId: (spotifyRes || {}).id,
        tidalId: (tidalRes || {}).id,
        appleId: (appleRes || {}).id,
      }
    }
  }

  async getSpotify () {
    try {
      const spotifyApi = await this.getSpotifyApi()
      if (!spotifyApi) {
        return null
      }

      if (this.music.type === "track") {
        const res = await spotifyApi.getTrack(this.music.id, { market: "GB" })
        return {
          artists: res.body.artists.map(a => a.name).join(", "),
          title: res.body.name,
          thumbnail: res.body.album.images[0].url,
        }
      }
      else if (this.music.type === "album") {
        const res = await spotifyApi.getAlbum(this.music.id, { market: "GB" })
        return {
          artists: res.body.artists.map(a => a.name).join(", "),
          title: res.body.name,
          thumbnail: res.body.images[0].url,
          tracks: res.body.tracks.items,
        }
      }
      else if (this.music.type === "artist") {
        const res = await spotifyApi.getArtist(this.music.id, { market: "GB" })
        return {
          artists: res.body.name,
          title: "",
          thumbnail: res.body.images[0].url,
        }
      }
      else if (this.isPlaylist) {
        const playlistRes = await spotifyApi.getPlaylist(this.music.id, { market: "GB" })
        const tracks = playlistRes.body.tracks.items

        const calls = Math.floor(playlistRes.body.tracks.total / 100)
        const playlistTracksRequests = []
        for (let i = 0; i < calls; i++) {
          playlistTracksRequests.push(spotifyApi.getPlaylistTracks(this.music.id, { offset: 100 + i * 100, market: "GB" }))
        }

        const fulfilledPlaylistTracksRequests = await Promise.all(playlistTracksRequests)
        fulfilledPlaylistTracksRequests.forEach(p => tracks.push(...p.body.items))

        return {
          artists: playlistRes.body.owner.display_name,
          title: playlistRes.body.name,
          thumbnail: playlistRes.body.images[0].url,
          tracks: playlistRes.body.tracks.items,
        }
      }
    }
    catch (err) {
      console.log("Get Spotify failed")
      console.log(err)
    }
  }

  async searchSpotify (artist, title) {
    try {
      let query
      if (this.music.type === "track") {
        query = `artist:${artist} track:${title}`
      }
      else if (this.music.type === "album") {
        query = `artist:${artist} album:${title}`
      }
      else {
        query = `artist:${artist}`
      }

      const spotifyApi = await this.getSpotifyApi()
      if (!spotifyApi) {
        return null
      }

      const res = await spotifyApi.search(query, [this.music.type], { limit: 1, market: "GB" })
      if (res.statusCode === 200) {
        if (this.music.type === "track") {
          const track = res.body.tracks.items[0]
          if (track) {
            return {
              id: track.id,
              artists: track.artists,
              name: track.name,
              thumbnail: track.album.images[0].url,
            }
          }
        }
        else if (this.music.type === "album") {
          const album = res.body.albums.items[0]
          if (album) {
            return {
              id: album.id,
              artists: album.artists,
              name: album.name,
              thumbnail: album.images[0].url,
            }
          }
        }
        else {
          const artist = res.body.artists.items[0]
          if (artist) {
            return {
              id: artist.id,
              artists: [artist],
              name: "",
              thumbnail: artist.images[0].url,
            }
          }
        }
      }
    }
    catch (err) {
      console.log("Search Spotify failed")
      console.error(err)
    }

    return null
  }

  async getTidal () {
    try {
      const res = await axios.get(`https://api.tidal.com/v1/${this.music.type}s/${this.music.id}?limit=1&countryCode=GB`, {
        headers: {
          "X-Tidal-Token": config.tidal.token,
        },
      })

      if (res && res.status === 200) {
        if (this.music.type === "track") {
          return {
            success: true,
            artists: res.data.artists.map(a => a.name).join(", "),
            title: res.data.title,
            thumbnail: `https://resources.tidal.com/images/${res.data.album.cover.replace(/-/g, "/")}/320x320.jpg`,
          }
        }
        else if (this.music.type === "album") {
          return {
            success: true,
            artists: res.data.artists.map(a => a.name).join(", "),
            title: res.data.title,
            thumbnail: `https://resources.tidal.com/images/${res.data.cover.replace(/-/g, "/")}/320x320.jpg`,
          }
        }
        else if (this.music.type === "artist") {
          return {
            success: true,
            artists: res.data.name,
            title: "",
            thumbnail: `https://resources.tidal.com/images/${res.data.picture.replace(/-/g, "/")}/320x320.jpg`,
          }
        }
      }
    }
    catch (err) {
      console.log("Get Tidal failed")
      console.log(err)
    }

    return { success: false }
  }

  async searchTidal (artist, title) {
    let query
    if (this.music.type === "track") {
      query = `${artist} - ${title}`
    }
    else if (this.music.type === "album") {
      query = `${artist} - ${title}`
    }
    else {
      query = `${artist}`
    }

    try {
      // Tidal search seems to work a lot better when removing titles with the word 'feat'
      const withoutFeat = query.replace(/(?<=\b)feat(?=\b)/gi, "")
      const res = await axios.get(`https://api.tidal.com/v1/search/${this.music.type}s?query=${encodeURIComponent(withoutFeat)}&limit=1&countryCode=GB`, {
        headers: {
          "X-Tidal-Token": config.tidal.token,
        },
      })

      if (res.status === 200 && res.data.totalNumberOfItems) {
        const track = res.data.items[0]
        return {
          id: track && track.id,
          artists: (track && (track.artist && [{ name: track.artist.name }])) || [],
          name: track && this.music.type === "track" ? track.title : this.music.type === "artist" ? track.name : "",
        }
      }
    }
    catch (err) {
      console.log("Search Tidal failed")
      console.log(err)
    }

    return null
  }

  async getApple () {
    try {
      const res = await axios.get(`https://itunes.apple.com/lookup?id=${this.music.id}`)

      if (res && res.status === 200 && res.data.resultCount > 0) {
        const item = res.data.results[0]

        if (item.wrapperType === "track") {
          return {
            artists: item.artistName,
            title: item.trackName,
            thumbnail: item.artworkUrl100,
          }
        }
        else if (item.wrapperType === "collection") {
          return {
            artists: item.artistName,
            title: item.collectionName,
            thumbnail: item.artworkUrl100,
          }
        }
        else if (item.wrapperType === "artist") {
          return {
            artists: item.artistName,
            title: "",
            thumbnail: "",
          }
        }
      }
    }
    catch (err) {
      console.log("Get Apple failed")
      console.log(err)
    }

    return null
  }

  async searchApple (artist, title) {
    let query
    if (this.music.type === "track") {
      query = `${artist} - ${title}`
    }
    else if (this.music.type === "album") {
      query = `${artist} - ${title}`
    }
    else {
      query = `${artist}`
    }

    try {
      const res = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=GB&entity=${this.music.type === "track" ? "song" : this.music.type === "album" ? "album" : "musicArtist"}&media=music&limit=1`)

      if (res && res.status === 200 && !!res.data.resultCount > 0) {
        const item = res.data.results[0]
        const type = item.wrapperType

        if (type === "track") {
          return {
            id: item.collectionId + "-" + item.trackId,
            artists: item.artistName,
            name: item.trackName,
          }
        }
        else if (type === "collection") {
          return {
            id: item.collectionId.toString(),
            artists: item.artistName,
            name: item.collectionName,
          }
        }
        else if (type === "artist") {
          return {
            id: item.artistId.toString(),
            artists: item.artistName,
            name: "",
          }
        }
      }
    }
    catch (err) {
      console.log("Search Apple failed")
      console.log(err)
    }

    return null
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
}