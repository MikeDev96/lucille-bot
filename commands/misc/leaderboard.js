const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "leaderboard",
      aliases: ["lb"],
      group: "misc",
      memberName: "leaderboard",
      description: "Shows a leaderboard for voice statistics",
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
    msg.react("🏆")
    if (args.arg1) {
      args.arg1 = databaseFriendly(args.arg1)
    }

    const mainUserId = getUserId(msg, args.arg2.toLowerCase())

    console.log(args)

    if (msg.client.voiceTracker) {
      if (args.arg1.toLowerCase() === "active") {
        if (args.arg2) {
          msg.reply(args.arg2 + " is active for " + msg.client.voiceTracker.getIndividualUser(msg.guild.id, mainUserId, args.arg1))
        }
      }
      else {
        const leaderboard = await msg.client.voiceTracker.getLeaderboard(msg.guild.id, { username: msg.author.displayName, avatarURL: msg.author.displayAvatarURL() }, msg.guild.members)
        if (leaderboard) {
          msg.reply({ embed: leaderboard })
        }
      }
    }

    function getUserId (msg, user) {
      let userId
      msg.guild.members.cache.forEach(mem => {
        if (mem.nickname) {
          if (mem.user.username.toLowerCase() === user || mem.nickname.toLowerCase() === user) {
            userId = mem.user.id
          }
        }
        else if (mem.user.username.toLowerCase() === user) {
          userId = mem.user.id
        }
      })
      return userId
    }

    function databaseFriendly (data) {
      data = data.toLowerCase()
      data = data.split("")
      data[0] = data[0].toUpperCase()
      data = data.join("")
      return data
    }
  }
}