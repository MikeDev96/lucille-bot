import Commando from "discord.js-commando"
import { getRequestee, getVoiceChannel, shuffle, paginatedEmbed, splitMessage } from "../../helpers.js"
import Track from "../../classes/Track.js"
import { MessageAttachment, escapeMarkdown } from "discord.js"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"
import { existsSync } from "fs"
import LucilleClient from "../../classes/LucilleClient.js"
const { Command } = Commando

export default class extends Command {
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
    if (["list", "ls"].includes(args.arg1.toLowerCase())) {
      const listId = await this.findUserId(msg, args.arg2)
      const nickname = await this.findUsername(msg, args.arg2)
      const bangas = LucilleClient.Instance.db.listBangas(listId)
      if (!bangas.length) {
        msg.channel.send("This person is boring and has no bangers")
        return
      }

      paginatedEmbed(msg, {
        color: 0x0099ff,
        title: "Lucille 🎵",
        author: {
          name: msg.member.displayName,
          icon_url: msg.author.displayAvatarURL(),
        },
        footer: {
          text: process.env.DISCORD_FOOTER,
        },
      }, this.list(bangas, nickname))
      return
    }

    if (["play", "p"].includes(args.arg1.toLowerCase())) {
      let playArr = []
      const playId = await this.findUserId(msg, args.arg2)
      if (!playId) return
      playArr = LucilleClient.Instance.db.listBangas(playId)
      const trackedMusic = playArr.map(dbSong => new Track()
        .setPlatform("search")
        .setQuery(dbSong.song)
        .setYouTubeTitle(dbSong.song))
      shuffle(trackedMusic)
      music.add(trackedMusic, getRequestee(msg), getVoiceChannel(msg), false, msg.channel)
      return
    }

    if (["remove", "rm"].includes(args.arg1.toLowerCase())) {
      let currTrack = false
      const queueItem = music.state.queue[0]

      if (queueItem) currTrack = queueItem.youTubeTitle
      if (queueItem && queueItem.radioMetadata && queueItem.radioMetadata.title && queueItem.radioMetadata.artist) currTrack = queueItem.radioMetadata.artist + " - " + queueItem.radioMetadata.title
      if (queueItem && queueItem.platform === "soundcloud") currTrack = queueItem.title

      const grug = LucilleClient.Instance.db.findBanga(args.arg2 !== "" ? args.arg2 : currTrack, msg.author.id)

      if (!grug) {
        msg.channel.send("Nice try")
        return
      }
      const replyMsg = await msg.reply(`Are you sure you want to remove ${grug}`)
      replyMsg.react("☑️").then(() => replyMsg.react("❌"))
      const filter = (reaction, user) => ["☑️", "❌"].includes(reaction.emoji.name) && user.id === msg.author.id
      const collected = await replyMsg.awaitReactions({ filter, time: 15000, max: 1 })
      replyMsg.delete()

      const firstKey = collected.firstKey()
      if (firstKey) {
        msg.react(firstKey)

        if (firstKey === "☑️") {
          if (args.arg2 === "") {
            if (currTrack) {
              LucilleClient.Instance.db.removeBanga(currTrack, msg.author.id)
            }
            else {
              msg.react("🖕")
            }
          }
          else {
            LucilleClient.Instance.db.removeBanga(args.arg2, msg.author.id)
          }
        }
      }
      return
    }

