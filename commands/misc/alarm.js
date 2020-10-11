const { Command } = require("discord.js-commando")
const { msToTimestamp } = require('../../helpers')

module.exports = class Alarm extends Command {
  constructor (client) {
    super(client, {
      name: "alarm",
      aliases: ["setalarm"],
      group: "misc",
      memberName: "alarm",
      description: "Set an alarm for UTC Time",
      args: [
        {
          key: "time",
          prompt: "When? (24 Hour time HH:MM)",
          type: "string",
          validate: val => {
            
            if(val.match(new RegExp('(2[0-3]|[0-1]?[\\d]):[0-5][\\d]')) && val.length === 5) 
                return true
            
            return "Please provide a time in the format hh:mm (UTC Time)"
          }
        },
        {
          key: "timezoneDifference",
          prompt: "How many hours ahead or behind UTC",
          type: "string",
          validate: val => {

            val = Number(val)

            if(isNaN(val))
              return "Please return a number"
  
            if(Math.abs(val) > 12)
              return "Please provide a number between -12 and 12"

            return true
          }
        }
      ],
      guildOnly: true,
    })
  }

  TimeDiffCalc(msg, args) {

    let StartTime = new Date().toLocaleTimeString('UTC')

    // Time difference in ms
    let DateOne = new Date(`January 1 2000, ${args.time}:00`)
    let DateTwo = new Date(`January 1 2000, ${StartTime}`)

    let TimeDif = DateOne - DateTwo
    
    // Add a day if needed
    if(TimeDif <= 0)
        TimeDif += 86400000

    TimeDif += (args.timezoneDifference * 3600000) 

    let timestamp = msToTimestamp(TimeDif).toString()

    msg.reply(`An alarm has been set for ${isNaN(timestamp) ? timestamp : 0}s time`)

    return TimeDif
  }

  async run (msg, args) {
    msg.react("⏲️")

    setTimeout(async () => {
        await msg.channel.send(`${msg.author} Your ${args.time} Alarm has finished`)
    }, this.TimeDiffCalc(msg, args))
  }
  
}