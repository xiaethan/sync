# Fixing "invalid_auth" Error

Your tokens are set in the `.env` file and look correctly formatted. The `invalid_auth` error usually means one of these issues:

## Common Causes

### 1. **App-Level Token is Invalid or Revoked**

The error happens when connecting via Socket Mode, which means the `SLACK_APP_TOKEN` might be:
- Expired
- Revoked
- Generated with wrong scopes

**Fix:**
1. Go to https://api.slack.com/apps
2. Click on your app
3. Go to **"Socket Mode"** in the sidebar
4. **Delete the old app-level token**
5. Click **"Create App-Level Token"**
6. Name it: `socket-mode-token`
7. Add scope: `connections:write`
8. Click **"Generate"**
9. Copy the NEW token (starts with `xapp-`)
10. Update your `.env` file with the new token
11. Restart the bot

### 2. **Socket Mode Not Enabled**

**Fix:**
1. Go to https://api.slack.com/apps
2. Click on your app
3. Go to **"Socket Mode"** in the sidebar
4. Make sure **"Enable Socket Mode"** toggle is ON
5. If it's off, turn it ON

### 3. **Bot Token is Invalid or App Not Installed**

**Fix:**
1. Go to https://api.slack.com/apps
2. Click on your app
3. Go to **"Install App"** (or "OAuth & Permissions")
4. Make sure the app is installed to your workspace
5. If not, click **"Install to Workspace"** and authorize
6. Copy the NEW Bot User OAuth Token (it might have changed)
7. Update your `.env` file with the new token
8. Restart the bot

### 4. **App-Level Token Missing `connections:write` Scope**

**Fix:**
1. Go to https://api.slack.com/apps
2. Click on your app
3. Go to **"Socket Mode"** → **"App-Level Tokens"**
4. Check your token's scopes
5. It MUST have `connections:write` scope
6. If not, delete it and create a new one with the correct scope

## Step-by-Step: Regenerate All Tokens

If nothing else works, regenerate all tokens:

### Step 1: Get New Bot Token
1. Go to https://api.slack.com/apps
2. Click your app
3. **"Install App"** → **"Reinstall to Workspace"**
4. Copy the new Bot User OAuth Token

### Step 2: Get New App-Level Token
1. In your app settings
2. **"Socket Mode"** → **"App-Level Tokens"**
3. Delete the old token
4. Click **"Create App-Level Token"**
5. Name: `socket-mode-token`
6. Scope: `connections:write`
7. Generate and copy

### Step 3: Update .env File
Update your `.env` file with the new tokens:
```bash
SLACK_BOT_TOKEN=xoxb-your-new-bot-token
SLACK_APP_TOKEN=xapp-your-new-app-token
SLACK_SIGNING_SECRET=your-signing-secret  # This usually doesn't change
```

### Step 4: Restart Bot
```bash
# Stop the bot (Ctrl+C)
npm run dev
```

## Quick Check: Verify Socket Mode Setup

Run this to see what might be missing:
```bash
node check-tokens.js
```

## Still Not Working?

1. **Double-check token formats** - Make sure there are no extra spaces or quotes
2. **Check Slack app status** - Make sure the app isn't suspended
3. **Try without Socket Mode** - Temporarily remove `SLACK_APP_TOKEN` to test HTTP mode (requires public URL)
4. **Check Slack status** - Visit https://status.slack.com

## Need More Help?

The error message shows it's failing at Socket Mode connection. Most likely:
- App-level token is invalid → Regenerate it
- Socket Mode not enabled → Enable it in settings
- Token missing scope → Create new token with `connections:write`

