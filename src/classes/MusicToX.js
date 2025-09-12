import { PLATFORM_SPOTIFY, PLATFORM_TIDAL, PLATFORM_APPLE, PLATFORM_RADIO } from "./TrackExtractor.js"
import fetch from "node-fetch"
import SpotifyWebApi from "spotify-web-api-node"

export default class {
  constructor (music) {
    this.music = music
  }

  async processLink () {
    if (this.music.platform === PLATFORM_SPOTIFY) {
      const spotifyRes = await this.getSpotify()
      if (spotifyRes) {
        const tidalRes = this.music.type !== "playlist" && (await this.searchTidal(spotifyRes.artists, spotifyRes.title))
        const appleRes = this.music.type !== "playlist" && (await this.searchApple(spotifyRes.artists, spotifyRes.title))
        return {
          spotifyId: this.music.id,
          tidalId: (tidalRes || {}).id,
          appleId: (appleRes || {}).id,
          type: this.music.type,
          artists: spotifyRes.artists,
          name: spotifyRes.title,
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
        }
      }
      else if (this.music.type === "album") {
        const res = await spotifyApi.getAlbum(this.music.id, { market: "GB" })
        return {
          artists: res.body.artists.map(a => a.name).join(", "),
          title: res.body.name,
          tracks: res.body.tracks.items,
        }
      }
      else if (this.music.type === "artist") {
        const res = await spotifyApi.getArtist(this.music.id, { market: "GB" })
        return {
          artists: res.body.name,
          title: "",
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
      // Use OAuth2 method with v2 API
      const tidalApi = await this.getTidalApi()
      if (tidalApi) {
        const url = `https://openapi.tidal.com/v2/${this.music.type}s/${this.music.id}?countryCode=US&include=albums,artists`
        const res = await tidalApi.makeRequest(url)
        
        if (res.ok) {
          const data = await res.json()

          if (data) {
            if (this.music.type === "track") {
              // Handle v2 API response structure
              if (data.data && data.data.attributes) {
                const trackData = data.data
                // Check if artists are in included data
                let artists = []
                if (data.included) {
                  artists = data.included.filter(item => item.type === 'artists')
                }
                // Fallback to relationships if no included artists
                if (artists.length === 0 && trackData.relationships?.artists?.data) {
                  artists = trackData.relationships.artists.data
                }
                
                return {
                  success: true,
                  artists: artists.map(a => a.attributes?.name || a.name || "Unknown Artist").join(", "),
                  title: trackData.attributes.title,
                }
              }
              // Handle v1 API response structure (fallback)
              else if (data.artists) {
                return {
                  success: true,
                  artists: data.artists.map(a => a.name).join(", "),
                  title: data.title,
                }
              }
            }
            else if (this.music.type === "album") {
              // Handle v2 API response structure
              if (data.data && data.data.attributes) {
                const albumData = data.data
                let artists = []
                if (data.included) {
                  artists = data.included.filter(item => item.type === 'artists')
                }
                if (artists.length === 0 && albumData.relationships?.artists?.data) {
                  artists = albumData.relationships.artists.data
                }
                
                return {
                  success: true,
                  artists: artists.map(a => a.attributes?.name || a.name || "Unknown Artist").join(", "),
                  title: albumData.attributes.title,
                }
              }
              // Handle v1 API response structure (fallback)
              else if (data.artists) {
                return {
                  success: true,
                  artists: data.artists.map(a => a.name).join(", "),
                  title: data.title,
                }
              }
            }
            else if (this.music.type === "artist") {
              // Handle v2 API response structure
              if (data.data && data.data.attributes) {
                return {
                  success: true,
                  artists: data.data.attributes.name,
                  title: "",
                }
              }
              // Handle v1 API response structure (fallback)
              else if (data.name) {
                return {
                  success: true,
                  artists: data.name,
                  title: "",
                }
              }
            }
          }
        } else {
          console.log("Tidal OAuth2 also failed")
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
      const tidalApi = await this.getTidalApi()
      if (!tidalApi) {
        return null
      }

      // Tidal search seems to work a lot better when removing titles with the word 'feat'
      const withoutFeat = query.replace(/(?<=\b)feat(?=\b)/gi, "")
      const res = await tidalApi.makeRequest(`https://api.tidal.com/v1/search/${this.music.type}s?query=${encodeURIComponent(withoutFeat)}&limit=1&countryCode=GB`)
      const data = await res.json()

      if (res.ok && data.totalNumberOfItems) {
        const track = data.items[0]
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
      const res = await fetch(`https://itunes.apple.com/lookup?id=${this.music.id}`)
      const data = await res.json()

      if (res.ok && data.resultCount > 0) {
        const item = data.results[0]

        if (item.wrapperType === "track") {
          return {
            artists: item.artistName,
            title: item.trackName,
          }
        }
        else if (item.wrapperType === "collection") {
          return {
            artists: item.artistName,
            title: item.collectionName,
          }
        }
        else if (item.wrapperType === "artist") {
          return {
            artists: item.artistName,
            title: "",
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
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=GB&entity=${this.music.type === "track" ? "song" : this.music.type === "album" ? "album" : "musicArtist"}&media=music&limit=1`)
      const data = await res.json()

      if (res.ok && !!data.resultCount > 0) {
        const item = data.results[0]
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
      clientId: process.env.SPOTIFY_CLIENTID,
      clientSecret: process.env.SPOTIFY_CLIENTSECRET,
    })

    try {
      const res = await spotifyApi.clientCredentialsGrant()
      spotifyApi.setAccessToken(res.body.access_token)
    }
    catch (err) {
      console.log(err)
      return null
    }

    return spotifyApi
  }

  async getTidalApi () {
    return await (this.tidalApi || (this.tidalApi = this.tidalApiFactory()))
  }

  async tidalApiFactory () {
    try {
      // Tidal uses OAuth2 client credentials flow with Basic Auth
      const credentials = Buffer.from(`${process.env.TIDAL_CLIENTID}:${process.env.TIDAL_CLIENTSECRET}`).toString('base64')
      
      const authResponse = await fetch("https://auth.tidal.com/v1/oauth2/token", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials&scope=search.read",
      })

      if (!authResponse.ok) {
        console.log("Tidal authentication failed")
        return null
      }

      const authData = await authResponse.json()
      
      const tidalApi = {
        accessToken: authData.access_token,
        tokenType: authData.token_type,
        expiresIn: authData.expires_in,
        tokenExpiry: Date.now() + (authData.expires_in * 1000),
        
        // Helper method to check if token is expired
        isTokenExpired() {
          return Date.now() >= this.tokenExpiry
        },
        
        // Helper method to refresh token if needed
        async refreshTokenIfNeeded() {
          if (this.isTokenExpired()) {
            console.log("Tidal token expired, refreshing...")
            const refreshedApi = await this.tidalApiFactory()
            if (refreshedApi) {
              this.accessToken = refreshedApi.accessToken
              this.tokenExpiry = refreshedApi.tokenExpiry
            }
          }
        },
        
        
        // Helper method to make authenticated requests
        async makeRequest(url, options = {}) {
          await this.refreshTokenIfNeeded()
          return fetch(url, {
            ...options,
            headers: {
              "Authorization": `Bearer ${this.accessToken}`,
              "accept": "application/vnd.api+json",
              ...options.headers,
            },
          })
        }
      }

      console.log("Tidal service ready")
      return tidalApi
    }
    catch (err) {
      console.log("Tidal API factory failed")
      console.log(err)
      return null
    }
  }
}