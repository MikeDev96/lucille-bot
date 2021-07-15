const { Command } = require("discord.js-commando")
const FastSpeedtest = require("fast-speedtest-api")
const config = require("../../config.json")

module.exports = class extends Command {
  constructor (client) {
    super(client, {
      name: "speedtest",
      aliases: [""],
      group: "misc",
      memberName: "speedtest",
      description: "Checks the speed of the bot server",
      args: [],
      guildOnly: true,
    })
  }

  async run (msg, _args) {
    const speedtest = new FastSpeedtest({
      token: config.speedTest.token, // required
      verbose: false, // default: false
      timeout: 10000, // default: 5000
      https: true, // default: true
      urlCount: 5, // default: 5
      bufferSize: 8, // default: 8
      unit: FastSpeedtest.UNITS.Mbps, // default: Bps
    })

    speedtest.getSpeed().then(s => {
      msg.channel.send(`Speed: ${s.toFixed(2)} Mbps`)
    }).catch(e => {
      console.error(e.message)
    })
  }
}