import { Client, GatewayIntentBits } from "discord.js"
import LucilleClient from "../classes/LucilleClient.js"
import fs from "fs"
import path from "path"

class CommandTester {
  constructor() {
    this.client = null
    this.testResults = []
    this.failedTests = []
  }

  async initialize() {
    // Create a minimal Discord client for testing
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
      ]
    })

    // Initialize LucilleClient
    LucilleClient.Instance.client = this.client
    
    // Register commands (this populates LucilleClient.Instance.commands)
    await LucilleClient.Instance.registerCommands()
  }

  async runAllTests() {
    console.log("🧪 Starting command tests...")
    this.testResults = []
    this.failedTests = []

    // Test different categories of commands
    await this.testMusicCommands()
    await this.testMiscCommands()
    await this.testFunCommands()
    await this.testSystemCommands()

    return {
      total: this.testResults.length,
      passed: this.testResults.filter(r => r.status === 'passed').length,
      failed: this.failedTests.length,
      results: this.testResults,
      failures: this.failedTests
    }
  }

  async testMusicCommands() {
    const musicCommands = [
      { name: "p", args: "test song", requiresVoice: true },
      { name: "pause", args: "", requiresVoice: true },
      { name: "resume", args: "", requiresVoice: true },
      { name: "skip", args: "", requiresVoice: true },
      { name: "volume", args: "50", requiresVoice: true },
      { name: "stop", args: "", requiresVoice: true },
      { name: "fuckoff", args: "", requiresVoice: true },
      { name: "summon", args: "", requiresVoice: true },
      { name: "clear", args: "", requiresVoice: true },
      { name: "shuffle", args: "", requiresVoice: true }
    ]

    for (const cmd of musicCommands) {
      await this.testCommand(cmd.name, cmd.args, cmd.requiresVoice)
    }
  }

  async testMiscCommands() {
    const miscCommands = [
      { name: "stocks", args: "track GME", requiresVoice: false },
      { name: "stocks", args: "list", requiresVoice: false },
      { name: "stocks", args: "add AAPL", requiresVoice: false },
      { name: "speedtest", args: "", requiresVoice: false },
      { name: "timer", args: "5m test timer", requiresVoice: false },
      { name: "remind", args: "1h test reminder", requiresVoice: false }
    ]

    for (const cmd of miscCommands) {
      await this.testCommand(cmd.name, cmd.args, cmd.requiresVoice)
    }
  }

  async testFunCommands() {
    const funCommands = [
      { name: "tts", args: "test message", requiresVoice: true },
      { name: "bye", args: "", requiresVoice: true }
    ]

    for (const cmd of funCommands) {
      await this.testCommand(cmd.name, cmd.args, cmd.requiresVoice)
    }
  }

  async testSystemCommands() {
    const systemCommands = [
      { name: "restart", args: "", requiresVoice: false },
      { name: "alias", args: "test testalias", requiresVoice: false }
    ]

    for (const cmd of systemCommands) {
      await this.testCommand(cmd.name, cmd.args, cmd.requiresVoice)
    }
  }

  async testCommand(commandName, args = "", requiresVoice = false) {
    const testName = `${commandName} ${args}`.trim()
    console.log(`  Testing: ${testName}`)

    try {
      // Find the command
      const command = LucilleClient.Instance.commands.find(c => c.config.name === commandName)
      
      if (!command) {
        throw new Error(`Command '${commandName}' not found`)
      }

      // Create a mock message object
      const mockMessage = this.createMockMessage(commandName, args, requiresVoice)
      
      // Test command parsing
      const parsedArgs = LucilleClient.Instance.parseArguments(command.config.args, args)
      
      if (typeof parsedArgs === "string") {
        // This is an error message from argument parsing
        throw new Error(`Argument parsing failed: ${parsedArgs}`)
      }

      // Test command execution (without actually executing)
      const commandExists = !!command.run
      const hasRequiredPermissions = this.checkPermissions(command, mockMessage)

      const result = {
        command: testName,
        status: commandExists && hasRequiredPermissions ? 'passed' : 'failed',
        details: {
          commandExists,
          hasRequiredPermissions,
          parsedArgs: typeof parsedArgs === 'object' ? 'valid' : 'invalid'
        },
        timestamp: new Date().toISOString()
      }

      this.testResults.push(result)

      if (result.status === 'failed') {
        this.failedTests.push({
          ...result,
          error: `Command validation failed: exists=${commandExists}, permissions=${hasRequiredPermissions}`
        })
      }

    } catch (error) {
      const result = {
        command: testName,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      }
      
      this.testResults.push(result)
      this.failedTests.push(result)
      console.log(`    ❌ Failed: ${error.message}`)
    }
  }

  createMockMessage(commandName, args, requiresVoice) {
    return {
      content: `;${commandName} ${args}`.trim(),
      author: {
        id: 'test-user-id',
        username: 'TestUser',
        displayAvatarURL: () => 'https://example.com/avatar.png'
      },
      member: {
        id: 'test-user-id',
        displayName: 'TestUser',
        voice: requiresVoice ? {
          channel: { id: 'test-voice-channel' },
          channelId: 'test-voice-channel'
        } : null,
        permissions: {
          has: () => true
        }
      },
      guild: {
        id: 'test-guild-id',
        name: 'Test Guild',
        channels: {
          cache: new Map()
        },
        members: {
          cache: new Map()
        },
        roles: {
          everyone: { id: 'everyone-role-id' }
        }
      },
      channel: {
        id: 'test-channel-id',
        name: 'general',
        send: async (content) => {
          console.log(`    Mock channel send: ${typeof content === 'string' ? content : JSON.stringify(content)}`)
          return { react: async () => {}, delete: async () => {} }
        },
        reply: async (content) => {
          console.log(`    Mock channel reply: ${typeof content === 'string' ? content : JSON.stringify(content)}`)
          return { react: async () => {}, delete: async () => {} }
        },
        permissionsFor: () => ({
          has: () => true
        })
      },
      react: async (emoji) => {
        console.log(`    Mock react: ${emoji}`)
      },
      reply: async (content) => {
        console.log(`    Mock reply: ${typeof content === 'string' ? content : JSON.stringify(content)}`)
        return { react: async () => {}, delete: async () => {} }
      }
    }
  }

  checkPermissions(command, mockMessage) {
    try {
      // Check if command requires guild
      if (command.config.guildOnly && !mockMessage.guild) {
        return false
      }

      // Check if command requires voice channel
      if (command.config.requiresVoice && !mockMessage.member.voice) {
        return false
      }

      return true
    } catch (error) {
      return false
    }
  }

  generateReport() {
    const total = this.testResults.length
    const passed = this.testResults.filter(r => r.status === 'passed').length
    const failed = this.failedTests.length

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed,
        successRate: total > 0 ? ((passed / total) * 100).toFixed(2) : 0
      },
      failures: this.failedTests.map(f => ({
        command: f.command,
        error: f.error,
        timestamp: f.timestamp
      })),
      allResults: this.testResults
    }

    return report
  }

  async cleanup() {
    if (this.client) {
      await this.client.destroy()
    }
  }
}

export default CommandTester