    if (args.arg1.toLowerCase() === "export") {
      return this.exportBangas(msg, args)
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

    const checkEx = LucilleClient.Instance.db.checkForBanga(currTrack)

    if (args.arg1 === "?") {
      msg.channel.send(`${this.findUsers(checkEx).join(", ")} thinks its a banger`)
      return
    }

    const bangerStampPath = `./assets/images/bangerstamps/${msg.author.id}.png`
    const bangerStampExists = existsSync(bangerStampPath)
    const bangerStampImg = new MessageAttachment(bangerStampPath)

    if (checkEx.length) {
      if (this.checkForUser(checkEx, msg)) {
        msg.channel.send("You've already said this was a banger")
      }
      else {
        LucilleClient.Instance.db.updateBangaUsers(currTrack, msg.author.id)
        msg.react("👍")
        if (bangerStampExists) {
          msg.channel.send(bangerStampImg)
        }
      }
    }
    else {
      LucilleClient.Instance.db.writeBanga(queueItem.spotifyUri, currTrack, msg.author.id)
      msg.react("👍")
      if (bangerStampExists) {
        msg.channel.send(bangerStampImg)
      }
    }
  }

  checkForUser (user, mess) {
    return !!user[0].users.find(e => e === mess.author.id)
  }

  findUsers (banger) {
    const usrArr = []
    let username
    if (banger[0]) {
      for (const e of banger[0].users) {
        username = this.client.users.cache.get(e)
        if (username) {
          usrArr.push(username.username)
        }
      }
    }
    else {
      usrArr.push("No one")
    }
    return usrArr
  }

  async findUsername (msg, user) {
    let username
    if (user.length > 0) {
      await msg.guild.members.fetch().then(members => members.map(users => {
        if (users.user.username.toLowerCase().includes(user.toLowerCase())) {
          username = users.user.username
        }
        return username
      }))
    }
    else {
      await msg.guild.members.fetch().then(members => members.map(users => {
        if (users.user.id === msg.author.id) {
          username = users.user.username
        }
        return username
      }))
    }
    if (!username) {
      return null
    }
    return username
  }

  async findUserId (msg, user) {
    let userID
    if (user.length > 0) {
      await msg.guild.members.fetch().then(members => members.map(users => {
        if (users.user.username.toLowerCase().includes(user.toLowerCase())) {
          userID = users.user.id
        }
        return userID
      }))
    }
    else {
      userID = msg.author.id
    }

    if (!userID) {
      msg.channel.send("No ID found")
      return null
    }
    return userID
  }

  list (songs, nickname) {
    return splitMessage(songs.map(s => escapeMarkdown(`- ${s.song}`)), { maxLength: 1024 }).map((str, idx) => ({
      name: `${nickname}'s Bangers ${idx + 1}`,
      value: str,
    }))
  }

  exportBangas (msg) {
    const client = new DynamoDBClient({
      credentials: {
        accessKeyId: process.env.AWS_ACCESSKEYID,
        secretAccessKey: process.env.AWS_SECRETACCESSKEY,
      },
      region: process.env.AWS_REGION,
    })

    const ddbDocClient = DynamoDBDocumentClient.from(client)

    const UserId = msg.author.id

    if (!UserId) {
      return
    }

    const songsArr = LucilleClient.Instance.db.listBangas(UserId).reduce((acc, song) => {
      if (song.spotifyUri) {
        if (song.spotifyUri.length) {
          acc.push(song.spotifyUri)
        }
      }
      return acc
    }, [])

    if (songsArr.length === 0) {
      msg.reply("You have 0 bangas with spotify links")
    }
    else {
      msg.reply("Sent you a DM with information")
      msg.author.send({
        embeds: [
          {
            color: 0x0099ff,
            title: "Lucille Spotify Exporter",
            fields: [
              {
                name: "Spotify Exporter Link",
                value: `Visit [this link](${process.env.EXPORT_URL}/${UserId}) and authorise with Spotify`,
              },
            ],
            footer: {
              text: process.env.DISCORD_FOOTER,
              icon_url: process.env.DISCORD_AUTHORAVATARURL,
            },
          },
        ],
      })

      const params = {
        TableName: process.env.EXPORT_TABLENAME,
        Item: {
          discordID: UserId,
          SongsURIs: songsArr,
        },
      }

      ddbDocClient.send(new PutCommand(params))
        .then(() => console.log("Succesfully wrote to DynamoDB"))
        .catch(err => console.log("Error", err))
    }
  }
}