import FastSpeedtest from "fast-speedtest-api"
import Command from "../../models/Command.js"

export default class extends Command {
  constructor () {
    super({
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
      token: process.env.SPEEDTEST_TOKEN, // required
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
      msg.reply(`❌ Speed test failed: ${e.message}`)
    })
  }

  getHelpMessage (prefix) {
    return {
      embeds: [
        {
          title: "🚀 Speedtest Command Help",
          description: "Test the bot server's internet connection speed!",
          color: 0x00ff00,
          fields: [
            {
              name: "📊 Usage",
              value: `\`${prefix}speedtest\`\nTest server connection speed\n• Measures download speed in Mbps\n• Uses Fast.com API\n• 10-second timeout`,
              inline: false
            },
            {
              name: "💡 Tips",
              value: "• Results show download speed only\n• Speed depends on server location\n• Useful for troubleshooting\n• Requires SPEEDTEST_TOKEN",
              inline: false
            }
          ],
          footer: {
            text: "Need for speed! 🏎️",
          },
        },
      ],
    }
  }
}