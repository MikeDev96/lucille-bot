const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "bye",
      aliases: [],
      group: "fun",
      memberName: "bye",
      description: "Goodbye to all",
      args: [],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    msg.react("👋")

    const channels = msg.guild.channels.cache.filter(c => c.type === "voice")
    const members = []

    for (const [, channel] of channels) {
      for (const [, member] of channel.members) {
        members.push(member.displayName)
        member.voice.setChannel(null)
      }
    }

    if (members.length) {
      msg.channel.send(`Goodbye ${join(members)}`)
    }
  }
}

const join = (arr) => {
  if (arr.length === 0) {
    return ""
  }

  const newArr = arr.map(str => `\`${str}\``)
  const lastItem = newArr.pop()
  const outArr = []

  if (newArr.length) {
    outArr.push(newArr.join(", "))
  }

  outArr.push(lastItem)

  return `${outArr.join(" & ")} 👋👋👋`
}