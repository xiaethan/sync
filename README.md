# Slack Bot - Event Availability Aggregator

A Slack bot that crowdsources group availability and automatically finds optimal meeting times. Just use `/event start` and let the bot collect responses, process them through QC, and aggregate the best options!

## Features

- **Simple Commands**: `/event start` to begin tracking availability
- **Automatic Scraping**: Collects messages from the channel automatically
- **Smart Parsing**: Extracts time preferences from natural language
- **Quality Control**: Validates and flags problematic responses
- **Optimal Aggregation**: Finds the best overlapping times across all participants
- **Real-time Updates**: Posts results as they're discovered

## Quick Start

> **Note**: We're working on getting this app published to the Slack App Directory, but the approval process takes time. In the meantime, you can install the app manually by following the instructions below.

### 1. Set Up Slack App Manually

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "Event Availability Aggregator")
4. Select your workspace

### 2. Configure OAuth & Permissions

**Bot Token Scopes** (OAuth & Permissions → Scopes):
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

### 3. Enable Socket Mode (Recommended)

1. Go to **Socket Mode** in your app settings
2. Toggle "Enable Socket Mode" ON
3. Create an app-level token with `connections:write` scope
4. Copy the token (starts with `xapp-`)

### 4. Create Slash Command

1. Go to **Slash Commands** in your app settings
2. Click "Create New Command"
3. Fill in:
   - Command: `/event`
   - Request URL: (leave empty for Socket Mode)
   - Short description: "Start tracking event availability"
   - Usage hint: `start | status | stop`
4. Save

### 5. Install App to Workspace

1. Go to **Install App** (or OAuth & Permissions)
2. Click "Install to Workspace"
3. Authorize the app

### 6. Install Dependencies

Install the required dependencies for the backend:

```bash
# Node.js dependencies
npm install

# Python dependencies
pip install -r requirements.txt
```

### 7. Set Environment Variables

You'll need to set up environment variables. After creating and installing the app, you can find these tokens in your app's settings:

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your "Event Availability Aggregator" app
3. Navigate to **OAuth & Permissions** to find your Bot Token
4. Navigate to **Basic Information** → **App Credentials** to find your Signing Secret
5. Navigate to **Socket Mode** to find your App-Level Token (if using Socket Mode)

Create a `.env` file:

```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token  # For Socket Mode
```

Or export them:

```bash
export SLACK_BOT_TOKEN="xoxb-your-bot-token"
export SLACK_SIGNING_SECRET="your-signing-secret"
export SLACK_APP_TOKEN="xapp-your-app-token"
```

### 8. Run the Bot

**Development Mode:**
```bash
npm run dev
```

**Production Mode (with PM2):**
```bash
npm run pm2:start
```

