import express from "express"
import dotenv from "dotenv"
import { router as redditRoutes } from "./classes/RedditRipper.js"
import { router as tiktokRoutes } from "./classes/TikTokRipper.js"
import LucilleClient from "./classes/LucilleClient.js"
import "./classes/LucilleGuild.js"

dotenv.config()

const client = new LucilleClient({
  owner: process.env.DISCORD_OWNER,
  commandPrefix: process.env.DISCORD_PREFIX,
  partials: ["USER", "REACTION", "MESSAGE"],
})

client.registry
  .registerGroup("music", "Music")
  .registerGroup("whitelist", "Whitelist")
  .registerGroup("misc", "Miscellaneous")
  .registerGroup("fun", "Fun")
  .registerDefaults()

client.importCommands()
client.once("ready", () => console.log("Discord client ready"))
client.connect(process.env.DISCORD_TOKEN)

express()
  .use("/", redditRoutes)
  .use("/", tiktokRoutes)
  .listen(process.env.PORT, () => console.log(`Lucille API listening at http://localhost:${process.env.PORT}`))