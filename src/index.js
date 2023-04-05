import express from "express"
import dotenv from "dotenv"
import { router as redditRoutes } from "./classes/RedditRipper.js"
// import { router as tiktokRoutes } from "./classes/TikTokRipper.js"
import "./classes/LucilleGuild.js"
import { lucilleClient } from "./classes/LucilleClient.js"

dotenv.config()

lucilleClient.connect(process.env.DISCORD_TOKEN)

express()
  .use("/", redditRoutes)
  // .use("/", tiktokRoutes)
  .listen(process.env.PORT, () => console.log(`Lucille API listening at http://localhost:${process.env.PORT}`))