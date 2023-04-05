import express from "express"
import dotenv from "dotenv"
import { router as redditRoutes } from "./classes/RedditRipper.js"
// import { router as tiktokRoutes } from "./classes/TikTokRipper.js"
import "./classes/LucilleGuild.js"
import { Client, Events, GatewayIntentBits } from "discord.js"

dotenv.config()

// const client = new LucilleClient({
//   owner: process.env.DISCORD_OWNER,
//   commandPrefix: process.env.DISCORD_PREFIX,
//   partials: ["USER", "REACTION", "MESSAGE"],
// })

// client.registry
//   .registerGroup("music", "Music")
//   .registerGroup("whitelist", "Whitelist")
//   .registerGroup("misc", "Miscellaneous")
//   .registerGroup("fun", "Fun")
//   .registerDefaults()

// client.importCommands()
// client.once("ready", () => console.log("Discord client ready"))
// client.connect(process.env.DISCORD_TOKEN)

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] })

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`)
})

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN)

express()
  .use("/", redditRoutes)
  // .use("/", tiktokRoutes)
  .listen(process.env.PORT, () => console.log(`Lucille API listening at http://localhost:${process.env.PORT}`))