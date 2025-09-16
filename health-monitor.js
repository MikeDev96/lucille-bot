#!/usr/bin/env node

import dotenv from "dotenv"
import CommandTester from "./src/utils/commandTester.js"
import TestNotifier from "./src/utils/testNotifier.js"
import fs from "fs"
import path from "path"

// Load environment variables
dotenv.config()

class BotHealthMonitor {
  constructor() {
    this.tester = new CommandTester()
    this.notifier = new TestNotifier(process.env.DISCORD_WEBHOOK_URL)
    this.logFile = path.join(process.cwd(), "logs", "health-monitor.log")
  }

  async runHealthCheck() {
    console.log("🏥 Starting Lucille Bot Health Check...")
    console.log(`📅 ${new Date().toISOString()}`)

    try {
      this.ensureLogDirectory()

      await this.tester.initialize()

      const testResults = await this.tester.runAllTests()

      const report = this.tester.generateReport()

      this.logResults(report)

      await this.handleNotifications(report)

      await this.tester.cleanup()

      console.log("✅ Health check completed successfully")
      return report

    } catch (error) {
      console.error("❌ Health check failed:", error)
      await this.handleError(error)
      throw error
    }
  }

  async handleNotifications(report) {
    const { summary } = report

    if (summary.failed > 0) {
      console.log(`🚨 ${summary.failed} test failures detected, sending alert...`)
      await this.notifier.sendFailureAlert(report.failures)
    } else {
      console.log("✅ All tests passed, sending success report...")
      await this.notifier.sendTestReport(report)
    }

    const status = summary.failed > 0 
      ? `❌ ${summary.failed} failures detected` 
      : `✅ All ${summary.total} tests passed (${summary.successRate}% success rate)`
    
    await this.notifier.sendHealthCheck(status)
  }

  async handleError(error) {
    if (this.notifier) {
      try {
        await this.notifier.sendFailureAlert([{
          command: "Health Check System",
          error: error.message,
          timestamp: new Date().toISOString()
        }])
      } catch (notifyError) {
        console.error("Failed to send error notification:", notifyError)
      }
    }
  }

  logResults(report) {
    const logEntry = {
      timestamp: report.timestamp,
      summary: report.summary,
      failures: report.failures.length,
      failuresList: report.failures.map(f => f.command)
    }

    const logLine = JSON.stringify(logEntry) + "\n"
    
    try {
      fs.appendFileSync(this.logFile, logLine)
      console.log(`📝 Results logged to ${this.logFile}`)
    } catch (error) {
      console.error("Failed to write log file:", error)
    }
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile)
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
  }

  static async cronJob() {
    const monitor = new BotHealthMonitor()
    try {
      await monitor.runHealthCheck()
      process.exit(0)
    } catch (error) {
      console.error("Cron job failed:", error)
      process.exit(1)
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  BotHealthMonitor.cronJob()
}

export default BotHealthMonitor
