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

  async run (msg, _args) {
    if (!msg.member.voice || !msg.member.voice.channel) {
      msg.react("🖕")
      return
    }
    const checkPeopleAreInChannel = []
    msg.member.voice.channel.members.map(member => {
      checkPeopleAreInChannel.push(member.user.id)
    })
    const confirmMsg = await msg.reply(`Is this bye wanted?`)
    confirmMsg.react("🛑")
    const filter = (reaction, user) => ["🛑"].includes(reaction.emoji.name) && !user.bot && checkPeopleAreInChannel.includes(user.id)
    const collected = await confirmMsg.awaitReactions(filter, { time: 8000, max: 1 })
    confirmMsg.delete()

    const firstKey = collected.firstKey()

    if (firstKey) {
      msg.channel.send("Nuuuuuuuuuuuu, nu bye")
      return
    }

    const music = msg.guild.music
    music.state.queue.splice(0, music.state.queue.length)
    music.setState({ queue: music.state.queue })

    const kickedMembers = msg.member.voice.channel.members.map(member => {
      member.voice.setChannel(null)
      return member.displayName
    })

    if (kickedMembers.length) {
      msg.react("👋")
      msg.channel.send(`Goodbye ${join(kickedMembers)}`)
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