const path = require("path")
const config = require("./config.json")
const express = require("express")
const dotenv = require("dotenv")
const { router: redditRoutes } = require("./classes/RedditRipper")
const { router: tiktokRoutes } = require("./classes/TikTokRipper")
const LucilleClient = require("./classes/LucilleClient")
require("./classes/LucilleGuild")

dotenv.config()

const client = new LucilleClient({
  owner: config.discord.owner,
  commandPrefix: config.discord.prefix,
})

client.registry
  .registerGroup("music", "Music")
  .registerGroup("whitelist", "Whitelist")
  .registerGroup("misc", "Miscellaneous")
  .registerGroup("fun", "Fun")
  .registerDefaults()
  .registerCommandsIn(path.join(__dirname, "commands"))

client.once("ready", () => console.log("Discord client ready"))
client.connect(config.discord.token)

express()
  .use("/", redditRoutes)
  .use("/", tiktokRoutes)
  .listen(process.env.PORT, () => console.log(`Lucille API listening at http://localhost:${process.env.PORT}`))