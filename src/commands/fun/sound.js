import fetch from "node-fetch"
import fs from "fs"
import { getAudioDurationInSeconds } from "get-audio-duration"
import { getRequestee, getVoiceChannel, splitMessage } from "../../helpers.js"
import Track from "../../classes/Track.js"
import { PLATFORM_OTHER } from "../../classes/TrackExtractor.js"
import { AttachmentBuilder, escapeMarkdown } from "discord.js"
import AdmZip from "adm-zip"
import Command from "../../classes/Command.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
      name: "sound",
      aliases: [],
      group: "fun",
      memberName: "sound",
      description: "Upload a custom connect/disconnect sound",
      args: [
        {
          key: "arg1",
          prompt: "upload [u] | list [l] | play [p]",
          type: "string",
        },
        {
          key: "arg2",
          prompt: "connect [c] | disconnect [d]",
          type: "string",
        },
        {
          key: "arg3",
          prompt: "sound name",
          type: "string",
          default: "",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    const arg1 = args.arg1.toLowerCase()
    if (["upload", "u"].includes(arg1)) {
      const file = msg.attachments.first()
      if (!file) {
        msg.reply("You must attach an audio file")
        return
      }

      const res = await fetch(file.url)

      if (res.headers.get("content-type") !== "audio/mpeg") {
        msg.reply("File must be an MPEG audio file")
        return
      }

      if (parseInt(res.headers.get("content-length")) > 1024 * 1024) {
        msg.reply("File must be less than 1MB")
        return
      }

      const key = typeMap[args.arg2.toLowerCase()]
      if (key) {
        const filename = `./assets/sounds/${key}/${file.name}`

        fs.stat(filename, async (err, stats) => {
          if (!err && stats.isFile()) {
            msg.reply("File already exists with that name")
            return
          }

          const stream = fs.createWriteStream(filename)

          stream.on("finish", async () => {
            const duration = await getAudioDurationInSeconds(filename)
            if (duration > 7) {
              msg.reply("File must be no longer than 7 seconds")
              fs.unlink(filename, err => {
                if (err) {
                  console.log(err)
                }
              })

              return
            }

            msg.react("⬆️")
          })

          res.body.pipe(stream)
        })
      }
    }
    else if (["list", "l"].includes(arg1)) {
      const key = typeMap[args.arg2.toLowerCase()]
      if (key) {
        const embed = await this.getFilesEmbed(msg, `./assets/sounds/${key}`, key)
        msg.reply(embed)
      }
    }
    else if (["play", "p"].includes(arg1)) {
      const key = typeMap[args.arg2.toLowerCase()]
      if (key) {
        fs.readdir(`./assets/sounds/${key}`, (err, files) => {
          if (!err) {
            if (args.arg3) {
              const file = files.find(f => f.toLowerCase().includes(args.arg3.toLowerCase()))
              if (file) {
                const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
                const tracks = [
                  new Track("", file, "")
                    .setPlatform(PLATFORM_OTHER)
                    .setLink(`./assets/sounds/${key}/${file}`)
                    .setDuration(0),
                ]

                music.add(tracks, getRequestee(msg), getVoiceChannel(msg), false, msg.channel)
              }
              else {
                msg.reply(`Couldn't find a ${key} sound for \`${args.arg3}\``)
              }
            }
            else {
              const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
              const tracks = files.map(f =>
                new Track("", f, "")
                  .setPlatform(PLATFORM_OTHER)
                  .setLink(`./assets/sounds/${key}/${f}`)
                  .setDuration(0),
              )

              music.add(tracks, getRequestee(msg), getVoiceChannel(msg), false, msg.channel)
            }
          }
          else {
            console.log(err)
          }
        })
      }
    }
    else if (["download", "dl"].includes(arg1)) {
      const key = typeMap[args.arg2.toLowerCase()]
      if (key) {
        const waitReact = msg.react("⏳")
        const path = `./assets/sounds/${key}`
        fs.readdir(path, (err, files) => {
          if (!err) {
            if (args.arg3) {
              const file = files.find(f => f.toLowerCase().includes(args.arg3.toLowerCase()))
              if (file) {
                const attach = new AttachmentBuilder(`${path}/${file}`, { name: file })
                msg.reply({ files: [attach] }).then(() => {
                  msg.react("⬇️")
                  waitReact.then(r => r.remove())
                })
              }
              else {
                msg.reply(`Couldn't find a ${key} sound for \`${args.arg3}\``)
                waitReact.then(r => r.remove())
              }
            }
            else {
              const zip = new AdmZip()
              zip.addLocalFolder(path)
              zip.toBuffer(buffer => {
                const attach = new AttachmentBuilder(buffer, { name: `${files.length} ${key} sounds.zip` })
                msg.reply({ files: [attach] }).then(() => {
                  msg.react("⬇️")
                  waitReact.then(r => r.remove())
                })
              }, () => {
                msg.reply(`Failed to zip up the ${key} sounds folder`)
                waitReact.then(r => r.remove())
              })
            }
          }
          else {
            waitReact.then(r => r.remove())
            console.log(err)
          }
        })
      }
    }
  }

  getFilesEmbed (msg, path, type, highlightFile) {
    return new Promise((resolve, reject) => {
      fs.readdir(path, (err, files) => {
        if (err) {
          reject(err)
        }
        else {
          return resolve({
            embeds: [
              {
                color: 0x0099ff,
                title: "Lucille 🎵",
                author: {
                  name: msg.member.displayName,
                  icon_url: msg.author.displayAvatarURL(),
                },
                fields: splitMessage(files.map(f => f === highlightFile ? `> **${escapeMarkdown(f)}**` : escapeMarkdown(f)), { maxLength: 1024 }).map(str => ({
                  name: "Files",
                  value: str,
                })),
                footer: {
                  text: process.env.DISCORD_FOOTER,
                  icon_url: process.env.DISCORD_AUTHORAVATARURL,
                },
              },
            ],
          })
        }
      })
    })
  }
}

const typeMap = {
  connect: "connect",
  c: "connect",
  disconnect: "disconnect",
  d: "disconnect",
}