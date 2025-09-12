import dotenv from "dotenv"

// Load environment variables FIRST, before any other imports
dotenv.config()

import "./classes/LucilleGuild.js"
import LucilleClient from "./classes/LucilleClient.js"
import debug from "./utils/debug.js"

if (debug.isEnabled()) {
  console.log("🐛 Debug mode ENABLED - Detailed logging active")
} else {
  console.log("🚀 Debug mode DISABLED - Use 'npm run dev:debug' to enable")
}

LucilleClient.Instance.connect(process.env.DISCORD_TOKEN)