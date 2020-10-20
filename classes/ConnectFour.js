
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

  checkForWin (turn) {
    const row = [0, 0, 0, 0]

    return this.boardVals.some((_val, idx, arr) => (
      ((idx % 7) < 4 && row.every((_v, i) => arr[idx + i] === turn)) || // Horizontal
        (idx < 21 && row.every((_v, i) => arr[idx + i * 7] === turn)) || // Vertical
        ((idx % 7) < 4 && idx < 21 && row.every((_v, i) => arr[idx + i * 7 + i] === turn)) || // NW-SE
        ((idx % 7) > 2 && idx < 21 && row.every((_v, i) => arr[idx + i * 7 - i] === turn)) // NE-SW
    ))
  }
}

module.exports = ConnectFour