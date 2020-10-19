
class ConnectFour {
  constructor (client, gameId) {
    this.db = client.db
    this.boardVals = "0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0".split(",")
    this.boardKey = ["⚫", "🟡", "🔴"]
    this.gameId = ""
  }

  displayBoard () {
    let boardOutput = ""

    for (let i = 0; i < this.boardVals.length; i++) {
      if (i !== 0 && i % 7 === 0) {
        boardOutput += "\r\n"
      }
      boardOutput += this.boardKey[this.boardVals[i]]
    }

    return `\`\`\`${boardOutput}\r\n1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣\`\`\``
  }

  setPiece (slot, turn) {
    if (slot < 0) {
      return false
    }

    this.boardVals[slot] = turn

    return true
  }

  nextFreeSlot (idx) {
    let slot = -1
    let row = 0
    do {
      slot = (this.boardVals.length - 8 - (7 * row++)) + idx
    } while (slot >= 0 && this.boardVals[slot] !== "0")
    return slot
  }

  randomFreeSlot () {
    let slot = Math.floor(Math.random() * 7)
    let iAttempt = 0

    while (slot === -1 && iAttempt++ < 20) {
      slot = Math.floor(Math.random() * 7)
    }

    return slot
  }

  possibleMove () {
    return this.boardVals.findIndex(val => val === "0") !== -1
  }

  uploadWin (serverId, playerOne, playerTwo, winner) {
    this.db.insertConnectFourWinner(serverId, playerOne, playerTwo, winner)
  }

  checkForWin (idx, turn) {
    const piece = turn
    const idxOnRow = idx % 7
    const clmIdx = (this.boardVals.length / 7) - Math.ceil(idx / 7)

    //
    // horizontal: left->right
    //
    let counter = 0
    for (let i = idx - idxOnRow; i < (idx - idxOnRow + 7); i++) {
      if (this.boardVals[i] === piece) {
        if (++counter === 4) {
          return true
        }
        continue
      }
      counter = 0
    }

    //
    // vertical: top->down
    //
    counter = 0
    for (let i = idxOnRow; i < (idxOnRow + (7 * 6)); i += 7) {
      if (this.boardVals[i] === piece) {
        if (++counter === 4) {
          return true
        }
        continue
      }
      counter = 0
    }

    //
    // diagnol: topleft->bottomright
    //
    counter = 0
    let posLf = (idx - (7 * idxOnRow)) - idxOnRow
    if (posLf < this.boardVals.length) {
      do {
        if (this.boardVals[posLf] === piece) {
          if (++counter === 4) {
            return true
          }
        }
        else {
          counter = 0
        }

        posLf += 8
      } while (posLf < this.boardVals.length)
    }

    //
    // diagnol: bottomleft->topright
    //
    counter = 0
    let posRt = idx + (clmIdx * 7) - clmIdx // gets the column your on
    if (posRt > 0 && posRt < this.boardVals.length) {
      do {
        if (this.boardVals[posRt] === piece) {
          if (++counter === 4) {
            return true
          }
        }
        else {
          counter = 0
        }

        posRt -= 6
      } while (posRt > 0)
    }
  }
}

module.exports = ConnectFour