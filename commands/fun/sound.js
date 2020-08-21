const { Command } = require("discord.js-commando")
const axios = require("axios")
const fs = require("fs")
const { getAudioDurationInSeconds } = require("get-audio-duration")
const config = require("../../config.json")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "sound",
      aliases: [],
      group: "fun",
      memberName: "sound",
      description: "Upload a custom connect/disconnect sound",
      args: [
        {
          key: "arg1",
          prompt: "Arg1",
          type: "string",
        },
        {
          key: "arg2",
          prompt: "Arg2",
          type: "string",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    if (args.arg1 === "upload") {
      const file = msg.attachments.first()
      if (!file) {
        msg.reply("You must attach an audio file")
        return
      }

      const res = await axios({
        method: "GET",
        url: file.url,
        responseType: "stream",
      })

      if (res.headers["content-type"] !== "audio/mpeg") {
        msg.reply("File must be an MPEG audio file")
        return
      }

      if (parseInt(res.headers["content-length"]) > 1048576) {
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
          res.data.pipe(stream)

          const duration = await getAudioDurationInSeconds(filename)
          if (duration > 3) {
            msg.reply("File must be no longer than 3 seconds")
            fs.unlink()
          }

          const embed = await this.getFilesEmbed(msg, `./assets/sounds/${key}`, key, file.name)
          msg.reply(embed)
        })
      }
    }
    else if (args.arg1 === "list") {
      const key = typeMap[args.arg2.toLowerCase()]
      if (key) {
        const embed = await this.getFilesEmbed(msg, `./assets/sounds/${key}`, key)
        msg.reply(embed)
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
            embed: {
              color: 0x0099ff,
              title: "Lucille :musical_note:",
              author: {
                name: msg.member.displayName,
                icon_url: msg.author.displayAvatarURL(),
              },
              fields: [
                {
                  name: `${type.slice(0, 1).toUpperCase()}${type.slice(1)} Files`,
                  value: files.map(f => f === highlightFile ? `**${f}**` : f).join("\n"),
                },
              ],
              footer: {
                text: "Created with ♥ by Migul, Powered by Keef Web Services",
                icon_url: config.discord.authorAvatarUrl,
              },
            },
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