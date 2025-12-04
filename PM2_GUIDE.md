# PM2 Deployment Guide

This guide shows you how to run the Slack bot using PM2 process manager.

## Prerequisites

1. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Set up environment variables:**
   - Make sure your `.env` file is configured with all required tokens

## PM2 Configuration

The PM2 configuration is in `ecosystem.config.cjs`. This file tells PM2:
- Which script to run (`dist/index.js`)
- How many instances to run
- Where to store logs
- Auto-restart settings

## Quick Start Commands

I've added npm scripts for easy PM2 management:

### Start the bot
```bash
npm run pm2:start
```
This will:
1. Build the TypeScript code
2. Start the bot with PM2

### Stop the bot
```bash
npm run pm2:stop
```

### Restart the bot
```bash
npm run pm2:restart
```
This will rebuild and restart

### View logs
```bash
npm run pm2:logs
```

### Check status
```bash
npm run pm2:status
```

### Delete from PM2
```bash
npm run pm2:delete
```

## Manual PM2 Commands

You can also use PM2 commands directly:

```bash
# Start
pm2 start ecosystem.config.cjs

# Stop
pm2 stop sync-slack-bot

# Restart
pm2 restart sync-slack-bot

# Delete
pm2 delete sync-slack-bot

# View logs
pm2 logs sync-slack-bot

# Monitor
pm2 monit

# Save PM2 process list (to auto-start on reboot)
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

## Log Files

Logs are stored in:
- `./logs/pm2-error.log` - Error logs
- `./logs/pm2-out.log` - Output logs

These directories are automatically created when PM2 starts.

## First Time Setup

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Verify your .env file:**
   Make sure all tokens are set correctly

3. **Start with PM2:**
   ```bash
   npm run pm2:start
   ```

4. **Check it's running:**
   ```bash
   npm run pm2:status
   ```

5. **View logs to verify:**
   ```bash
   npm run pm2:logs
   ```

You should see "✅ Bot is running in Socket Mode!" in the logs.

## Updating the Bot

When you make code changes:

1. **Rebuild:**
   ```bash
   npm run build
   ```

2. **Restart:**
   ```bash
   npm run pm2:restart
   ```

Or use the npm script that does both:
```bash
npm run pm2:restart
```

## Auto-Start on Reboot

To make PM2 automatically start your bot when the server reboots:

1. Save the current PM2 process list:
   ```bash
   pm2 save
   ```

2. Generate startup script:
   ```bash
   pm2 startup
   ```
   This will output a command - copy and run it

3. Save again:
   ```bash
   pm2 save
   ```

Now your bot will automatically start on server reboot!

## Monitoring

### Real-time monitoring
```bash
pm2 monit
```

### View detailed info
```bash
pm2 show sync-slack-bot
```

### View logs in real-time
```bash
pm2 logs sync-slack-bot --lines 50
```

## Troubleshooting

### Bot not starting
1. Check logs: `npm run pm2:logs`
2. Verify .env file has correct tokens
3. Make sure you ran `npm run build` first

### Bot keeps crashing
1. Check error logs: `tail -f logs/pm2-error.log`
2. Check PM2 status: `pm2 status`
3. View detailed info: `pm2 show sync-slack-bot`

### Can't connect to Slack
- Verify all tokens in .env are correct
- Check that Socket Mode is enabled in Slack app settings
- See FIX_AUTH_ERROR.md for more help

## Production Tips

1. **Disable watch mode** - Already disabled in ecosystem.config.cjs
2. **Set NODE_ENV** - Already set to 'production'
3. **Monitor memory** - PM2 will restart if memory exceeds 500MB
4. **Save PM2 list** - Run `pm2 save` after confirming it works
5. **Setup startup script** - Run `pm2 startup` for auto-start on reboot

## File Structure

```
sync/
├── ecosystem.config.cjs  ← PM2 configuration file
├── dist/                  ← Built JavaScript (created by npm run build)
├── logs/                  ← PM2 logs (created automatically)
└── .env                   ← Environment variables
```

