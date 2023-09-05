import dotenv from "dotenv"
import "./classes/LucilleGuild.js"
import LucilleClient from "./classes/LucilleClient.js"

dotenv.config()

LucilleClient.Instance.connect(process.env.DISCORD_TOKEN)