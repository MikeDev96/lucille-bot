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
      const leaderboard = msg.client.voiceTracker.getLeaderboard(msg.guild.id, { username: msg.author.displayName, avatarURL: msg.author.displayAvatarURL() })
      if (leaderboard) {
        msg.reply({ embed: leaderboard })
      }
    }
  }
}