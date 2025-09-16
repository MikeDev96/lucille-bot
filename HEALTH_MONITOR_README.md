# 🤖 Lucille Bot Health Monitor

Automated testing system that monitors all bot commands and sends Discord notifications when issues are detected.

## 🚀 Quick Setup

1. **Set up Discord webhook**:
   ```bash
   # Set your Discord webhook URL for notifications in your .env file
   DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_WEBHOOK_URL"
   ```

2. **Install the health monitor**:
   ```bash
   npm run setup-monitor
   ```

3. **Test manually**:
   ```bash
   npm run health-check
   ```

## 📋 What It Does

The health monitor automatically:

- ✅ **Tests all bot commands** (music, misc, fun, system) - feel free to add more that might have been missed
- 🔍 **Validates command parsing** and argument handling
- 🛡️ **Checks permissions** and requirements
- 📊 **Generates detailed reports** with success/failure rates
- 🚨 **Sends Discord alerts** when failures are detected
- 📝 **Logs all results** for historical tracking

## 📅 Schedule

- **Daily at 2:00 AM**: Full command test suite runs automatically
- **On-demand**: Run `npm run health-check` anytime for manual testing

## 🔧 Configuration

### Environment Variables

- `DISCORD_WEBHOOK_URL`: Discord webhook for notifications (required for testing)
- `DISCORD_TOKEN`: Bot token (required for testing)
- `DISCORD_CLIENT_ID`: Bot client ID (required for testing)

### Cron Job

The setup script creates a cron job that runs daily:
```bash
0 2 * * * cd /path/to/lucille-bot && node health-monitor.js >> logs/cron.log 2>&1
```

## 📁 File Structure

```
lucille-bot/
├── health-monitor.js           # Main health check script
├── setup-health-monitor.sh     # Setup script
├── src/utils/
│   ├── commandTester.js        # Command testing logic
│   └── testNotifier.js         # Discord notification system
└── logs/
    ├── health-monitor.log      # Test results log
    └── cron.log               # Cron job output
```

## 🧪 Test Coverage

The health monitor tests:

### Music Commands
- `play`, `pause`, `resume`, `skip`, `queue`, `volume`, `stop`, `fuckoff`

### Misc Commands  
- `stocks` (track, list, add), `ping`, `help`

### Fun Commands
- `tts`, `bye`, `8ball`

### System Commands
- `prefix`, `status`

## 📊 Discord Notifications

### Success Report
- ✅ Shows all tests passed
- 📊 Displays success rate and test count
- 💚 Green embed color

### Failure Alert
- 🚨 Shows failed commands
- ❌ Lists specific error messages
- 🔧 Provides action guidance
- 🔴 Red embed color

### Health Check Status
- 💚 Simple status update
- 📅 Timestamped notifications

## 🛠️ Manual Testing

```bash
# Run health check manually
npm run health-check

# View cron job logs
tail -f logs/cron.log

# View health monitor logs
tail -f logs/health-monitor.log

# Check current cron jobs
crontab -l
```

## 🔍 Troubleshooting

### Common Issues

1. **"Command not found" errors**:
   - Check if all command files exist
   - Verify command registration in LucilleClient

2. **Permission errors**:
   - Ensure bot has proper Discord permissions
   - Check voice channel access for music commands

3. **Webhook failures**:
   - Verify DISCORD_WEBHOOK_URL is correct
   - Check webhook permissions in Discord

### Logs

- **Cron logs**: `logs/cron.log` - Cron job execution output
- **Health logs**: `logs/health-monitor.log` - Detailed test results
- **Console output**: Real-time testing feedback

## 🚨 Alert Examples

### Test Failure Alert
```
🚨 Command Test Failures Detected!

❌ Failed Commands:
• play test song - Command validation failed
• stocks track GME - Invalid stock symbol
• tts test message - Voice channel required

🔧 Action Required:
Please check the bot logs and fix the failing commands.
```

### Success Report
```
🤖 Lucille Bot - Daily Command Test Report

📊 Test Summary:
Total Tests: 15
Passed: 15
Failed: 0
Success Rate: 100%

✅ All Tests Passed
No command failures detected!
```

## 🔄 Maintenance

- **Remove cron job**: `crontab -e` (delete the health-monitor line)
- **Update schedule**: Modify the cron expression in `setup-health-monitor.sh`
- **Add new tests**: Extend `CommandTester` class with new command categories

## 📈 Benefits

- 🛡️ **Proactive monitoring** - Catch issues before users do
- 📊 **Performance tracking** - Monitor command reliability over time
- 🚨 **Instant alerts** - Get notified immediately when problems occur
- 📝 **Historical data** - Track bot health trends
- 🔧 **Easy debugging** - Detailed error information for quick fixes
