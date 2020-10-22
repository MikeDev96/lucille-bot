const { MessageAttachment } = require("discord.js")
const { Command } = require("discord.js-commando")
const TicTacToe = require("../../classes/TicTacToe")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "tictactoe",
      aliases: ["tic", "tac", "toe", "ttt"],
      group: "fun",
      memberName: "tictactoe",
      description: "TicTacToe",
      args: [
        {
          key: "player",
          prompt: "The player you want to challenge",
          type: "string",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    try {
      // does player exist in game
      const member = this.getMemberFromArg(msg.guild, args.player)

      if (!member) {
        msg.reply("User not found, please try mentioning them or use their username.")
        return
      }

      const playerOneId = msg.author.id
      const playerTwoId = member.user.id

      if (!await this.sendChallenge(msg, playerTwoId)) {
        msg.react("👎")
        return
      }

      msg.react("👍")

      const gmMessage = await msg.reply("")
      const tic = new TicTacToe(gmMessage, playerOneId, playerTwoId)
      await tic.runLoop()
    }
    catch (err) {
      console.error("tictactoe: " + err)
    }
  }

  getMemberFromArg (guild, plrName) {
    return guild.members.cache.find(x => `<@!${x.id}>` === plrName.toLowerCase() ||
      x.id === plrName.toLowerCase() ||
      x.user.username.toLowerCase() === plrName.toLowerCase())
  }

  async sendChallenge (msg, playerTwoId) {
    try {
      const queryMsg = await msg.reply(`You have challenged <@!${playerTwoId}> to a game of tic tac toe. <@!${playerTwoId}>, Would you like to accept?`)
      const reactions = ["✅", "❌"]
      reactions.forEach(async (react) => await queryMsg.react(react))
      const collected = await queryMsg.awaitReactions((reaction, user) => reactions.includes(reaction.emoji.name) && user.id === playerTwoId, { time: 10000, max: 1 })
      const key = collected.firstKey()

      queryMsg.delete()

      if (key && key === reactions[0]) {
        return true
      }
    }
    catch (err) {
      console.error(err)
    }

    return false
  }
}