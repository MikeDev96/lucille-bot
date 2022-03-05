const { Command } = require("discord.js-commando")
const { paginatedEmbed } = require("../../helpers")
const config = require("../../config.json")
const { Util } = require("discord.js")
const humanizeDuration = require("humanize-duration")

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

    const mainUserId = getUserId(msg, args.arg2.toLowerCase())

    if (msg.client.voiceTracker) {
      if (args.arg1.toLowerCase() === "active") {
        if (mainUserId) {
          msg.reply(findUsernameFromId(mainUserId) + " is active for " + humanizeDuration(msg.client.voiceTracker.getIndividualUser(msg.guild.id, mainUserId, "Active")[0].Active))
        }
        else {
          paginatedEmbed(msg, cusEmbed("Active"), formatDbData(msg.client.voiceTracker.getIndividualUser(msg.guild.id, null, "Active"), "Active"))
        }
      }
      else if (["mute", "selfmute", "muted"].includes(args.arg1.toLowerCase())) {
        if (mainUserId) {
          msg.reply(findUsernameFromId(mainUserId) + " is SelfMute for " + humanizeDuration(msg.client.voiceTracker.getIndividualUser(msg.guild.id, mainUserId, "SelfMute")[0].SelfMute))
        }
        else {
          paginatedEmbed(msg, cusEmbed("SelfMute"), formatDbData(msg.client.voiceTracker.getIndividualUser(msg.guild.id, null, "SelfMute"), "SelfMute"))
        }
      }
      else if (["deaf", "selfdeaf", "deafen"].includes(args.arg1.toLowerCase())) {
        if (mainUserId) {
          msg.reply(findUsernameFromId(mainUserId) + " is SelfDeaf for " + humanizeDuration(msg.client.voiceTracker.getIndividualUser(msg.guild.id, mainUserId, "SelfDeaf")[0].SelfDeaf))
        }
        else {
          paginatedEmbed(msg, cusEmbed("SelfDeaf"), formatDbData(msg.client.voiceTracker.getIndividualUser(msg.guild.id, null, "SelfDeaf"), "SelfDeaf"))
        }
      }
      else if (["afk", "afktime"].includes(args.arg1.toLowerCase())) {
        if (mainUserId) {
          msg.reply(findUsernameFromId(mainUserId) + " is Afk for " + humanizeDuration(msg.client.voiceTracker.getIndividualUser(msg.guild.id, mainUserId, "Afk")[0].Afk))
        }
        else {
          paginatedEmbed(msg, cusEmbed("Afk"), formatDbData(msg.client.voiceTracker.getIndividualUser(msg.guild.id, null, "Afk"), "Afk"))
        }
      }
      else if (["servermute", "severmute"].includes(args.arg1.toLowerCase())) {
        if (mainUserId) {
          msg.reply(findUsernameFromId(mainUserId) + " is ServerMute for " + humanizeDuration(msg.client.voiceTracker.getIndividualUser(msg.guild.id, mainUserId, "ServerMute")[0].ServerMute))
        }
        else {
          paginatedEmbed(msg, cusEmbed("ServerMute"), formatDbData(msg.client.voiceTracker.getIndividualUser(msg.guild.id, null, "ServerMute"), "ServerMute"))
        }
      }
      else if (["serverdeaf", "severdeaf"].includes(args.arg1.toLowerCase())) {
        if (mainUserId) {
          msg.reply(findUsernameFromId(mainUserId) + " is ServerDeaf for " + humanizeDuration(msg.client.voiceTracker.getIndividualUser(msg.guild.id, mainUserId, "ServerDeaf")[0].ServerDeaf))
        }
        else {
          paginatedEmbed(msg, cusEmbed("ServerDeaf"), formatDbData(msg.client.voiceTracker.getIndividualUser(msg.guild.id, null, "ServerDeaf"), "ServerDeaf"))
        }
      }
      else if (["mutemax", "selfmutemax"].includes(args.arg1.toLowerCase())) {
        if (mainUserId) {
          msg.reply(findUsernameFromId(mainUserId) + " is SelfMuteMax for " + humanizeDuration(msg.client.voiceTracker.getIndividualUser(msg.guild.id, mainUserId, "SelfMuteMax")[0].SelfMuteMax))
        }
        else {
          paginatedEmbed(msg, cusEmbed("SelfMuteMax"), formatDbData(msg.client.voiceTracker.getIndividualUser(msg.guild.id, null, "SelfMuteMax"), "SelfMuteMax"))
        }
      }
      else if (["deafmax", "selfdeafmax"].includes(args.arg1.toLowerCase())) {
        if (mainUserId) {
          msg.reply(findUsernameFromId(mainUserId) + " is SelfDeafMax for " + humanizeDuration(msg.client.voiceTracker.getIndividualUser(msg.guild.id, mainUserId, "SelfDeafMax")[0].SelfDeafMax))
        }
        else {
          paginatedEmbed(msg, cusEmbed("SelfDeafMax"), formatDbData(msg.client.voiceTracker.getIndividualUser(msg.guild.id, null, "SelfDeafMax"), "SelfDeafMax"))
        }
      }
      else if (["afkmax", "selfafkmax"].includes(args.arg1.toLowerCase())) {
        if (mainUserId) {
          msg.reply(findUsernameFromId(mainUserId) + " is AfkMax for " + humanizeDuration(msg.client.voiceTracker.getIndividualUser(msg.guild.id, mainUserId, "AfkMax")[0].AfkMax))
        }
        else {
          paginatedEmbed(msg, cusEmbed("AfkMax"), formatDbData(msg.client.voiceTracker.getIndividualUser(msg.guild.id, null, "AfkMax"), "AfkMax"))
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

    function findUsernameFromId (userId) {
      if (msg.guild.members.cache.has(userId)) {
        const greg = msg.guild.members.cache.get(userId)
        if (greg.nickname) {
          return greg.nickname
        }
        else {
          return greg.user.username
        }
      }
      else {
        return "Unknown"
      }
    }

    function formatDbData (data, statType) {
      data.sort((a, b) => b[statType] - a[statType])
      return Util.splitMessage(data.map((obj, index) => (index + 1) + ". " + Util.escapeMarkdown(findUsernameFromId(obj.UserId) + " has been  " + statType + " for " + humanizeDuration(round1000(obj[statType])))), { maxLength: 1024 }).map((str, idx) => ({
        name: `${statType} Lb ${idx + 1}`,
        value: str,
      }))
    }

    function round1000 (num) {
      if (num < 1000) {
        return Math.ceil(num / 100) * 100
      }
      return Math.round(num / 1000) * 1000
    }

    function cusEmbed (statType) {
      return {
        embed: {
          color: 0x0099ff,
          title: `${statType} Lb`,
          author: {
            name: msg.member.displayName,
            icon_url: msg.author.displayAvatarURL(),
          },
          footer: {
            text: config.discord.footer,
          },
        },
      }
    }
  }
}