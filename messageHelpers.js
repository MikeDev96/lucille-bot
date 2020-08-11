const Requestee = require("./classes/Requestee")
const Music = require("./classes/Music")

const getRequestee = msg => new Requestee(msg.member.displayName, msg.author.displayAvatarURL(), msg.author.id)
const getVoiceChannel = msg => msg.member.voice.channel || msg.guild.channels.cache.find(c => c.type === "voice")
const getMusic = msg => msg.channel.guild.lucille || (msg.channel.guild.lucille = new Music(msg.channel))

module.exports.getRequestee = getRequestee
module.exports.getVoiceChannel = getVoiceChannel
module.exports.getMusic = getMusic