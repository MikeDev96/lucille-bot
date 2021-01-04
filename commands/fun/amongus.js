const { MessageAttachment } = require("discord.js")
const { Command } = require("discord.js-commando")
const fs = require("fs")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "amongus",
      aliases: ["a"],
      group: "fun",
      memberName: "amongus",
      description: "Among Us - hats, pets & skins",
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

  run (msg, args) {
    switch (args.arg1) {
    case "image":
    case "i":
    case "show": {
      const img = this.getImage(args.arg2)

      if (!img) {
        msg.reply("No such image exists.")
        return
      }

      msg.channel.send(img)
      break
    }
    case "config":
    case "c": {
      const params = args.arg2.split(" ")
      const templateArgs = {
        hat: { id: 10, min: 0, max: 93, value: -1 },
        pet: { id: 16, min: 0, max: 10, value: -1 },
        skin: { id: 15, min: 0, max: 15, value: -1 },
      }

      // loop through user params and find any of the templates
      for (let i = 0; i < params.length; i++) {
        const key = params[i]
        if (Object.keys(templateArgs).includes(key.toLowerCase())) {
          const id = parseInt(params[i + 1])

          // valid number?
          if (!isNaN(id)) {
            if (templateArgs[key].min <= id && templateArgs[key].max >= id) {
              templateArgs[key].value = id
            }
            else {
              msg.reply(`Invalid value: ${key} must have a value between ${templateArgs[key].min}-${templateArgs[key].max}`)
            }
          }
          else {
            msg.reply(`Invalid value: ${key} must have a numeric value between ${templateArgs[key].min}-${templateArgs[key].max}`)
          }

          i++
        }
      }

      // Make sure we have a value
      if (templateArgs.hat.value > -1 || templateArgs.pet.value > -1 || templateArgs.skin.value > -1) {
        const cmd = this.buildCommand(templateArgs)
        const attachment = new MessageAttachment(Buffer.from(cmd, "utf8"), "amongus.bat")

        msg.channel.send(attachment)
      }
      break
    }
    default:
      break
    }
  }

  getImage (fileName) {
    fileName = fileName.replace(/[^a-z0-9]/gi, "").toLowerCase() // stop some pleb doing ../../emojis/apple
    const filePath = `./assets/images/amongus/${fileName}.png`
    if (!fs.existsSync(filePath)) {
      return undefined
    }
    return new MessageAttachment(filePath)
  }
  /* eslint-disable */
  buildCommand (obj) {
    const template = [
      "$filePath = $env:USERPROFILE + \\\"/appdata/locallow/Innersloth/Among Us/playerPrefs\\\";",
      "$fileContents = Get-Content $filePath -Delimiter:\\\",\\\";",
      Object.values(obj).filter(x => x.value > -1).map(x => `$fileContents[${x.id}] = \\\"${x.value},\\\";`).join(""),
      "Set-Content $filePath  -Value:$fileContents -NoNewLine;",
    ].join("")

    return `powershell -command ${template}`
  }
}