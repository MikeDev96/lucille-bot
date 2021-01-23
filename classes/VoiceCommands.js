const { debounce } = require("lodash")
const { createStream } = require("./DiscordJSHelpers")
const HotwordDetector = require("./HotwordDetector")
const SpeechToText = require("./SpeechToText")
const VoiceStateAdapter = require("./VoiceStateAdapter")
const { PassThrough } = require("stream")
const { proxyCommand } = require("./DiscordJSHelpers")
const { GuildMember } = require("discord.js")

class VoiceCommands {
  constructor (client) {
    this.client = client
    this.streams = {}
    this.initialise()
  }

  initialise () {
    const vsa = new VoiceStateAdapter(this.client)
    vsa.on("join", this.handleJoin.bind(this))
    vsa.on("leave", this.handleLeave.bind(this))
    // Moving channel doesn't mess up the voice streams, but it might benefit performance to destroy the stream if a user isn't in the same voice channel as the bot?
    // vsa.on("move", props => console.log(props))
  }

  handleJoin ({ voiceState }) {
    const isBot = voiceState.id === this.client.user.id
    const voiceCon = this.client.voice.connections.find(voiceCon => voiceCon.channel.guild.id === voiceState.guild.id)
    if (!voiceCon) {
      return
    }

    if (isBot) {
      // Bot joined the voice channel
      voiceState.channel.members.each(member => {
        // Open a hotword stream
        if (!member.user.bot) {
          const textChannel = this.getTextChannel(member)
          if (textChannel) {
            this.streams[member.user.id] = this.createHotwordStream(voiceCon, member, textChannel)
            // console.log(`Created a hotword stream for ${member.displayName}`)
          }
        }
      })

      voiceState.connection.on("disconnect", this.destroyAllStreams.bind(this))
    }
    else {
      // A user did
      // Open a hotword stream
      if (!voiceState.member.user.bot) {
        const textChannel = this.getTextChannel(voiceState.member)
        if (textChannel) {
          this.streams[voiceState.member.user.id] = this.createHotwordStream(voiceCon, voiceState.member, textChannel)
          // console.log(`Created a hotword stream for ${voiceState.member.displayName}`)
        }
      }
    }
  }

  handleLeave ({ channel, voiceState }) {
    const isBot = voiceState.id === this.client.user.id
    const voiceCon = this.client.voice.connections.find(voiceCon => voiceCon.channel.guild.id === voiceState.guild.id)
    if (!voiceCon) {
      return
    }

    if (isBot) {
      // Bot joined the voice channel
      voiceState.channel.members.each(member => {
        // Open a hotword stream
        if (!member.user.bot) {
          // console.log(`Destroyed a hotword stream for ${member.displayName}`)
          if (this.streams[member.user.id]) {
            this.streams[member.user.id].destroy()
          }
        }
      })
    }
    else {
      // A user did
      // Open a hotword stream
      if (!voiceState.member.user.bot) {
        if (this.streams[voiceState.member.user.id]) {
          // console.log(`Destroyed a hotword stream for ${voiceState.member.displayName}`)
          this.streams[voiceState.member.user.id].destroy()
        }
      }
    }
  }

  createHotwordStream (voiceConnection, member, textChannel) {
    const stream = createStream.bind(voiceConnection.receiver)(member.user, { mode: "pcm", end: "manual" })
    const passThroughStream = stream.pipe(new PassThrough())

    const hotwordDetector = new HotwordDetector({
      stream: passThroughStream,
      hotwordFile: process.env.PORCUPINE_HOTWORD_FILE,
      sensitivity: 0.65,
    })

    hotwordDetector.on("hotword", listen => {
      const msg = textChannel && textChannel.send(`Hey ${member.user}, I'm listening... 🎙️`)
      const speechToText = new SpeechToText({
        stream: passThroughStream,
        throttle: 1000,
      })

      let hasSpoken = false

      speechToText.on("transcript", async (transcript, isFinal) => {
        hasSpoken = true
        if (msg) {
          msg.then(m => m.edit(`Hey ${member.user}, I'm listening... 🎙️ ${transcript}`))
        }

        if (isFinal) {
          proxyCommand(await msg, member.user, transcript)
        }
      })

      const handleSpeechEnd = () => {
        clearTimeout(timeoutHandle)

        if (!hasSpoken && msg) {
          msg.then(m => m.delete())
        }

        stream.off("data", onSpeechEnd)
        speechToText.stopListening()
      }

      const onSpeechEnd = debounce(handleSpeechEnd, 2000)
      onSpeechEnd()

      stream.on("data", onSpeechEnd)

      const timeoutHandle = setTimeout(() => {
        handleSpeechEnd()
      }, 5000)

      speechToText.on("done", () => {
        listen()
      })
    })

    return stream
  }

  getTextChannel (member) {
    if (!(member instanceof GuildMember)) {
      throw Error("Member param must be instance of GuildMember")
    }

    const music = member.guild.music
    if (music) {
      const textChannel = music.getTextChannel()
      if (textChannel) {
        return textChannel
      }
    }

    if (member.guild.systemChannel) {
      return member.guild.systemChannel
    }

    const firstGuildChannel = member.guild.channels.cache.filter(channel => channel.type === "text").first()
    if (firstGuildChannel) {
      return firstGuildChannel
    }

    return null
  }

  destroyAllStreams () {
    Object.keys(this.streams).forEach(key => {
      const stream = this.streams[key]
      if (stream) {
        // console.log(`Destroyed a hotword stream for ${key}`)
        stream.destroy()
      }
    })

    this.streams = {}
  }
}

module.exports = VoiceCommands