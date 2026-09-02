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

// Stamped into the image by CI, so the logs say which build is running.
// Absent in a hand-built image or a local dev run.
if (process.env.APP_COMMIT) {
  const shortSha = process.env.APP_COMMIT.slice(0, 7)
  const subject = process.env.APP_COMMIT_MESSAGE || "(no commit message)"
  console.log(`📦 Build ${shortSha} - ${subject}`)
}

LucilleClient.Instance.connect(process.env.DISCORD_TOKEN)