const { Command } = require("discord.js-commando")
const { getMusic } = require("../../messageHelpers")

module.exports = class extends Command {
    constructor (client) {
      super(client, {
        name: "banga",
        aliases: ["banger", "banging", "bangin"],
        group: "fun",
        memberName: "banga",
        description: "Logs user bangers",
        args: [],
        guildOnly: true,
      })
    }

    async run (msg, args) {
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

        if(args === "?") {
            msg.channel.send(`${this.findUsers(checkEx).join(", ")} thinks its a banger`)
            return;
        }

        if(checkEx.length) {
            if (this.checkForUser(checkEx, msg)) {
                msg.channel.send("You've already said this was a banger");
            } else {
                this.client.bangaTracker.updateUsers(currTrack, msg.author.id)
                msg.channel.send("Banger was in the DB, you've now been added onto the list")
            }
        } else {
            this.client.bangaTracker.writeBanga(currTrack, msg.author.id);
            msg.channel.send("Banger has been added to your profile")
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
}