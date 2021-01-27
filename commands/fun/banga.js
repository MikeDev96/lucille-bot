const { Command } = require("discord.js-commando")
const config = require("../../config.json")
const { getRequestee, getVoiceChannel, shuffle } = require("../../helpers")
const Track = require("../../classes/Track")
const { MessageAttachment, Util } = require("discord.js")
const AWS = require("aws-sdk")

AWS.config.update({
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  region: "eu-west-1",
})

const DynamoDB = new AWS.DynamoDB.DocumentClient()

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "banga",
      aliases: ["banger", "banging", "bangin", "b"],
      group: "fun",
      memberName: "banga",
      description: "Logs user bangers",
      args: [
        {
          key: "arg1",
          prompt: "Arg1",
          type: "string",
          default: "",
        },
        {
          key: "arg2",
          prompt: "Arg2",
          type: "string",
          default: "",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const music = msg.guild.music

    if (args.arg1.toLowerCase() === "list") {
      const listId = this.findUserId(msg, args.arg2)
      if (!listId) return
      let nickname = msg.guild.member(listId).nickname
      if (!nickname) nickname = msg.guild.member(listId).user.username
      const bangas = this.client.bangaTracker.listBangas(listId)
      if (!bangas.length) {
        msg.channel.send("This person is boring and has no bangers")
        return
      }
      const tempArr = this.list(bangas, nickname)
      const embed = {
        embed: {
          color: 0x0099ff,
          title: "Lucille :musical_note:",
          author: {
            name: msg.member.displayName,
            icon_url: msg.author.displayAvatarURL(),
          },
          fields: tempArr,
          footer: {
            text: config.discord.footer,
          },
        },
      }
      msg.reply(embed)
      return
    }

    if (args.arg1.toLowerCase() === "play") {
      let playArr = []
      const playId = this.findUserId(msg, args.arg2)
      if (!playId) return
      playArr = this.client.bangaTracker.listBangas(playId)
      const trackedMusic = playArr.map(dbSong => new Track()
        .setPlatform("search")
        .setQuery(dbSong.song)
        .setYouTubeTitle(dbSong.song))
      shuffle(trackedMusic)
      music.add(trackedMusic, getRequestee(msg), getVoiceChannel(msg), false, msg.channel)
      return
    }

    if (args.arg1.toLowerCase() === "remove") {
      const grug = this.client.bangaTracker.findBanga(args.arg2, msg.author.id)
      if (!grug) {
        msg.channel.send("Nice try")
        return
      }
      const replyMsg = await msg.reply(`Are you sure you want to remove ${grug}`)
      replyMsg.react("☑️").then(() => replyMsg.react("❌"))
      const filter = (reaction, user) => ["☑️", "❌"].includes(reaction.emoji.name) && user.id === msg.author.id
      const collected = await replyMsg.awaitReactions(filter, { time: 15000, max: 1 })
      replyMsg.delete()

      const firstKey = collected.firstKey()
      if (firstKey) {
        msg.react(firstKey)

        if (firstKey === "☑️") {
          this.client.bangaTracker.removeBanga(args.arg2, msg.author.id)
        }
      }
      return
    }

    if (args.arg1.toLowerCase() === "export") {
      const UserId = msg.author.id
      const playId = this.findUserId(msg, args.arg2)

      if (!playId) {
        return
      }

      let SongsArr = this.client.bangaTracker.listBangas(playId)

      SongsArr = SongsArr.map(song => {
        if (song.spotifyUri) {
          if (song.spotifyUri.length) {
            return song.spotifyUri
          }
        }
      })

      SongsArr = SongsArr.filter(Boolean)

      if (SongsArr.length === 0) {
        msg.reply("You have 0 bangas with spotify uris")
      }
      else if (SongsArr.length > 100) {
        msg.reply("You have more than 100 bangas with spotify uris please remove some and then try again")
      }
      else {
        msg.reply("Sent you a dm with information")
        msg.author.send({
          embed: {
            color: 0x0099ff,
            title: "Lucille Spotify Exporter",
            fields: [
              {
                name: "Spotify Exporter Link",
                value: `Visit [this link](${config.export.url}/home/${UserId}) and authorise with Spotify`,
              },
            ],
            footer: {
              text: config.discord.footer,
              icon_url: config.discord.authorAvatarUrl,
            },
          },
        })

        var params = {
          TableName: "Lucille-SpotifyURIs",
          Item: {
            User: UserId,
            SongsURIs: SongsArr,
          },
        }

        DynamoDB.put(params, function (err, data) {
          if (err) {
            console.log("Error", err)
          }
          else {
            console.log("Succesfully wrote to DynamoDB")
          }
        })
      }
      return
    }

    let currTrack = false
    const queueItem = music.state.queue[0]

    if (queueItem) currTrack = queueItem.youTubeTitle
    if (queueItem && queueItem.radioMetadata && queueItem.radioMetadata.title && queueItem.radioMetadata.artist) currTrack = queueItem.radioMetadata.artist + " - " + queueItem.radioMetadata.title
    if (queueItem && queueItem.platform === "soundcloud") currTrack = queueItem.title

    if (!currTrack) {
      msg.channel.send("Hold your horses")
      return
    }

    const checkEx = this.client.bangaTracker.checkForBanga(currTrack)

    if (args.arg1 === "?") {
      msg.channel.send(`${this.findUsers(checkEx).join(", ")} thinks its a banger`)
      return
    }

    const bangerStampImg = new MessageAttachment(`./assets/images/bangerstamps/${msg.author.id}.png`)

    if (checkEx.length) {
      if (this.checkForUser(checkEx, msg)) {
        msg.channel.send("You've already said this was a banger")
      }
      else {
        this.client.bangaTracker.updateUsers(currTrack, msg.author.id)
        msg.react("👍")
        msg.channel.send(bangerStampImg)
      }
    }
    else {
      this.client.bangaTracker.writeBanga(queueItem.spotifyUri, currTrack, msg.author.id)
      msg.react("👍")
      msg.channel.send(bangerStampImg)
    }
  }

  checkForUser (user, mess) {
    let greg = false
    user[0].users.map(e => {
      if (e === mess.author.id) greg = true
    })
    return greg
  }

  findUsers (banger) {
    const usrArr = []
    let username
    if (banger[0]) {
      banger[0].users.map(e => {
        username = this.client.users.cache.get(e)
        if (username) {
          usrArr.push(username.username)
        }
      })
    }
    else {
      usrArr.push("No one")
    }
    return usrArr
  }

  findUserId (msg, user) {
    let userID
    if (user.length > 0) {
      msg.guild.members.cache.map(e => {
        if (e.user.username.toLowerCase().includes(user.toLowerCase())) userID = e.user.id
      })
    }
    else {
      userID = msg.author.id
    }
    if (!userID) {
      msg.channel.send("No user found")
      return null
    }
    return userID
  }

  list (songs, nickname) {
    return Util.splitMessage(songs.map(s => Util.escapeMarkdown(`- ${s.song}`)), { maxLength: 1024 }).map((str, idx) => ({
      name: `${nickname}'s Bangers ${idx + 1}`,
      value: str,
    }))
  }
}