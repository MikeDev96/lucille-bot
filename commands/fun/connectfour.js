const { Command } = require("discord.js-commando")
const { cloneWith } = require("lodash")
const ConnectFour = require("../../classes/ConnectFour")
const { discord } = require("../../config.json")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
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
    try {
    // does player exist in game
      const plrName = args.player
      const guild = msg.guild

      const member = this.getMemberFromArg(guild, plrName)

      const playerOneId = msg.author.id
      const playerTwoId = member.user.id

      if (!await this.sendChallenge(msg, playerTwoId)) {
        console.log("declined")
        return
      }

      const turn = Math.ceil(Math.random() * 2) - 1

      console.log(turn)

      const cf = new ConnectFour(msg.client)
      const boardMsg = await msg.reply(this.getEmbed(msg.guild.members.cache.find(x => x.id === playerOneId), cf.displayBoard(), msg.client, false))

      const reactions = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣"]
      reactions.forEach(async (react) => await boardMsg.react(react))

      await this.monitorReactions(boardMsg, playerOneId, playerTwoId, turn === 0, cf, reactions)
    }
    catch (err) {
      console.log(err)
    }
  }

  async monitorReactions (msg, playerOneId, playerTwoId, turn, cf, reactions) {
    let winnerId = ""

    try {
      do {
        const usersTurn = (!turn ? playerOneId : playerTwoId)
        const filter = (reaction, user) => reactions.includes(reaction.emoji.name) && user.id === usersTurn

        const collected = await msg.awaitReactions(filter, { time: 30000, max: 1 })
        const key = collected.firstKey()
        let reactIdx = -1
        if (!key) {
          reactIdx = cf.randomFreeSlot()
        }
        else {
          reactIdx = reactions.findIndex(react => react === key)
          collected.get(key).users.remove(usersTurn)
        }

        const slot = cf.nextFreeSlot(reactIdx + 1)
        const success = cf.setPiece(slot, turn + 1)
        if (success) {
          if (cf.checkForWin(slot, turn + 1)) {
            winnerId = usersTurn
          }
          else {
            turn ^= true
          }
        }

        // load board
        await msg.edit(this.getEmbed(msg.guild.members.cache.find(x => x.id === (!turn ? playerOneId : playerTwoId)), cf.displayBoard(), msg.client, turn, winnerId))
      } while (winnerId === "" && cf.possibleMove())

      // cleanup
      await msg.reactions.removeAll()

      // log winner
      cf.uploadWin(msg.guild.id, playerOneId, playerTwoId, winnerId)
    }
    catch (Err) {
      console.log(Err)
    }

    // cleanup
  }

  getEmbed (user, board, client, turn, winnerId = "") {
    const description = winnerId !== ""
      ? `${["🟡", "🔴"][!turn ? 0 : 1]} <@!${user.id}> Won!`
      : `${["🟡", "🔴"][!turn ? 0 : 1]} It's <@!${user.id}> turn\r\n30s Per turn`
    return {
      embed: {
        title: `Connect 4`,
        description: description,
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
    }
  }

  getMemberFromArg (guild, plrName) {
    return guild.members.cache.find(x => `<@!${x.id}>` === plrName.toLowerCase() ||
      x.id === plrName.toLowerCase() ||
      x.user.username.toLowerCase() === plrName.toLowerCase())
  }

  async sendChallenge (msg, playerTwoId) {
    try {
      const queryMsg = await msg.reply(`You have challenged <@!${playerTwoId}> to a game of connect four. <@!${playerTwoId}>, Would you like to accept?`)
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
      console.log(err)
    }

    return false
  }
}