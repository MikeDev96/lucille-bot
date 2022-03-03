const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "leaderboard",
      aliases: ["lb"],
      group: "misc",
      memberName: "leaderboard",
      description: "Shows a leaderboard for voice statistics",
      args: [],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    msg.react("🏆")

    if (msg.client.voiceTracker) {
      const leaderboard = await msg.client.voiceTracker.getLeaderboard(msg.guild.id, { username: msg.member.displayName, avatarURL: msg.author.displayAvatarURL() }, msg.guild.members)
      if (leaderboard) {
        msg.reply({ embed: leaderboard })
      }
    }
  }
}