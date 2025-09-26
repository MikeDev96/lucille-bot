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
    // Mock environment variables for testing
    if (!process.env.SPEEDTEST_TOKEN) {
      process.env.SPEEDTEST_TOKEN = 'mock-token-for-testing'
    }

    // Add global error handlers to prevent crashes during testing
    process.on('unhandledRejection', (reason, promise) => {
      console.log('Unhandled Rejection at:', promise, 'reason:', reason)
      // Don't exit the process, just log the error
    })

    process.on('uncaughtException', (error) => {
      console.log('Uncaught Exception:', error.message)
      // Don't exit the process, just log the error
    })

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
      { name: "summon", args: "", requiresVoice: true },
      { name: "clear", args: "", requiresVoice: true },
      { name: "shuffle", args: "", requiresVoice: true },
      { name: "bassboost", args: "off", requiresVoice: true },
      { name: "disconnect", args: "", requiresVoice: true },
      { name: "fastforward", args: "30", requiresVoice: true },
      { name: "voteskip", args: "", requiresVoice: true },
      { name: "reverse", args: "", requiresVoice: true },
      { name: "rewind", args: "30", requiresVoice: true },
      { name: "repeat", args: "one", requiresVoice: true },
      { name: "remove", args: "1", requiresVoice: true },
      { name: "seek", args: "60", requiresVoice: true },
      { name: "jumpqueue", args: "2", requiresVoice: true },
      { name: "speed", args: "1.5", requiresVoice: true },
      { name: "stats", args: "current", requiresVoice: true },
      { name: "radio", args: "capital", requiresVoice: true },
      { name: "wrong", args: "", requiresVoice: true }
    ]

    for (const cmd of musicCommands) {
      await this.testCommand(cmd.name, cmd.args, cmd.requiresVoice)
    }
  }

  async testMiscCommands() {
    const miscCommands = [
      { name: "letmegooglethatforyou", args: "test query", requiresVoice: false },
      { name: "restart", args: "", requiresVoice: false },
      { name: "stocks", args: "track GME", requiresVoice: false },
      { name: "alias", args: "test testalias", requiresVoice: false },
      { name: "yousync", args: "test", requiresVoice: false },
      { name: "speedtest", args: "", requiresVoice: false },
      { name: "calendar", args: "", requiresVoice: false },
      { name: "remind", args: "1h test reminder", requiresVoice: false },
      { name: "leaderboard", args: "", requiresVoice: false },
      { name: "timer", args: "5m test timer", requiresVoice: false },
      { name: "localtime", args: "", requiresVoice: false }
    ]

    for (const cmd of miscCommands) {
      await this.testCommand(cmd.name, cmd.args, cmd.requiresVoice)
    }
  }

  async testFunCommands() {
    const funCommands = [
      { name: "bye", args: "", requiresVoice: true },
      { name: "banga", args: "", requiresVoice: false },
      { name: "tts", args: "test message", requiresVoice: true },
      { name: "tictactoe", args: "@user", requiresVoice: false },
      { name: "amongus", args: "", requiresVoice: false },
      { name: "pp", args: "", requiresVoice: false },
      { name: "gay", args: "@user", requiresVoice: false },
      { name: "connect4", args: "@user", requiresVoice: false },
      { name: "advent calendar", args: "", requiresVoice: false },
      { name: "joke", args: "any", requiresVoice: false },
      { name: "sound", args: "list", requiresVoice: false },
      { name: "boobies", args: "", requiresVoice: false }
    ]

    for (const cmd of funCommands) {
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

      // Test command execution (actually executing)
      const commandExists = !!command.run
      const hasRequiredPermissions = this.checkPermissions(command, mockMessage)
      
      let executionSuccess = false
      let executionError = null
      
      if (commandExists && hasRequiredPermissions) {
        try {
          // Actually execute the command with timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Command execution timeout')), 10000)
          })
          
          await Promise.race([
            command.run(mockMessage, parsedArgs),
            timeoutPromise
          ])
          executionSuccess = true
          console.log(`    ✅ Executed successfully`)
        } catch (error) {
          executionError = error.message
          console.log(`    ❌ Execution failed: ${error.message}`)
        }
      }

      const result = {
        command: testName,
        status: commandExists && hasRequiredPermissions && executionSuccess ? 'passed' : 'failed',
        details: {
          commandExists,
          hasRequiredPermissions,
          parsedArgs: typeof parsedArgs === 'object' ? 'valid' : 'invalid',
          executionSuccess,
          executionError
        },
        timestamp: new Date().toISOString()
      }

      this.testResults.push(result)

      if (result.status === 'failed') {
        this.failedTests.push({
          ...result,
          error: executionError || `Command validation failed: exists=${commandExists}, permissions=${hasRequiredPermissions}`
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
    // Create mock collections that support both Map and Array methods
    const createMockCollection = (items) => {
      const map = new Map(items)
      return {
        ...map,
        find: (fn) => {
          for (const [key, value] of map) {
            if (fn(value, key, map)) return value
          }
          return undefined
        },
        filter: (fn) => {
          const filteredItems = []
          for (const [key, value] of map) {
            if (fn(value, key, map)) filteredItems.push([key, value])
          }
          return createMockCollection(filteredItems)
        },
        map: (fn) => {
          const result = []
          for (const [key, value] of map) {
            result.push(fn(value, key, map))
          }
          return result
        },
        get: (key) => map.get(key),
        set: (key, value) => map.set(key, value),
        has: (key) => map.has(key),
        delete: (key) => map.delete(key),
        clear: () => map.clear(),
        size: map.size,
        forEach: (fn) => map.forEach(fn),
        keys: () => map.keys(),
        values: () => map.values(),
        entries: () => map.entries(),
        firstKey: () => map.keys().next().value, // Add firstKey method for bye command
        first: () => map.values().next().value, // Add first method for wrong command
        [Symbol.iterator]: () => map[Symbol.iterator]()
      }
    }

    const mockChannel = {
      id: '987654321098765432',
      name: 'general',
      send: async (content) => {
        console.log(`    📤 Mock channel send: ${typeof content === 'string' ? content : JSON.stringify(content)}`)
        return { 
          react: async () => {}, 
          delete: async () => {},
          edit: async () => {},
          awaitReactions: async (options) => {
            console.log(`    ⏳ Mock channel send awaitReactions: ${JSON.stringify(options)}`)
            return createMockCollection([]) // Return mock collection with firstKey method
          },
          fetch: async () => ({ id: 'mock-message-id' })
        }
      },
      reply: async (content) => {
        console.log(`    💬 Mock channel reply: ${typeof content === 'string' ? content : JSON.stringify(content)}`)
        return { 
          react: async () => {}, 
          delete: async () => {},
          edit: async () => {},
          awaitReactions: async (options) => {
            console.log(`    ⏳ Mock channel reply awaitReactions: ${JSON.stringify(options)}`)
            return createMockCollection([]) // Return mock collection with firstKey method
          },
          fetch: async () => ({ id: 'mock-message-id' })
        }
      },
      permissionsFor: () => ({
        has: () => true
      }),
      fetch: async () => mockChannel,
      messages: {
        cache: {
          last: () => null
        }
      },
      awaitReactions: async (options) => {
        console.log(`    ⏳ Mock awaitReactions: ${JSON.stringify(options)}`)
        return createMockCollection([]) // Return mock collection with firstKey method
      },
      awaitMessages: async (options) => {
        console.log(`    📨 Mock awaitMessages: ${JSON.stringify(options)}`)
        return createMockCollection([]) // Return mock collection for jumpqueue
      }
    }

    const mockBotMember = {
      id: 'bot-user-id',
      displayName: 'Lucille Bot',
      username: 'Lucille Bot',
      user: {
        id: 'bot-user-id',
        username: 'Lucille Bot',
        displayAvatarURL: () => 'https://example.com/bot-avatar.png',
        tag: 'Lucille Bot#1234'
      },
      voice: null,
      permissions: {
        has: () => true
      },
      roles: {
        cache: createMockCollection([])
      }
    }

    const mockMember = {
      id: 'test-user-id',
      displayName: 'TestUser',
      username: 'TestUser',
      user: {
        id: 'test-user-id',
        username: 'TestUser',
        displayAvatarURL: () => 'https://example.com/avatar.png',
        tag: 'TestUser#1234'
      },
      voice: null, // Will be set after creation
      permissions: {
        has: () => true
      },
      roles: {
        cache: createMockCollection([])
      }
    }

    const mockGuild = {
      id: '123456789012345678',
      name: 'Test Guild',
      systemChannel: mockChannel, // Add systemChannel for TTS command
      client: {
        user: {
          id: 'bot-user-id',
          username: 'Lucille Bot',
          displayAvatarURL: () => 'https://example.com/bot-avatar.png',
          tag: 'Lucille Bot#1234'
        }
      },
      channels: {
        cache: createMockCollection([['987654321098765432', mockChannel]])
      },
      members: {
        cache: createMockCollection([
          ['test-user-id', mockMember],
          ['bot-user-id', mockBotMember]
        ]),
        find: (fn) => {
          // Mock the find method for members
          const members = [mockBotMember, mockMember]
          for (const member of members) {
            if (fn(member)) return member
          }
          return undefined
        }
      },
      roles: {
        everyone: { id: 'everyone-role-id' },
        cache: createMockCollection([])
      },
      emojis: {
        cache: createMockCollection([]),
        create: async (data, name, options) => {
          console.log(`    🎨 Mock emoji create: ${name}`)
          return {
            name: name,
            toString: () => `<:${name}:123456789>`
          }
        },
        find: (fn) => {
          // Mock the find method for emojis
          return undefined
        }
      },
      voiceStates: {
        cache: createMockCollection([
          ['bot-user-id', {
            channelId: '876543210987654321',
            guildId: '123456789012345678',
            member: mockBotMember,
            selfDeaf: false,
            selfMute: false,
            sessionId: 'test-session'
          }]
        ])
      },
      fetch: async () => mockGuild,
      voiceAdapterCreator: () => ({
        sendPayload: () => true,
        destroy: () => {}
      })
    }

    // Create voice channel with members after both members are defined
    const mockVoiceChannel = {
      id: '876543210987654321',
      guild: mockGuild,
      members: createMockCollection([
        ['test-user-id', mockMember],
        ['bot-user-id', mockBotMember]
      ])
    }

    // Add setChannel method to bot member voice as well
    mockBotMember.voice = {
      channel: mockVoiceChannel,
      channelId: '876543210987654321',
      deaf: false,
      mute: false,
      selfDeaf: false,
      selfMute: false,
      setChannel: async (channel) => {
        console.log(`    🔊 Mock bot setChannel: ${channel ? channel.id : 'null'}`)
        if (channel === null) {
          mockBotMember.voice.channel = null
          mockBotMember.voice.channelId = null
        } else {
          mockBotMember.voice.channel = channel
          mockBotMember.voice.channelId = channel.id
        }
      }
    }

    // Now set the voice property
    if (requiresVoice) {
      mockMember.voice = {
        channel: mockVoiceChannel,
        channelId: '876543210987654321',
        deaf: false,
        mute: false,
        selfDeaf: false,
        selfMute: false,
        setChannel: async (channel) => {
          console.log(`    🔊 Mock setChannel: ${channel ? channel.id : 'null'}`)
          if (channel === null) {
            mockMember.voice.channel = null
            mockMember.voice.channelId = null
          } else {
            mockMember.voice.channel = channel
            mockMember.voice.channelId = channel.id
          }
        }
      }
    }

    return {
      content: `;${commandName} ${args}`.trim(),
      author: {
        id: 'test-user-id',
        username: 'TestUser',
        displayAvatarURL: () => 'https://example.com/avatar.png',
        tag: 'TestUser#1234'
      },
      member: mockMember,
      guild: mockGuild,
      channel: mockChannel,
      react: async (emoji) => {
        console.log(`    😀 Mock react: ${emoji}`)
        return Promise.resolve({
          remove: async () => {
            console.log(`    🗑️ Mock reaction removed: ${emoji}`)
          }
        })
      },
      reply: async (content) => {
        console.log(`    💬 Mock reply: ${typeof content === 'string' ? content : JSON.stringify(content)}`)
        return { 
          react: async () => {}, 
          delete: async () => {},
          edit: async () => {},
          awaitReactions: async (options) => {
            console.log(`    ⏳ Mock reply awaitReactions: ${JSON.stringify(options)}`)
            return createMockCollection([]) // Return mock collection with firstKey method
          },
          fetch: async () => ({ id: 'mock-message-id' })
        }
      },
      edit: async (content) => {
        console.log(`    ✏️ Mock edit: ${typeof content === 'string' ? content : JSON.stringify(content)}`)
        return { 
          react: async () => {}, 
          delete: async () => {}
        }
      },
      delete: async () => {
        console.log(`    🗑️ Mock delete message`)
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
