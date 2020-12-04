const { Command } = require("discord.js-commando")
const config = require("../../config.json")
const Tenor = require("tenorjs").client({
    "Key": config.tenor.key,
    "Filter": "high",
    "Locale": "en_US",
});

var date = String(new Date())
let month = date.substring(4, 7);
let day = parseInt(date.substring(8, 10));
var gifpairing = {}

var keywords = ["christmas pudding", "christmas donkey", "christmas elf", "christmas snowman", "christmas present", "christmas dog", "christmas cake", "christmas baby", "christmas jumper", "christmas bauble", "christmas wreath", "christmas stocking", "christmas robin", "santa sleigh", "rudolph", "christmas candle", "christmas tree", "christmas michael buble", "christmas hat", "christmas cookie", "christmas candy cane", "christmas lights", "christmas cracker", "father christmas", "christmas dinner"]

module.exports = class extends Command {
  constructor(client) {
    super(client, {
      name: "advent calendar",
      aliases: ["ac"],
      group: "fun",
      memberName: "advent calendar",
      description: "festive fun for everyone",
      args: [],
      guildOnly: true,
    })
  }

  run(msg, args) {
    if(month !== "Dec"){
        msg.reply("bugger off it's not christmas silly")

    }
    else{
        if(day > 25){
            msg.reply("you're too late christmas is over :(")
        }
        else{
            var rdm = Math.floor(Math.random()*10)
            if(msg.author.id in gifpairing){
                msg.reply("you've already had your choccy for the day greedy guts")
            }
            else{
                gifpairing[msg.author.id] = rdm
                Tenor.Search.Query(keywords[day-1], "10")
                .then(response => {
                    const gifs = response;
                    msg.reply(gifs[rdm].url)
                }).catch(console.error)
            }
        }
    }
  }
}