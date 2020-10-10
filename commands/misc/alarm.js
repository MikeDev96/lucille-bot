const { Command } = require("discord.js-commando")

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
            
            let args = val.split(' ')

            if(args.length > 1)
                return false
            
            if(args[0].match(new RegExp('(2[0-3]|[0-1]?[\\d]):[0-5][\\d]'))) 
                return true
            
            return "Please provide a time in the format hh:mm (UTC Time)"

          }
        },
      ],
      guildOnly: true,
    })
  }

  async run (msg, args) {
    msg.react("⏲️")

    console.log(new Date().toLocaleTimeString())
    console.log(new Date().toLocaleTimeString('UTC'))

    let StartTime = new Date().toLocaleTimeString('UTC')

    console.log(args.time.split(' ')[0])

    // Time difference in ms
    let DateOne = new Date(`January 1 2000, ${args.time.split(' '[0])}:00`)
    let DateTwo = new Date(`January 1 2000, ${StartTime}`)

    let TimeDif = DateOne - DateTwo

    // Add a day if needed
    if(DateOne - DateTwo <= 0)
        TimeDif += 86400000

    setTimeout(async () => {
        await msg.channel.send(`${msg.author}'s Alarm has finished`)
    }, TimeDif)

  }
  
}