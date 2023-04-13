import Commando from "discord.js-commando"
import TicTacToe from "../../classes/TicTacToe.js"
const { Command } = Commando

export default class extends Command {
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
    if (args.player.toLowerCase() === "lb") {
      const embed = this.getLeaderBoard(msg)
      msg.reply(embed)
    }
    else {
      try {
        // does player exist in game
        const member = this.getMemberFromArg(msg.guild, args.player)

        if (!member) {
          msg.reply("User not found, please try mentioning them or use their username.")
          return
        }

        const playerOneId = msg.author.id
        const playerTwoId = member.user.id

        if (playerOneId === playerTwoId) {
          msg.react("👎")
          return
        }

        if (!(await this.sendChallenge(msg, playerTwoId))) {
          msg.react("👎")
          return
        }

        msg.react("👍")

        const gmMessage = await msg.reply("Setup...")
        const tic = new TicTacToe(gmMessage, playerOneId, playerTwoId)
        await tic.runLoop()
      }
      catch (err) {
        console.error("tictactoe: " + err)
      }
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

      if (queryMsg.author.id === playerTwoId) {
        return true
      }

      const reactions = ["✅", "❌"]
      for (let i = 0; i < reactions.length; i++) {
        await queryMsg.react(reactions[i])
      }

      const collected = await queryMsg.awaitReactions({ filter: (reaction, user) => reactions.includes(reaction.emoji.name) && user.id === playerTwoId, time: 60000, max: 1 })
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

  // dupe of the connect 4 win, could do with another class of just MISC shit i suppose
  getLeaderBoard (msg) {
    const stats = msg.client.db.getGameWins("TicTacToe", msg.guild.id)

    const winloss = stats.reduce((acc, cur) => {
      if (!acc.has(cur.PlayerId)) {
        // no point if the member has left, yes we could look elsewhere but why display someone who has left
        const member = msg.guild.members.cache.find(user => user.id === cur.PlayerId)
        if (!member) {
          return acc
        }

        acc.set(cur.PlayerId, { win: 0, loss: 0, draw: 0, name: member.displayName })
      }

      if (cur.PlayerId === cur.Winner) {
        acc.get(cur.PlayerId).win++
      }
      else if (cur.Winner !== "-" && cur.PlayerId !== cur.Winner) {
        acc.get(cur.PlayerId).loss++
      }
      else {
        acc.get(cur.PlayerId).draw++
      }

      return acc
    }, new Map())

    const fields = Array.from(winloss.values())
      .filter((usr) => usr !== null)
      .sort((usr1, usr2) => Math.round((usr2.win / usr2.loss) * 100) - Math.round((usr1.win / usr1.loss) * 100))
      .map((usr) => ({
        name: usr.name,
        value: `Win: \`${usr.win}\` Loss: \`${usr.loss}\` W/L: \`${(usr.win / (!usr.loss ? 1 : usr.loss)).toFixed(2)}\` Win %: \`${!usr.loss ? 100 : Math.round((usr.win / (usr.win + usr.loss)) * 100)}%\``,
      }))

    return {
      embed: {
        title: `TicTacToe Leaderboard`,
        description: "TicTacToe leaderboard",
        color: 4187927,
        author: {
          name: "Lucille",
          icon_url: msg.client.user.displayAvatarURL(),
        },

        fields: [...fields],
        footer: {
          text: process.env.DISCORD_FOOTER,
        },
      },
    }
  }
}