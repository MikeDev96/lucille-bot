module.exports = class Requestee {
  displayName
  avatar
  id

  constructor(displayName, avatar, id) {
    this.displayName = displayName
    this.avatar = avatar
    this.id = id
  }
}