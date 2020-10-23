
class TicTacToe {
  constructor (msg, playerOneId, playerTwoId) {
    this.playerIds = [playerOneId, playerTwoId]
    this.msg = msg
    this.db = msg.client.db
    this.boardVals = "0,0,0,0,0,0,0,0,0".split(",")
    this.boardReacts = "1️⃣,2️⃣,3️⃣,4️⃣,5️⃣,6️⃣,7️⃣,8️⃣,9️⃣".split(",")
    this.boardKey = "⭕❌"
    this.turn = Math.floor(Math.random() * 2)
  }

  buildMessage (hasWon = false, hasDrawn = false) {
    let msgOutput = ""

    msgOutput = `.\r\n${hasDrawn && !hasWon ? "It's a draw!" : `${this.boardKey[this.turn]} <@!${this.playerIds[this.turn]}> ${hasWon ? " is the winner 🏆" : " turn"}`}\n\r\n`
    msgOutput += this.boardVals.map((val, idx) => (val === "0" ? this.boardReacts[idx] : this.boardKey[val]) + ((idx + 1) % 3 === 0 ? "\r\n" : "")).join("")

    return msgOutput
  }

  setPiece (idx) {
    if (idx < 0 || idx >= this.boardVals.length) {
      return false
    }

    if (this.boardVals[idx] !== "0") {
      return false
    }

    this.boardVals[idx] = this.turn
    return true
  }

  swapTurn () {
    this.turn ^= 1
  }

  hasDrawn () {
    return this.boardVals.findIndex(val => val === "0") === -1
  }

  getRandomFreePiece () {
    const freeSpaces = this.boardVals.map((val, idx) => val === "0" && idx)
    return freeSpaces[Math.floor(Math.random() * freeSpaces.length)]
  }

  hasWon () {
    const row = [0, 0, 0]
    return this.boardVals.some((_val, idx, arr) => (
      ((idx % 3) < 1 && row.every((_v, i) => arr[idx + i] === this.turn)) || // Horizontal
      (idx < 3 && row.every((_v, i) => arr[idx + i * 3] === this.turn)) || // Vertical
      (idx < 1 && row.every((_v, i) => arr[idx + i * 3 + i] === this.turn)) || // NW-SE
      (idx === 2 && row.every((_v, i) => arr[idx + i * 3 - i] === this.turn)) // NE-SW
    ))
  }

  uploadResult () {
    this.db.insertTicTacToeWinner(this.msg.guild.id, this.playerIds[0], this.playerIds[1], this.hasDrawn() && this.hasWon() ? "-" : this.playerIds[this.turn])
  }

  async runLoop () {
    this.boardReacts.forEach(async (react) => await this.msg.react(react))

    do {
      await this.msg.edit(this.buildMessage())

      const isLucille = this.playerIds[this.turn] === this.msg.author.id

      const filter = (reaction, user) => this.boardReacts.includes(reaction.emoji.name) && user.id === this.playerIds[this.turn]
      const collected = isLucille !== true ? await this.msg.awaitReactions(filter, { time: 30000, max: 1 }) : undefined
      const key = collected && collected.firstKey()
      let idx = this.boardReacts.findIndex(react => react === key)

      if (key) {
        collected.get(key).users.cache.forEach(user => collected.get(key).users.remove(user.id))
      }
      else {
        idx = this.getRandomFreePiece()
      }

      if (!this.setPiece(idx)) {
        continue
      }

      if (this.hasWon() || this.hasDrawn()) {
        break
      }

      this.swapTurn()
    } while (true)

    this.msg.edit(this.buildMessage(this.hasWon(), this.hasDrawn()))
    this.uploadResult()
  }
}

module.exports = TicTacToe