
class ConnectFour {
  constructor (msg, playerOneId, playerTwoId) {
    this.playerIds = [playerOneId, playerTwoId]
    this.msg = msg
    this.db = msg.client.db
    this.boardVals = "0,0,0,0,0,0,0,0,0".split(",")
    this.boardReacts = "1️⃣,2️⃣,3️⃣,4️⃣,5️⃣,6️⃣,7️⃣,8️⃣,9️⃣".split(",")
    this.boardKey = "⭕❌"
    this.turn = Math.floor(Math.random() * 2)
  }

  // async buildBoardImage () {
  //   const canvas = createCanvas(250, 250)
  //   const ctx = canvas.getContext("2d")

  //   ctx.font = "30px Arial"

  //   // draw board image, probably could use lines too lazy
  //   const bgImage = await loadImage("C:\\Users\\David\\source\\git\\lucille-bot\\assets\\images\\tictactoe\\board.png")
  //   ctx.drawImage(bgImage, 0, 0, 250, 250)

  //   // draw shapes
  //   this.boardVals.forEach((val, idx) => {
  //     const xPos = 50 + ((idx % 3) * 75)
  //     const yPos = 60 + ((Math.floor(idx / 3)) * 75)

  //     switch (val) {
  //       case "0":
  //         var size = 20
  //         ctx.lineWidth = 1
  //         ctx.strokeStyle = "#01bB32"
  //         ctx.fillStyle = "#01bB12"
  //         ctx.fillText(idx + 1, xPos - 10, yPos)
  //         ctx.strokeText(idx + 1, xPos - 10, yPos)
  //         break

  //       case "1":
  //         ctx.lineWidth = 8
  //         ctx.strokeStyle = "#01bBC2"
  //         ctx.beginPath()
  //         ctx.arc(xPos, yPos - 10, 15, 0, Math.PI * 2, false)
  //         ctx.stroke()
  //         break

  //       case "2":
  //         ctx.strokeStyle = "#f1be32"

  //         ctx.beginPath()
  //         ctx.lineWidth = 8

  //         var offX = -10
  //         var offY = -20
  //         size = 30

  //         ctx.moveTo((xPos + size) + offX, (yPos + size) + offY)
  //         ctx.lineTo((xPos + 20 - size) + offX, (yPos + 20 - size) + offY)

  //         ctx.moveTo((xPos + size) + offX, (yPos + 20 - size) + offY)
  //         ctx.lineTo((xPos + 20 - size) + offX, (yPos + size) + offY)

  //         ctx.stroke()
  //         break
  //     }
  //   })

  //   // is win? draw line through winner

  //   // ctx.fillText(this.boardKey 50, 100)
  //   // var size = ctx.measureText("Awesome!")

  //   // Draw line under text
  //   // ctx.strokeStyle = "rgba(0,0,0,0.5)"
  //   // ctx.beginPath()
  //   // ctx.lineTo(50, 102)
  //   // ctx.lineTo(50 + text.width, 102)
  //   // ctx.stroke()

  //   return canvas.toBuffer()
  // }

  buildMessage (hasWon = false, hasDrawn = false) {
    let msgOutput = ""

    msgOutput = `.\r\n${hasDrawn ? "It's a draw!" : `${this.boardKey[this.turn]} <@!${this.playerIds[this.turn]}> ${hasWon ? " is the winner 🏆" : " turn"}`}\n\r\n`
    msgOutput += this.boardVals.map((val, idx) => (val === "0" ? this.boardReacts[idx] : this.boardKey[val]) + ((idx + 1) % 3 === 0 ? "\r\n" : "")).join("")

    if (!hasWon && !hasDrawn) {
      msgOutput += "\r\nYou have " + this.turnCountdown + "s remaining"
    }

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
    this.db.insertTicTacToeWinner(this.msg.guild.id, this.playerIds[0], this.playerIds[1], this.hasDrawn() ? "-" : this.playerIds[this.turn])
  }

  async runLoop () {
    this.boardReacts.forEach(async (react) => await this.msg.react(react))

    // not accurate, but does the job

    do {
      this.msg.edit(this.buildMessage())

      const filter = (reaction, user) => this.boardReacts.includes(reaction.emoji.name) && user.id === this.playerIds[this.turn]
      const collected = await this.msg.awaitReactions(filter, { time: 30000, max: 1 })
      const key = collected.firstKey()
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

module.exports = ConnectFour