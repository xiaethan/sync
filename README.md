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

### 1. Install from Slack App Directory

1. Open your Slack workspace
2. Go to the [Slack App Directory](https://slack.com/apps)
3. Search for "Event Availability Aggregator" or "Event Availability Bot"
4. Click "Add to Slack"
5. Review the permissions and click "Allow" to authorize the app

The app will automatically be added to your workspace with all necessary permissions configured.

### 2. Install Dependencies

After installing the app from the store, you'll need to set up the backend:

```bash
# Node.js dependencies
npm install

# Python dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables (For Self-Hosting)

If you're self-hosting the bot, you'll need to set up environment variables. After installing the app from the Slack App Directory, you can find these tokens in your app's settings:

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your installed "Event Availability Aggregator" app
3. Navigate to **OAuth & Permissions** to find your Bot Token
4. Navigate to **Basic Information** → **App Credentials** to find your Signing Secret
5. Navigate to **Socket Mode** to create an App-Level Token (if using Socket Mode)

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

### 4. Run the Bot

```bash
npm run dev
```

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
├── data/processing/        # Temporary processing files
├── package.json
├── requirements.txt
└── README.md
```

## Module Breakdown

| Module | Author | Responsibilities |
|--------|--------|-----------------|
| **Slack Integration** | Omar | Slack API, message scraping, user/channel info |
| **Bot Handler** | - | Command processing, event management, orchestration |
| **Parsing** | Ethan | Extract time slots from natural language |
| **QC & Aggregation** | - | Quality control and optimal time aggregation |
| **Dashboard** | Eshaan | (Optional) Web dashboard for viewing events |

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

- **Ethan** - Parsing and Normalization (ethanxia@seas.upenn.edu)
- **Omar** - Slack Integration (pareja@seas.upenn.edu)
- **Eshaan** - Dashboard (ekaipa@seas.upenn.edu)

## License

MIT License

