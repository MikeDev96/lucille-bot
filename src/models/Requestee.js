export default class Requestee {
  constructor (displayName, avatar, id) {
    this.displayName = displayName
    this.avatar = avatar
    this.id = id
  }

  static create (msg) {
    return new Requestee(msg.member.displayName, msg.author.displayAvatarURL(), msg.author.id)
  }
};