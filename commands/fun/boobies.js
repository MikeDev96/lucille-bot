const { Command } = require("discord.js-commando")

module.exports = class extends Command {
  constructor(client) {
    super(client, {
      name: "boobies",
      aliases: ["brasize"],
      group: "fun",
      memberName: "boobies",
      description: "Bra Size",
      args: [],
      guildOnly: true,
    })
  }

  run(msg, _args) {
    const cupSize = ['AA','A','B','C','D','DD','F']
    const bandSize = ['30','32','34','36','38','40','42','44','46']
    msg.reply(`${bandSize[Math.floor(Math.random() * bandSize.length)]}${cupSize[Math.floor(Math.random() * cupSize.length)]}`)
  }
}