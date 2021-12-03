const { Command } = require("discord.js-commando")
const { getVoiceChannel } = require("../../helpers")

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

    if (!msg.channel.permissionsFor(msg.guild.roles.everyone).has("VIEW_CHANNEL")) {
      msg.channel.send("To use this command it needs to be posted in a channel that EVERYONE can see. If your doing this in a secret channel you know who you are, naughty naughty")
      return
    }

    if (!(msg.channel.name === "general")) {
      msg.channel.send("Post this in general please, you sneaky beaver")
      return
    }

    const byeDbStatus = await this.client.db.getByeStatus()
    if (!byeDbStatus.length) {
      await this.client.db.addByeStatus(1)
      setTimeout(() => {
        this.client.db.removeBye()
      }, 30000)
    }
    else {
      msg.channel.send("Bye Cooldown, this takes 30 seconds")
      return
    }

    const authorOfMessage = msg.guild.members.cache.get(msg.member.id)
    const authorOriginalChannelID = getVoiceChannel(msg)
    let peopleToBeRemoved = msg.member.voice.channel.members.map(member => member)
    const checkPeopleAreInChannel = msg.member.voice.channel.members.map(member => member.user.id)
    const confirmMsg = await msg.reply(`Is this bye wanted?`)
    confirmMsg.react("🛑")
    const filter = (reaction, user) => ["🛑"].includes(reaction.emoji.name) && !user.bot && checkPeopleAreInChannel.includes(user.id)
    const collected = await confirmMsg.awaitReactions(filter, { time: 8000, max: 1 })
    if (confirmMsg.deleted) {
      msg.channel.send("Rude, don't delete the bye until its finished please")
      return
    }
    confirmMsg.delete()

    const firstKey = collected.firstKey()

    if (firstKey) {
      msg.channel.send("Nuuuuuuuuuuuu, nu bye")
      return
    }

    const authorCurrentChannelID = getVoiceChannel(msg)

    if (!msg.guild.voice) {
      msg.channel.send("You left anyway, whats the point")
      return
    }

    if (authorCurrentChannelID !== authorOriginalChannelID) {
      authorOfMessage.voice.setChannel(null)
      msg.channel.send("It appears you've started a bye then moved to another channel. Lucille doesn't like this so i'm just gonna kick just you")
      return
    }

    const music = msg.guild.music
    music.state.queue.splice(0, music.state.queue.length)
    music.setState({ queue: music.state.queue })

    peopleToBeRemoved = peopleToBeRemoved.map(member => {
      member.voice.setChannel(null)
      return member.displayName
    })

    if (peopleToBeRemoved.length) {
      msg.react("👋")
      msg.channel.send(`Goodbye ${join(peopleToBeRemoved)}`)
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