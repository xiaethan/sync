# Environment Variables Setup

## ✅ .env File Created!

The `.env` file has been created in your project root. Now you need to fill it in with your Slack app credentials.

## Required Variables

Open the `.env` file and add your values:

```bash
SLACK_BOT_TOKEN=        # Your bot token (starts with xoxb-)
SLACK_SIGNING_SECRET=   # Your signing secret
SLACK_APP_TOKEN=        # Your app token for Socket Mode (starts with xapp-)
```

## Where to Find These Values

### 1. SLACK_BOT_TOKEN (Required)
- Go to your Slack app: https://api.slack.com/apps
- Click on your app
- Go to **"Install App"** (or "OAuth & Permissions")
- Under **"Bot User OAuth Token"**, you'll see a token starting with `xoxb-`
- Copy this entire token

### 2. SLACK_SIGNING_SECRET (Required)
- In your Slack app settings
- Go to **"Basic Information"** in the sidebar
- Scroll down to **"App Credentials"**
- Copy the **"Signing Secret"**

### 3. SLACK_APP_TOKEN (Recommended)
- In your Slack app settings
- Go to **"Socket Mode"** in the sidebar
- Make sure Socket Mode is enabled
- If you haven't created an app-level token yet:
  - Click **"Create App-Level Token"**
  - Name it: `socket-mode-token`
  - Add scope: `connections:write`
  - Click **"Generate"**
- Copy the token (starts with `xapp-`)

## Example .env File

Your `.env` file should look like this (with your actual values):

```bash
SLACK_BOT_TOKEN=xoxb-1234567890-1234567890123-abcdefghijklmnopqrstuvwx
SLACK_SIGNING_SECRET=1234567890abcdef1234567890abcdef
SLACK_APP_TOKEN=xapp-1-A1234567890-1234567890123-abcdefghijklmnopqrstuvwxyz
```

## Important Notes

1. **Never commit `.env` to git** - It's already in `.gitignore`
2. **Keep tokens secret** - Don't share them publicly
3. **Socket Mode is recommended** for development - No need for public URLs
4. **All three tokens are required** for the bot to work

## Next Steps

1. Fill in your `.env` file with the values above
2. Save the file
3. Run `npm install` to install the dotenv package
4. Run `npm run dev` to start the bot

## Troubleshooting

### "Missing required environment variables" error
- Make sure all three variables are set in your `.env` file
- Make sure there are no spaces around the `=` sign
- Make sure you saved the `.env` file
- Try restarting your terminal/IDE

### Bot not connecting
- Double-check that your tokens are correct
- Make sure you copied the entire token (they're long!)
- Verify Socket Mode is enabled in your Slack app
- Check that the app is installed to your workspace

## Need Help?

See [SETUP.md](./SETUP.md) for detailed step-by-step instructions on creating the Slack app and getting these tokens.

