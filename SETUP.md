# Quick Setup Guide - Slack Bot

## Prerequisites

- Node.js 18+ or Bun 1.0+
- Python 3.8+
- A Slack workspace where you can install apps

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
pip install -r requirements.txt
```

### 2. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Name your app: `Event Availability Bot` (or any name)
4. Select your workspace
5. Click **"Create App"**

### 3. Configure Bot Token Scopes

1. Go to **"OAuth & Permissions"** in the sidebar
2. Scroll down to **"Scopes"** → **"Bot Token Scopes"**
3. Add the following scopes:
   - `app_mentions:read`
   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `commands`
   - `groups:history`
   - `im:history`
   - `im:read`
   - `mpim:history`
   - `mpim:read`
   - `users:read`

### 4. Enable Socket Mode (Recommended for Development)

1. Go to **"Socket Mode"** in the sidebar
2. Toggle **"Enable Socket Mode"** to ON
3. Click **"Create App-Level Token"**
4. Name it: `socket-mode-token`
5. Add scope: `connections:write`
6. Click **"Generate"**
7. **COPY THIS TOKEN** (starts with `xapp-`) - you'll need it!

### 5. Create the Slash Command

1. Go to **"Slash Commands"** in the sidebar
2. Click **"Create New Command"**
3. Fill in:
   - **Command**: `/event`
   - **Request URL**: (leave empty - Socket Mode doesn't need this)
   - **Short Description**: `Start tracking event availability`
   - **Usage Hint**: `start | status | stop`
4. Click **"Save"**

### 6. Install the App to Your Workspace

1. Go to **"Install App"** (or "OAuth & Permissions" → "Install to Workspace")
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**
4. **COPY THESE TOKENS**:
   - Bot User OAuth Token (starts with `xoxb-`)
   - Signing Secret (under "Basic Information" → "App Credentials")

### 7. Get Your Tokens

You should now have:
1. **Bot Token** (`xoxb-...`) - from "Install App"
2. **Signing Secret** - from "Basic Information" → "App Credentials"
3. **App Token** (`xapp-...`) - from "Socket Mode" (if enabled)

### 8. Set Environment Variables

Create a `.env` file in the project root:

```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_APP_TOKEN=xapp-your-app-token-here
```

Or export them in your terminal:

```bash
export SLACK_BOT_TOKEN="xoxb-your-bot-token"
export SLACK_SIGNING_SECRET="your-signing-secret"
export SLACK_APP_TOKEN="xapp-your-app-token"
```

### 9. Find Your Bot Name

The bot name appears in several places:

**Option 1: In Slack App Settings**
1. Go to your Slack app: https://api.slack.com/apps
2. Click on your app
3. Go to **"App Home"** in the sidebar
4. Under **"Your App's Presence in Slack"**, you'll see:
   - **Display Name**: This is what you'll use (e.g., "Event Availability Bot")
   - **Default Username**: This is the @ mention name (e.g., "@eventavailabilitybot")

**Option 2: In Your Workspace**
1. After installing the app, go to your Slack workspace
2. Type `/apps` in any channel
3. Look for your bot in the list - the name shown there is what you'll use

**Option 3: After Running the Bot**
1. After you start the bot (`npm run dev`), it will appear in your workspace
2. You can see its name in the Apps section or when you type `@` in a channel

### 10. Invite Bot to a Channel

1. Open any Slack channel
2. Type: `/invite @YourBotName` (use the Display Name or Default Username from above)
   - Example: `/invite @eventavailabilitybot`
   - Or: `/invite @Event Availability Bot`
3. The bot will join the channel

**Tip**: Start typing `@` in the channel and you should see your bot appear in the autocomplete list!

### 11. Run the Bot

```bash
npm run dev
```

You should see:
```
🚀 Starting Slack Bot...
✅ Bot is running in Socket Mode!
```

### 12. Test It!

In your Slack channel, type:
```
/event start
```

The bot should respond and start tracking availability!

## Troubleshooting

### Bot Not Responding

- **Check bot is installed**: Go to your workspace settings → Apps → make sure your bot is installed
- **Check bot is in channel**: Use `/invite @YourBotName` to invite it
- **Check environment variables**: Make sure all three tokens are set correctly
- **Check logs**: Look for error messages in the console

### "Command Not Found"

- Make sure you created the `/event` slash command in the app settings
- Wait a few minutes after creating the command (Slack needs to sync)
- Try typing `/event` to see if it appears in the autocomplete

### "Permission Denied" or "Missing Scope"

- Go back to "OAuth & Permissions" and make sure all scopes are added
- Reinstall the app to your workspace (this applies the new scopes)

### Bot Can't Read Messages

- Make sure `channels:history` scope is added
- Make sure bot is actually in the channel (`/invite @YourBotName`)
- For private channels, make sure bot is added as a member

## Testing the Bot

1. **Start an event**: `/event start`
2. **Post availability**: 
   - "I'm free after 7pm Saturday"
   - "Available Saturday morning"
3. **Check status**: `/event status`
4. **Stop event**: `/event stop`

## Next Steps

- Customize parsing patterns in `src/parsing/parser.ts`
- Adjust QC rules in `src/qc/quality_control.py`
- Modify aggregation algorithm in `src/aggregation/aggregate.py`

## Need Help?

Check the main [README.md](./README.md) for detailed documentation.

