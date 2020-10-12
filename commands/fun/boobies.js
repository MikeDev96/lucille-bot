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
    const cupSizeArray = ['AA','A','B','C','D','DD','F']
    const bandSizeArray = ['30','32','34','36','38','40','42','44','46']
    const cupSize = cupSizeArray[Math.floor(Math.random() * cupSizeArray.length)]
    const bandSize = bandSizeArray[Math.floor(Math.random() * bandSizeArray.length)]
    msg.reply(`${bandSize}${cupSize}${bandSize == '32' && cupSize == 'C' ? " Poggers (•)(•)" : ""}`)
  }
}