import Command from "../../models/Command.js"
import ConnectFour from "../../classes/ConnectFour.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor () {
    super({
      name: "connect4",
      aliases: ["c4"],
      group: "fun",
      memberName: "connectfour",
      description: "Connect Four",
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
      msg.reply({ embeds: [embed] })
    }
    else {
      try {
        // does player exist in game
        const plrName = args.player
        const guild = msg.guild

        const member = this.getMemberFromArg(guild, plrName)

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

        const turn = Math.ceil(Math.random() * 2) - 1

        const cf = new ConnectFour()
        const boardMsg = await msg.reply(this.getEmbed(msg.guild.members.cache.find(x => x.id === playerOneId), cf.displayBoard(), msg.client, turn === 0))

        const reactions = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣"]
        reactions.forEach(async (react) => await boardMsg.react(react))

        await this.monitorReactions(boardMsg, playerOneId, playerTwoId, turn === 0, cf, reactions)
      }
      catch (err) {
        console.error("connectfour: " + err)
      }
    }
  }

  async monitorReactions (msg, playerOneId, playerTwoId, turn, cf, reactions) {
    let winnerId = "-"

    try {
      do {
        const usersTurn = (!turn ? playerOneId : playerTwoId)
        const isLucille = usersTurn === msg.author.id
        const filter = (reaction, user) => reactions.includes(reaction.emoji.name) && user.id === usersTurn

        const collected = !isLucille ? await msg.awaitReactions({ filter, time: isLucille ? 1000 : 30000, max: 1 }) : undefined
        const key = collected && collected.firstKey()
        let reactIdx = -1
        if (!key) {
          reactIdx = cf.randomFreeSlot()
        }
        else {
          reactIdx = reactions.findIndex(react => react === key)

          if (!isLucille) {
            collected.get(key).users.remove(usersTurn)
          }
        }

        const slot = cf.nextFreeSlot(reactIdx + 1)
        const success = cf.setPiece(slot, turn + 1)
        if (success) {
          if (cf.checkForWin(turn + 1)) {
            winnerId = usersTurn
          }
          else {
            turn ^= true
          }
        }

        // load board
        await msg.edit(this.getEmbed(msg.guild.members.cache.find(x => x.id === (!turn ? playerOneId : playerTwoId)), cf.displayBoard(), msg.client, turn, winnerId))
      } while (winnerId === "-" && cf.possibleMove())

      // cleanup
      await msg.reactions.removeAll()

      // log winner, "-" = draw
      cf.uploadWin(msg.guild.id, playerOneId, playerTwoId, winnerId)
    }
    catch (err) {
      console.error("connectfour: " + err)
    }

    // cleanup
  }

  getEmbed (user, board, client, turn, winnerId = "-") {
    const description = winnerId !== "-"
      ? `${["🟡", "🔴"][!turn ? 0 : 1]} <@!${user.id}> Won!`
      : `${["🟡", "🔴"][!turn ? 0 : 1]} It's <@!${user.id}> turn\r\n30s Per turn`
    return {
      embeds: [
        {
          title: `Connect 4`,
          description,
          color: 4187927,
          author: {
            name: "Connect 4",
            icon_url: client.user.displayAvatarURL(),
          },

          fields: [
            {
              name: "The Game:",
              value: board,
            },
          ],
          footer: {
            text: "",
          },
        },
      ],
    }
  }

  getMemberFromArg (guild, plrName) {
    return guild.members.cache.find(x => `<@!${x.id}>` === plrName.toLowerCase() ||
      x.id === plrName.toLowerCase() ||
      x.user.username.toLowerCase() === plrName.toLowerCase())
  }

  async sendChallenge (msg, playerTwoId) {
    try {
      const queryMsg = await msg.reply(`You have challenged <@!${playerTwoId}> to a game of Connect Four. <@!${playerTwoId}>, Would you like to accept?`)

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

  getLeaderBoard (msg) {
    const stats = LucilleClient.Instance.db.getGameWins("ConnectFour", msg.guild.id)

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
      else if (cur.PlayerId !== "-" && cur.PlayerId !== cur.Winner) {
        acc.get(cur.PlayerId).loss++
      }
      else if (cur.Winner === "-") {
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
      embeds: [
        {
          title: `Connect Four Leaderboard`,
          description: "Connect Four leaderboard",
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
      ],
    }
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "🔴🟡 Connect Four Command Help",
          description: "Play Connect Four with friends and track your wins!",
          color: 0xff6b6b,
          fields: [
            {
              name: "🎮 How to Play",
              value: `\`${prefix}connect4 <player>\`\nChallenge someone to Connect Four\n\`${prefix}c4 <player>\`\nAlias for connect4\nExample: \`${prefix}connect4 @friend\``,
              inline: false
            },
            {
              name: "🏆 Leaderboard",
              value: `\`${prefix}connect4 lb\`\nView Connect Four leaderboard\n\`${prefix}c4 lb\`\nSame as above`,
              inline: true
            },
            {
              name: "🎯 Game Rules",
              value: "• 30 seconds per turn\n• First to get 4 in a row wins\n• Use reactions to place pieces\n• Bot plays automatically if you don't respond",
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• Mention players with @username\n• Games are tracked per server\n• Win/loss ratios are calculated\n• Challenge anyone in the server!",
              inline: false
            }
          ],
          footer: {
            text: "Get 4 in a row to win! 🎯",
          },
        },
      ],
    }
  }
}