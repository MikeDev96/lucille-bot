const { Command } = require("discord.js-commando")
const axios = require("axios")
const config = require('../../config.json')

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "banshee",
            aliases: [],
            group: "destiny",
            memberName: "banshee",
            description: "Shows Banshee-44's inventory",
            guildOnly: true,
        })
    }

    async run(msg, _args) {
        msg.reply(await getMods())
    }

    static async bansheeResetDaily(guild) {

        // My Test Server or Lucille
        if (guild.id === "163067125307539457" || guild.id === "721321811324960788") {
            let bansheeEmbed = await getMods()
            const firstGuildChannel = guild.channels.cache.filter(channel => channel.name === "destiny").first()
            firstGuildChannel.send(bansheeEmbed)
        }
    }
}

async function getMods() {

    try {
        const rawResponse = await axios.get("https://b.vlsp.network/vendor/?hash=672118013&defined=true", {
            json: true
        })

        const vendorData = rawResponse.data.Response.sales.data
        const modsData = Object.values(vendorData).filter((vendorItem) => {
            return vendorItem.itemDefinition.itemType === 19
        })

        let bansheeMods = {
            embed: {
                color: 0x0099ff,
                author: {
                    name: "Banshee-44",
                    icon_url: "https://www.bungie.net/pubassets/pkgs/127/127877/NTU_05.jpg?cv=3983621215&av=353636825"
                },
                title: "Banshees Mods",
                description: "Banshee-44 is currently selling",
                fields: [
                    modsData.map((modData) => ({
                        name: modData.itemDefinition.displayProperties.name,
                        value: modData.itemDefinition.itemTypeAndTierDisplayName
                    }))
                ],
                footer: {
                    text: config.discord.footer,
                    icon_url: config.discord.authorAvatarUrl
                }
            }
        }
        return bansheeMods
    } catch (error) {
        throw new Error("Braytech API is not available or not working.")
    }
}