/**
 * Debug utility for Lucille Bot
 * Enable debugging by setting DEBUG=true in environment or using --debug flag
 */

class DebugLogger {
  constructor() {
    this.enabled = process.env.DEBUG === 'true' || process.argv.includes('--debug')
    this.prefix = '[DEBUG]'
  }

  log(message, ...args) {
    if (this.enabled) {
      console.log(`${this.prefix} ${message}`, ...args)
    }
  }

  error(message, ...args) {
    if (this.enabled) {
      console.error(`${this.prefix} ERROR: ${message}`, ...args)
    }
  }

  warn(message, ...args) {
    if (this.enabled) {
      console.warn(`${this.prefix} WARN: ${message}`, ...args)
    }
  }

  info(message, ...args) {
    if (this.enabled) {
      console.info(`${this.prefix} INFO: ${message}`, ...args)
    }
  }

  // Music-specific debug methods
  music(message, ...args) {
    this.log(`[MUSIC] ${message}`, ...args)
  }

  audio(message, ...args) {
    this.log(`[AUDIO] ${message}`, ...args)
  }

  stream(message, ...args) {
    this.log(`[STREAM] ${message}`, ...args)
  }

  command(message, ...args) {
    this.log(`[COMMAND] ${message}`, ...args)
  }

  // Check if debug is enabled
  isEnabled() {
    return this.enabled
  }
}

// Create singleton instance
const debug = new DebugLogger()

export default debug
