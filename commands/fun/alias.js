const { Command, CommandoMessage } = require("discord.js-commando")
const { Discord } = require('discord.js')
const config = require("../../config.json")

module.exports = class Alias extends Command {
    constructor(client) {
        super(client, {
            name: "alias",
            memberName: "alias",
            description: "Create aliases (shortcuts) for commands",
            group: "misc",
            args: [
                {
                    key: "aliasname",
                    prompt: "alias name",
                    type: "string",
                },
                {
                    key: "aliasvalue",
                    prompt: "alias value",
                    type: "string",
                    default: ""
                }
            ],
            aliases: ["al"],
        })
    }

    async run(msg, args) {

        const { aliasname, aliasvalue } = args
        const Prefix = this.client.commandPrefix

        //Prevent infinite loops
        if (aliasname === aliasvalue)
            return msg.channel.send("Pls dont break this too much")
        //List all
        else if (aliasname === "list") {

            const List = this.client.aliasTracker.listAliases()
            console.log(List)

            if (List.length) {

                // Build the embed
                msg.channel.send({
                    embed: {
                        color: 0x0099ff,
                        title: "Lucille alias commands",
                        fields: [
                            ...List.map(alias => ({
                                name: alias.alias,
                                value: alias.command,
                            })),
                        ],
                        footer: {
                            text: "Created with ♥ by Migul, Keef and Jue, Powered by Keef Web Services",
                            icon_url: config.discord.authorAvatarUrl,
                        },
                    }
                })
            }
            else msg.reply("No aliases have been added yet")
        }
        //Succesfully finds a command
        else if (aliasvalue === "") {

            //Made for readabillity
            const AliasCommand = this.client.aliasTracker.checkForAlias(aliasname)[0].command
            
            AliasCommand.forEach((command) => {
                setTimeout(() => {
                    if (command.includes(Prefix)) {
                        this.client.dispatcher.handleMessage(
                            new CommandoMessage(this.client,
                                {
                                    id: msg.author.id,
                                    content: `${command}`,
                                    author: msg.author
                                },
                                msg.channel)
                        )
                    } else msg.channel.send(command)
                }, 2000)
            })
        }
        else {
            if (aliasvalue === 'delete') {
                this.client.aliasTracker.removeAlias(args.aliasname)
                msg.reply(`Deleted alias '${aliasname}' :)`)
            }
            else if (this.client.aliasTracker.checkForAlias(aliasname).length)
                msg.reply("This alias already exists :(")
            else {
                this.client.aliasTracker.writeAlias(aliasname, aliasvalue)
                msg.reply("Alias added :)")
            }
        }
    }
}