For more information on PM2 deployment, see the [Deployment with PM2](#deployment-with-pm2) section below.

## Usage

### Starting an Event

In any Slack channel:

```
/event start
```

The bot will respond and start tracking availability messages.

### Responding with Availability

Team members can respond in natural language:

```
I'm free after 7pm on Saturday
Available Saturday morning
Free anytime Saturday afternoon
Can do 2pm - 5pm
```

The bot automatically parses these and finds overlaps.

### Checking Status

```
/event status
```

Shows current progress and optimal times found so far.

### Stopping an Event

```
/event stop
```

Stops tracking and posts final results.

## Example Flow

1. **Organizer**: `/event start`
   - Bot: "🎉 Event tracking started! I'm now collecting availability preferences..."

2. **Team members respond**:
   - "Free after 7pm Saturday"
   - "Available Saturday morning"
   - "Can do 2pm - 5pm Saturday"

3. **Bot automatically**:
   - Scrapes messages
   - Parses time slots
   - Runs QC validation
   - Aggregates overlaps
   - Posts updates: "📊 Update: Found 2 optimal time(s)! 🎯 Best so far: 19:00 - 20:00 (3 people)"

4. **Organizer**: `/event status`
   - Shows all optimal times with participant lists

5. **Organizer**: `/event stop`
   - Posts final results: "✅ Event Complete! 🎯 Best Time: 19:00 - 20:00"

## Architecture

```
Slack Channel
    ↓
Bot Handler (/event start)
    ↓
Message Scraping (SlackIntegration)
    ↓
Parsing & Normalization (Parser)
    ↓
Quality Control (Python QC Module)
    ↓
Aggregation (Python Aggregation Module)
    ↓
Results Posted to Slack
```

## Project Structure

```
sync/
├── src/
│   ├── slack/              # Slack API integration
│   ├── bot/                # Bot command handlers
│   ├── parsing/            # Message parsing
│   ├── qc/                 # Quality control (Python)
│   ├── aggregation/        # Aggregation (Python)
│   ├── processing/         # TypeScript-Python bridge
│   └── types/              # Type definitions
├── data/
│   └── processing/         # Temporary processing files (JSON inputs/outputs for QC & aggregation)
├── package.json
├── requirements.txt
└── README.md
```

## Development

### Running in Development

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

## Deployment with PM2

This application is deployed using PM2, a production process manager for Node.js applications. PM2 keeps the application running in the background, automatically restarts it if it crashes, and provides useful monitoring tools.

### Prerequisites

Install PM2 globally if you haven't already:

```bash
npm install -g pm2
```

### Starting the Application

Build the project and start it with PM2:

```bash
npm run pm2:start
```

This will:
1. Build the TypeScript code to JavaScript
2. Start the application using PM2 with the configuration in `ecosystem.config.cjs`
3. Run the bot in production mode

### Managing the Application

**Check Status:**
```bash
npm run pm2:status
# or
pm2 status
```

**View Logs:**
```bash
npm run pm2:logs
# or
pm2 logs sync-slack-bot
```

**Restart the Application:**
```bash
npm run pm2:restart
# or
pm2 restart sync-slack-bot
```

**Stop the Application:**
```bash
npm run pm2:stop
# or
pm2 stop sync-slack-bot
```

**Delete from PM2:**
```bash
npm run pm2:delete
# or
pm2 delete sync-slack-bot
```

### PM2 Configuration

The PM2 configuration is defined in `ecosystem.config.cjs`. The application is configured to:
- Run in production mode
- Auto-restart on crashes (up to 10 times)
- Log errors and output to `./logs/pm2-error.log` and `./logs/pm2-out.log`
- Restart if memory usage exceeds 500MB
- Run a single instance in fork mode

### Monitoring

PM2 provides several useful monitoring commands:

```bash
# Real-time monitoring
pm2 monit

# View detailed information
pm2 show sync-slack-bot

# View logs with timestamps
pm2 logs sync-slack-bot --timestamp
```

### Testing Python Modules

```bash
python src/qc/quality_control.py input.json output.json
python src/aggregation/aggregate.py qc_output.json agg_output.json
```

## Troubleshooting

### Bot Not Responding

- Check that the bot is installed to your workspace
- Verify environment variables are set correctly
- Check bot token has correct scopes

### Messages Not Being Processed

- Ensure bot has `channels:history` scope
- Make sure bot is in the channel (invite with `/invite @YourBot`)
- Check that `/event start` was used first

### Python Module Errors

```bash
# Verify Python is installed
python3 --version

# Reinstall dependencies
pip install -r requirements.txt
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token (starts with `xoxb-`) | Yes |
| `SLACK_SIGNING_SECRET` | Signing Secret from app settings | Yes |
| `SLACK_APP_TOKEN` | App-Level Token for Socket Mode (starts with `xapp-`) | Recommended |
| `PORT` | HTTP server port (if not using Socket Mode) | Optional |

## Team Members

- **Ethan** - Slack Integration (ethanxia@seas.upenn.edu)
- **Omar** - QC (pareja@seas.upenn.edu)
- **Eshaan** - Aggregation (ekaipa@seas.upenn.edu)

