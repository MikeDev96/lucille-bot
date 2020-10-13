const { Command } = require("discord.js-commando")
const config = require("../../config.json")
const { getMusic } = require("../../messageHelpers")
const { run } = require("../music/play")

module.exports = class extends Command {
    constructor (client) {
      super(client, {
        name: "banga",
        aliases: ["banger", "banging", "bangin"],
        group: "fun",
        memberName: "banga",
        description: "Logs user bangers",
        args: [
            {
              key: "arg1",
              prompt: "Arg1",
              type: "string",
              default: "",
            },
            {
              key: "arg2",
              prompt: "Arg2",
              type: "string",
              default: "",
            },
          ],
        guildOnly: true,
      })
    }

    async run (msg, args) {

        if(args.arg1 === "list") {
            const tempArr = this.list(this.client.bangaTracker.listBangas(msg.author.id))
            const embed = { embed: {
                color: 0x0099ff,
                title: "Lucille :musical_note:",
                author: {
                  name: msg.member.displayName,
                  icon_url: msg.author.displayAvatarURL(),
                },
                fields: tempArr,
                footer: {
                  text: config.discord.footer,
                },
              }
            }
            msg.reply(embed)
            return
        }

        if(args.arg1 === "play") {
            let playArr = []
            const userBangers = this.client.users.cache.find(u => u.username === args.arg2)
            if(userBangers) {
                playArr = this.client.bangaTracker.listBangas(userBangers.id)
            } else {
                if(args.arg2.length > 0) {
                    msg.channel.send("Be more specific")
                    return
                }
                playArr = this.client.bangaTracker.listBangas(msg.author.id)
            }
            playArr.map(dbSong => {
                run(msg, {input: dbSong.song})
            })
            return
        }

        if(args.arg1 === "remove") {
            const grug = this.client.bangaTracker.findBanga(args.arg2);
            if(!grug) {
                msg.channel.send("Nice try")
                return
            }
            const replyMsg = await msg.reply(`Are you sure you want to remove ${grug}`)
            replyMsg.react("☑️").then(() => replyMsg.react("❌"))
            const filter = (reaction, user) => ["☑️", "❌"].includes(reaction.emoji.name) && user.id === msg.author.id
            const collected = await replyMsg.awaitReactions(filter, { time: 15000, max: 1 })
            replyMsg.delete()

            const firstKey = collected.firstKey()
            if (firstKey) {
                msg.react(firstKey)

                    if (firstKey === "☑️") {
                      this.client.bangaTracker.removeBanga(args.arg2, msg.author.id)
                    }
            } 
            return
        }

        const music = getMusic(msg);
        let currTrack = false;

        if(music.state.queue[0]) currTrack = music.state.queue[0].youTubeTitle;
        if(music.state.queue[0] && music.state.queue[0].radioMetadata && music.state.queue[0].radioMetadata.info) currTrack = music.state.queue[0].radioMetadata.info.title;
        if(music.state.queue[0] && music.state.queue[0].platform === "soundcloud") currTrack = music.state.queue[0].title;

        if(!currTrack) {
            msg.channel.send("Hold your horses")
            return
        }

        const checkEx = this.client.bangaTracker.checkForBanga(currTrack);

        if(args.args1 === "?") {
            msg.channel.send(`${this.findUsers(checkEx).join(", ")} thinks its a banger`)
            return;
        }

        if(checkEx.length) {
            if (this.checkForUser(checkEx, msg)) {
                msg.channel.send("You've already said this was a banger");
            } else {
                this.client.bangaTracker.updateUsers(currTrack, msg.author.id)
                msg.react("👍")
            }
        } else {
            this.client.bangaTracker.writeBanga(currTrack, msg.author.id);
            msg.react("👍")
        }
        
    }

    checkForUser(user, mess) {
        let greg = false;
        user[0].users.map(e => {
            if(e === mess.author.id) greg = true; 
        })
        return greg
    }

    findUsers(banger) {
        const usrArr = []
        let username
        if(banger[0]){
            banger[0].users.map(e => {
                username = this.client.users.cache.get(e);
                if(username) {
                    usrArr.push(username.username)
                }
            })
        } else {
            usrArr.push("No one")
        }
        return usrArr;
    }

    list(songs) {
        const songArr = []
        let bigSong = ""
        let i = 0;
        songs.map(e => {
            bigSong += e.song + "\n"
            if(bigSong.length > 500) {
                songArr.push({name: `Your bangers part ${++i}`, value: bigSong})
                bigSong = ""
            }

        })
        songArr.push({name: `Your bangers part ${++i}`, value: bigSong})
        return songArr
    }
}