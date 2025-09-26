import { PermissionsBitField } from "discord.js"
import Command from "../../models/Command.js"
import { getVoiceChannel, shouldIgnoreMessage } from "../../helpers.js"
import LucilleClient from "../../classes/LucilleClient.js"

export default class extends Command {
  constructor() {
    super({
      name: "bye",
      aliases: [],
      group: "fun",
      memberName: "bye",
      description: "Goodbye to all",
      args: [],
      guildOnly: true,
    })
  }

  async run(msg, _args) {
    if (shouldIgnoreMessage(LucilleClient.Instance, msg)) {
      msg.react("🖕")
      return
    }

    if (!msg.channel.permissionsFor(msg.guild.roles.everyone).has(PermissionsBitField.Flags.ViewChannel)) {
      msg.channel.send("To use this command it needs to be posted in a channel that EVERYONE can see. If your doing this in a secret channel you know who you are, naughty naughty")
      return
    }

    if (!(msg.channel.name === "general")) {
      msg.channel.send("Post this in general please, you sneaky beaver")
      return
    }

    if (!msg.guild.bye) {
      msg.guild.bye = true
      setTimeout(() => {
        msg.guild.bye = false
      }, 30000)
    }
    else {
      msg.channel.send("Bye Cooldown, this takes 30 seconds")
      return
    }

    const authorOfMessage = msg.guild.members.cache.get(msg.member.id)
    const authorOriginalChannelID = getVoiceChannel(msg)

    // Check if user is in a voice channel
    if (!msg.member.voice || !msg.member.voice.channel) {
      msg.channel.send("You need to be in a voice channel to use the bye command")
      return
    }

    let peopleToBeRemoved = msg.member.voice.channel.members.map(member => member)
    const checkPeopleAreInChannel = msg.member.voice.channel.members.map(member => member.user.id)
    const confirmMsg = await msg.reply(`Is this bye wanted?`)
    confirmMsg.react("🛑")
    const filter = (reaction, user) => ["🛑"].includes(reaction.emoji.name) && !user.bot && checkPeopleAreInChannel.includes(user.id)
    const collected = await confirmMsg.awaitReactions({ filter, time: 8000, max: 1 })
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

    if (!msg.member.voice || !msg.member.voice.channel) {
      msg.channel.send("You left anyway, whats the point")
      return
    }

    if (authorCurrentChannelID !== authorOriginalChannelID) {
      authorOfMessage.voice.setChannel(null)
      msg.channel.send("It appears you've started a bye then moved to another channel. Lucille doesn't like this so i'm just gonna kick just you")
      return
    }

    const music = LucilleClient.Instance.getGuildInstance(msg.guild).music
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

getHelpMessage(prefix) {
  return {
    embeds: [
      {
        title: "👋 Bye Command Help",
        description: "Say goodbye to everyone in your voice channel!",
        color: 0xffa500,
        fields: [
          {
            name: "🚪 How It Works",
            value: `\`${prefix}bye\`\nKick everyone from your voice channel\n• Must be in a voice channel\n• Must be posted in #general\n• 30-second cooldown`,
            inline: false
          },
          {
            name: "⚠️ Requirements",
            value: "• Channel must be visible to everyone\n• You must be in a voice channel\n• Command must be used in #general\n• 8-second confirmation period",
            inline: false
          },
          {
            name: "🛑 Safety Features",
            value: "• Anyone in the channel can stop it with 🛑\n• Clears the music queue\n• Prevents channel switching during bye\n• Cooldown prevents spam",
            inline: false
          }
        ],
        footer: {
          text: "Use responsibly! 👋",
        },
      },
    ],
  }
}
}