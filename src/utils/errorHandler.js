/**
 * Error handling utilities for Lucille Bot
 * Provides consistent error messages and logging for Discord users
 */

import debug from "./debug.js"

class ErrorHandler {
  /**
   * Send a user-friendly error message to Discord
   * @param {Object} msg - Discord message object
   * @param {string} command - Command name that failed
   * @param {Error} error - The error that occurred
   * @param {string} customMessage - Optional custom error message
   */
  static sendUserError(msg, command, error, customMessage = null) {
    const errorMessage = customMessage || this.getUserFriendlyMessage(error)
    const fullMessage = `❌ **${command}** failed: ${errorMessage}`
    
    debug.error(`Command error for ${command}:`, error)
    
    if (msg && msg.reply) {
      msg.reply(fullMessage)
    } else if (msg && msg.channel && msg.channel.send) {
      msg.channel.send(fullMessage)
    }
  }

  /**
   * Convert technical error messages to user-friendly ones
   * @param {Error} error - The error object
   * @returns {string} User-friendly error message
   */
  static getUserFriendlyMessage(error) {
    const message = error.message.toLowerCase()
    
    // Network/Connection errors
    if (message.includes("econnreset") || message.includes("connection reset")) {
      return "Connection lost - please try again"
    }
    if (message.includes("enotfound") || message.includes("dns")) {
      return "Cannot reach the service - check your internet connection"
    }
    if (message.includes("timeout") || message.includes("etimedout")) {
      return "Request timed out - please try again"
    }
    if (message.includes("econnrefused")) {
      return "Service is currently unavailable"
    }
    
    // Discord API errors
    if (message.includes("missing permissions")) {
      return "Bot doesn't have the required permissions"
    }
    if (message.includes("rate limit")) {
      return "Too many requests - please wait a moment"
    }
    if (message.includes("not found")) {
      return "Resource not found"
    }
    
    // YouTube/Audio errors
    if (message.includes("video unavailable")) {
      return "Video is unavailable or private"
    }
    if (message.includes("age-restricted") || message.includes("sign in to confirm")) {
      return "Video is age-restricted and cannot be played"
    }
    if (message.includes("ebml") || message.includes("format not supported")) {
      return "Audio format not supported"
    }
    if (message.includes("live stream")) {
      return "Live streams are not supported"
    }
    
    // Voice channel errors
    if (message.includes("not in a voice channel")) {
      return "You need to be in a voice channel"
    }
    if (message.includes("not connected")) {
      return "Bot is not connected to a voice channel"
    }
    
    // Generic fallback
    return "An unexpected error occurred - please try again"
  }

  /**
   * Handle async command execution with error catching
   * @param {Function} commandFn - The command function to execute
   * @param {Object} msg - Discord message object
   * @param {string} commandName - Name of the command
   * @param {Array} args - Command arguments
   */
  static async executeCommand(commandFn, msg, commandName, args = []) {
    try {
      await commandFn(msg, args)
    } catch (error) {
      this.sendUserError(msg, commandName, error)
    }
  }

  /**
   * Handle sync command execution with error catching
   * @param {Function} commandFn - The command function to execute
   * @param {Object} msg - Discord message object
   * @param {string} commandName - Name of the command
   * @param {Array} args - Command arguments
   */
  static executeCommandSync(commandFn, msg, commandName, args = []) {
    try {
      commandFn(msg, args)
    } catch (error) {
      this.sendUserError(msg, commandName, error)
    }
  }

  /**
   * Validate voice channel requirements
   * @param {Object} msg - Discord message object
   * @param {boolean} requireBotInChannel - Whether bot must be in a voice channel
   * @returns {Object} Validation result with success boolean and error message
   */
  static validateVoiceChannel(msg, requireBotInChannel = false) {
    // Check if user is in voice channel
    if (!msg.member.voice || !msg.member.voice.channel) {
      return {
        success: false,
        error: "You need to be in a voice channel to use this command"
      }
    }

    // Check if bot is in voice channel (if required)
    if (requireBotInChannel) {
      const guild = msg.guild
      const botMember = guild.members.cache.get(guild.client.user.id)
      if (!botMember.voice.channel) {
        return {
          success: false,
          error: "Bot is not connected to a voice channel"
        }
      }
    }

    return { success: true }
  }

  /**
   * Validate music player state
   * @param {Object} music - Music player instance
   * @param {string} requiredState - Required player state ('playing', 'paused', 'idle')
   * @returns {Object} Validation result with success boolean and error message
   */
  static validateMusicState(music, requiredState = null) {
    if (!music) {
      return {
        success: false,
        error: "Music system is not available"
      }
    }

    if (!music.player) {
      return {
        success: false,
        error: "Music player is not initialized"
      }
    }

    if (requiredState) {
      const currentState = music.player.state.status
      if (requiredState === 'playing' && currentState === 'idle') {
        return {
          success: false,
          error: "Nothing is currently playing"
        }
      }
      if (requiredState === 'paused' && !music.state.pauser) {
        return {
          success: false,
          error: "Music is not paused"
        }
      }
      if (requiredState === 'idle' && currentState !== 'idle') {
        return {
          success: false,
          error: "Music is currently playing"
        }
      }
    }

    return { success: true }
  }
}

export default ErrorHandler
