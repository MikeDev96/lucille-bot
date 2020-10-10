const { Command } = require("discord.js-commando")

module.exports = class Alarm extends Command {
  constructor (client) {
    super(client, {
      name: "alarm",
      aliases: ["setalarm"],
      group: "misc",
      memberName: "alarm",
      description: "Set an alarm",
      args: [
        {
          key: "time",
          prompt: "When? (24 Hour time HH:MM)",
          type: "string",
          validate: val => {
            
            let args = val.split(' ')[0]

            if(args.match(new RegExp('(2[0-3]|[0-1]?[\\d]):[0-5][\\d]'))) 
                return true
            return "Please provide a time in the format hh:mm"

          }
        },
      ],
      guildOnly: true,
    })
  }

  TimeDif = (time) => {

    let StartTime = new Date().toLocaleTimeString()

    // Time difference in ms
    let DateOne = new Date(`January 1 1970, ${time}:00`)
    let DateTwo = new Date(`January 1 1970, ${StartTime}`)

    let TimeDif = DateOne - DateTwo

    // Add a day if needed
    if(DateOne - DateTwo <= 0)
        TimeDif += 86400000
    return TimeDif;
  }

  async run (msg, args) {
    msg.react("⏲️")

    setTimeout(async () => {
        msg.reply("Done")
    }, this.TimeDif(args.time))

  }
  
}