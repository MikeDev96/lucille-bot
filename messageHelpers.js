const Requestee = require("./classes/Requestee")

const getRequestee = msg => new Requestee(msg.member.displayName, msg.author.displayAvatarURL(), msg.author.id)
const getVoiceChannel = msg => msg.member.voice.channel || msg.guild.channels.cache.find(c => c.type === "voice")

module.exports.getRequestee = getRequestee
module.exports.getVoiceChannel = getVoiceChannel