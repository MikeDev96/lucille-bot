import { getVoiceChannel, shuffle, paginatedEmbed, splitMessage, getConfig, escapeCSV } from "../../helpers.js"
import Track from "../../models/Track.js"
import { AttachmentBuilder, escapeMarkdown } from "discord.js"
import { existsSync } from "fs"
import LucilleClient from "../../classes/LucilleClient.js"
import Command from "../../models/Command.js"
import Requestee from "../../models/Requestee.js"

export default class extends Command {
  constructor () {
    super({
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
    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
    if (["list", "ls"].includes(args.arg1.toLowerCase())) {
      const listId = await this.findUserId(msg, args.arg2)
      const nickname = await this.findUsername(msg, args.arg2)
      const bangas = LucilleClient.Instance.db.banga.listBangas(listId)
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
      playArr = LucilleClient.Instance.db.banga.listBangas(playId)
      const trackedMusic = playArr.map(dbSong => new Track()
        .setPlatform("search")
        .setQuery(dbSong.song)
        .setYouTubeTitle(dbSong.song))
      shuffle(trackedMusic)
      music.add(trackedMusic, Requestee.create(msg), getVoiceChannel(msg), false, msg.channel)
      return
    }

    if (["remove", "rm"].includes(args.arg1.toLowerCase())) {
      let currTrack = false
      const queueItem = music.state.queue[0]

      if (queueItem) currTrack = queueItem.youTubeTitle
      if (queueItem && queueItem.radioMetadata && queueItem.radioMetadata.title && queueItem.radioMetadata.artist) currTrack = queueItem.radioMetadata.artist + " - " + queueItem.radioMetadata.title
      if (queueItem && queueItem.platform === "soundcloud") currTrack = queueItem.title

      const grug = LucilleClient.Instance.db.banga.findBanga(args.arg2 !== "" ? args.arg2 : currTrack, msg.author.id)

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
              LucilleClient.Instance.db.banga.removeBanga(currTrack, msg.author.id)
            }
            else {
              msg.react("🖕")
            }
          }
          else {
            LucilleClient.Instance.db.banga.removeBanga(args.arg2, msg.author.id)
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

    const checkEx = LucilleClient.Instance.db.banga.checkForBanga(currTrack)

    if (args.arg1 === "?") {
      msg.channel.send(`${this.findUsers(msg.client, checkEx).join(", ")} thinks its a banger`)
      return
    }

    const bangerStampPath = getConfig(`assets/images/bangerstamps/${msg.author.id}.png`)
    const bangerStampExists = existsSync(bangerStampPath)
    const bangerStampImg = new AttachmentBuilder(bangerStampPath)

    if (checkEx.length) {
      if (this.checkForUser(checkEx, msg)) {
        msg.channel.send("You've already said this was a banger")
      }
      else {
        LucilleClient.Instance.db.banga.updateBangaUsers(currTrack, msg.author.id)
        msg.react("👍")
        if (bangerStampExists) {
          msg.channel.send({ files: [bangerStampImg] })
        }
      }
    }
    else {
      LucilleClient.Instance.db.banga.writeBanga(queueItem.spotifyUri, currTrack, msg.author.id)
      msg.react("👍")
      if (bangerStampExists) {
        msg.channel.send({ files: [bangerStampImg] })
      }
    }
  }

  checkForUser (user, mess) {
    return !!user[0].users.find(e => e === mess.author.id)
  }

  findUsers (client, banger) {
    const usrArr = []
    let username
    if (banger[0]) {
      for (const e of banger[0].users) {
        username = client.users.cache.get(e)
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
    const UserId = msg.author.id

    if (!UserId) {
      return
    }

    const songsArr = LucilleClient.Instance.db.banga.listBangas(UserId)

    const csv = songsArr.reduce((acc, cur) => {
      acc += `${escapeCSV(cur.song)},${escapeCSV(cur.spotifyUri)}\n`

      return acc
    }, "")

    if (songsArr.length === 0) {
      msg.reply("You have 0 bangas with spotify links")
    }
    else {
      msg.reply("Sent you a DM with information")

      const buffer = Buffer.from(csv, "utf8")
      const attachment = new AttachmentBuilder(buffer, { name: "bangas.csv" })

      msg.author.send({
        content: "Lucille Spotify Exporter - Here are all of your bangas exported!",
        files: [attachment],
      })
    }
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "🎵 Banga Command Help",
          description: "Track your favorite songs and manage your music collection!",
          color: 0x1db954,
          fields: [
            {
              name: "🎶 Add Banger",
              value: `\`${prefix}banga\`\nAdd current playing song to your bangers\n\`${prefix}banger\`\nAlias for banga\n\`${prefix}b\`\nShort alias`,
              inline: true
            },
            {
              name: "📋 List Bangers",
              value: `\`${prefix}banga list\`\nView your banger collection\n\`${prefix}banga list <user>\`\nView someone else's bangers\n\`${prefix}banga ls\`\nAlias for list`,
              inline: true
            },
            {
              name: "▶️ Play Bangers",
              value: `\`${prefix}banga play\`\nPlay your bangers randomly\n\`${prefix}banga play <user>\`\nPlay someone else's bangers\n\`${prefix}banga p\`\nAlias for play`,
              inline: true
            },
            {
              name: "🗑️ Remove Banger",
              value: `\`${prefix}banga remove\`\nRemove current song from bangers\n\`${prefix}banga remove <song>\`\nRemove specific song\n\`${prefix}banga rm\`\nAlias for remove`,
              inline: true
            },
            {
              name: "📤 Export Bangers",
              value: `\`${prefix}banga export\`\nExport your bangers as CSV\nSent to your DMs with Spotify links`,
              inline: true
            },
            {
              name: "❓ Check Bangers",
              value: `\`${prefix}banga ?\`\nSee who thinks current song is a banger`,
              inline: true
            },
            {
              name: "💡 Tips",
              value: "• Bangers are saved per user\n• Export includes Spotify links\n• Use reactions to confirm removals\n• Banger stamps can be customized",
              inline: false
            }
          ],
          footer: {
            text: "Track your musical taste! 🎧",
          },
        },
      ],
    }
  }
}