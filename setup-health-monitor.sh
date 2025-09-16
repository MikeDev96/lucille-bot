#!/bin/bash

# Lucille Bot Health Monitor Setup Script
# This script sets up the cron job for automated command testing

echo "🤖 Setting up Lucille Bot Health Monitor..."

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEALTH_SCRIPT="$SCRIPT_DIR/health-monitor.js"

# Make the health monitor script executable
chmod +x "$HEALTH_SCRIPT"

# Create logs directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/logs"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if DISCORD_WEBHOOK_URL is set
if [ -z "$DISCORD_WEBHOOK_URL" ]; then
    echo "⚠️  DISCORD_WEBHOOK_URL environment variable is not set."
    echo "   Discord notifications will be disabled."
    echo "   To enable notifications, set DISCORD_WEBHOOK_URL in your environment."
fi

# Create cron job entry
CRON_JOB="0 2 * * * cd $SCRIPT_DIR && node $HEALTH_SCRIPT >> $SCRIPT_DIR/logs/cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "health-monitor.js"; then
    echo "📝 Cron job already exists. Updating..."
    # Remove existing cron job
    crontab -l 2>/dev/null | grep -v "health-monitor.js" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Health monitor cron job installed successfully!"
echo "📅 The bot will be tested daily at 2:00 AM"
echo "📁 Logs will be saved to: $SCRIPT_DIR/logs/"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove the cron job: crontab -e (then delete the health-monitor line)"
echo ""
echo "🧪 You can test the health monitor manually by running:"
echo "   node $HEALTH_SCRIPT"
