const { Command } = require("discord.js-commando")
const { discord } = require("../../config")
const countdown = require("countdown")
const axios = require("axios")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "imposter",
      aliases: ["i"],
      group: "fun",
      memberName: "imposter",
      description: "Imposter",
      args: [],
      guildOnly: true,
    })
  }

  run (msg, args) {
    const embed = {
      embed: {
        color: 0x0099ff,
        title: "Imposter Release",
        description: "It's already been released dum dum.",
        author: {
          name: msg.member.displayName,
          icon_url: msg.author.displayAvatarURL(),
        },
        fields: [
          {
            name: "Updates",
            value: `[View updates](https://launcher.haribodev.uk/news)`,
          },
          {
            name: "HariboDev Launcher",
            value: `[Download the HariboDev Launcher](https://launcher.haribodev.uk)`,
          },
        ],
        footer: {
          text: discord.footer,
        },
      },
    }
    msg.reply(embed)
  }
}