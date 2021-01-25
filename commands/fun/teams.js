const { VoiceChannel } = require("discord.js")
const { Command } = require("discord.js-commando")
const { query } = require("express")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "teams",
      aliases: ["t"],
      group: "fun",
      memberName: "teams",
      description: "Splits people into teams",
      args: [
        {
          key: "arg1",
          prompt: "Number of teams to split into",
          type: "string",
          default: "",
        },
        {
          key: "arg2",
          prompt: "Channel to split into teams (optional)",
          type: "string",
          default: "",
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    // if user types ;teams help | ;t help etc...
    if (Object.values(args).filter(x => x.toLowerCase() === "help").length > 0) {
      msg.reply(this.getHelpMessage(msg.client.commandPrefix))
      return
    }

    // if (!msg.member.voice || !msg.member.voice.channel) {
    //   msg.react("🖕")
    //   return
    // }

    const numOfTeams = args.arg1
    const selectedChannel = args.arg2

    if (!numOfTeams) {
      msg.channel.send("Please specify how many teams")
      return
    }

    if (selectedChannel) {
      msg.member.voice.channel.members.map(member => {

      })
    }
    else {
      if (!await this.askParticipants(msg)) {}
    }
  }

  async askParticipants (msg) {
    try {
      const queryMsg = await msg.channel.send("Who wants to participate? (30s)")

      const reactions = ["✋", "✅", "❌"]
      for (let i = 0; i < reactions.length; i++) {
        await queryMsg.react(reactions[i])
      }

      try {
        const voiceChannelMembers = msg.guild.voice.channel.members.filter(member => member.user.id !== msg.client.user.id)

        const filter = (reaction, user) => reaction.emoji.name === "✋" && voiceChannelMembers.has(user.id)

        const reactions = await queryMsg.awaitReactions(filter, { time: 30000 })
        await queryMsg.delete()
        console.log(reactions)
      }
      catch (err) {

      }

      const collected = await queryMsg.awaitReactions((reaction, user) => reactions.includes(reaction.emoji.name) && user.id, { time: 60000, max: 1 })

      queryMsg.delete()

      console.log(collected)
    }
    catch (err) {
      console.error(err)
    }

    return false
  }

  getHelpMessage (prefix) {
    return `
  __**${prefix}Teams command:**__    
  \`${prefix}teams\` \`NUMBER_OF_TEAMS\` - Splits participants into teams.
  \`${prefix}teams\` \`NUMBER_OF_TEAMS\` \`CHANNEL_NAME\` - Splits channel participants into teams.`
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