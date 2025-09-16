import { EmbedBuilder, WebhookClient } from "discord.js"

class TestNotifier {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl
    this.webhook = webhookUrl ? new WebhookClient({ url: webhookUrl }) : null
  }

  async sendTestReport(report) {
    if (!this.webhook) {
      console.log("No webhook configured, skipping Discord notification")
      return
    }

    try {
      const embed = this.createTestReportEmbed(report)
      await this.webhook.send({ embeds: [embed] })
      console.log("✅ Test report sent to Discord")
    } catch (error) {
      console.error("❌ Failed to send test report to Discord:", error)
    }
  }

  async sendFailureAlert(failures) {
    if (!this.webhook) {
      console.log("No webhook configured, skipping Discord notification")
      return
    }

    try {
      const embed = this.createFailureAlertEmbed(failures)
      await this.webhook.send({ 
        content: "🚨 **Command Test Failures Detected!**",
        embeds: [embed] 
      })
      console.log("✅ Failure alert sent to Discord")
    } catch (error) {
      console.error("❌ Failed to send failure alert to Discord:", error)
    }
  }

  createTestReportEmbed(report) {
    const { summary, failures } = report
    const color = summary.failed > 0 ? 0xff6b6b : 0x51cf66 // Red if failures, green if all passed

    const embed = new EmbedBuilder()
      .setTitle("🤖 Lucille Bot - Daily Command Test Report")
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: "Lucille Bot Health Monitor" })

    // Summary fields
    embed.addFields([
      {
        name: "📊 Test Summary",
        value: `**Total Tests:** ${summary.total}\n**Passed:** ${summary.passed}\n**Failed:** ${summary.failed}\n**Success Rate:** ${summary.successRate}%`,
        inline: true
      }
    ])

    // Add failure details if any
    if (failures.length > 0) {
      const failureList = failures.slice(0, 10).map(f => 
        `• \`${f.command}\` - ${f.error}`
      ).join('\n')
      
      embed.addFields([
        {
          name: "❌ Failed Commands",
          value: failureList + (failures.length > 10 ? `\n... and ${failures.length - 10} more` : ''),
          inline: false
        }
      ])
    } else {
      embed.addFields([
        {
          name: "✅ All Tests Passed",
          value: "No command failures detected!",
          inline: false
        }
      ])
    }

    return embed
  }

  createFailureAlertEmbed(failures) {
    const embed = new EmbedBuilder()
      .setTitle("🚨 Command Test Failures")
      .setColor(0xff6b6b)
      .setTimestamp()
      .setFooter({ text: "Lucille Bot Health Monitor" })

    const failureList = failures.slice(0, 15).map(f => 
      `• \`${f.command}\` - ${f.error}`
    ).join('\n')

    embed.addFields([
      {
        name: "❌ Failed Commands",
        value: failureList + (failures.length > 15 ? `\n... and ${failures.length - 15} more` : ''),
        inline: false
      },
      {
        name: "🔧 Action Required",
        value: "Please check the bot logs and fix the failing commands.",
        inline: false
      }
    ])

    return embed
  }

  async sendHealthCheck(status) {
    if (!this.webhook) {
      console.log("No webhook configured, skipping Discord notification")
      return
    }

    try {
      const embed = new EmbedBuilder()
        .setTitle("💚 Lucille Bot Health Check")
        .setColor(0x51cf66)
        .setTimestamp()
        .setFooter({ text: "Lucille Bot Health Monitor" })
        .addFields([
          {
            name: "Status",
            value: status,
            inline: false
          }
        ])

      await this.webhook.send({ embeds: [embed] })
      console.log("✅ Health check sent to Discord")
    } catch (error) {
      console.error("❌ Failed to send health check to Discord:", error)
    }
  }
}

export default TestNotifier

