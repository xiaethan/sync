# Troubleshooting Guide

## ✅ Import Issue Fixed!

The import error has been resolved. `npm run dev` should now work.

## Common Issues

### "invalid_auth" Error

This means your Slack tokens are missing or incorrect.

**Check your `.env` file:**
1. Make sure it exists in the project root
2. Make sure all three variables have actual values (not empty)
3. Verify the token formats:
   - `SLACK_BOT_TOKEN=xoxb-...` (starts with `xoxb-`)
   - `SLACK_APP_TOKEN=xapp-...` (starts with `xapp-`)
   - `SLACK_SIGNING_SECRET=...` (long string)

**To fix:**
1. Go to https://api.slack.com/apps
2. Click on your app
3. Get the tokens from:
   - **Bot Token**: Install App → Bot User OAuth Token
   - **Signing Secret**: Basic Information → App Credentials
   - **App Token**: Socket Mode → Create App-Level Token

4. Update your `.env` file with the actual values
5. Restart the bot (`npm run dev`)

### "Command not found" or "npm run dev" fails

**Solution:**
```bash
npm install
```

### Python Module Errors

**Solution:**
```bash
pip install -r requirements.txt
```

### Bot Not Responding in Slack

1. **Check bot is installed**: Go to workspace settings → Apps
2. **Check bot is in channel**: Use `/invite @YourBotName`
3. **Check bot is running**: Look for "✅ Bot is running" in console
4. **Check environment variables**: Make sure `.env` is configured

## Getting Your Tokens

See [SETUP.md](./SETUP.md) for detailed instructions on:
- Creating a Slack app
- Getting all required tokens
- Setting up Socket Mode
- Creating the slash command

## Still Having Issues?

1. Check the console output for specific error messages
2. Verify your `.env` file has actual token values (not empty)
3. Make sure all dependencies are installed: `npm install`
4. Try restarting your terminal/IDE

