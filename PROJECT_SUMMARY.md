# Project Summary - Slack Bot

## Overview

This is a complete Slack bot that crowdsources group availability and automatically finds optimal meeting times. Users type `/event start` in a channel, team members respond with their availability, and the bot automatically processes everything to find the best time for everyone.

## Architecture

```
Slack Channel
    ↓
/event start command
    ↓
Bot Handler (Hugo)
    ↓
Message Scraping (Omar - SlackIntegration)
    ↓
Parsing & Normalization (Ethan)
    ↓
Quality Control (Daniel - Python)
    ↓
Aggregation (Daniel - Python)
    ↓
Results Posted to Slack
```

## Key Features

1. **Simple Slash Commands**: `/event start`, `/event status`, `/event stop`
2. **Automatic Message Collection**: Scrapes all messages since event started
3. **Natural Language Parsing**: Understands phrases like "free after 7pm", "Saturday morning"
4. **Quality Control**: Validates and flags problematic responses
5. **Smart Aggregation**: Finds optimal overlapping times
6. **Real-time Updates**: Posts results as they're discovered

## Module Breakdown

### Omar - Slack Integration (`src/slack/integration.ts`)
- Slack API client setup
- Message scraping from channels
- User and channel info retrieval
- Posting messages back to Slack

### Hugo - Bot Handler (`src/bot/handler.ts`)
- Slash command processing (`/event start`, `/event status`, `/event stop`)
- Event session management
- Message listening and processing
- Orchestrating the pipeline

### Ethan - Parsing (`src/parsing/parser.ts`)
- Extract time slots from natural language
- Handle various time formats (ranges, single times, relative expressions)
- Normalize time formats
- Merge overlapping slots

### Daniel - QC & Aggregation
- **QC** (`src/qc/quality_control.py`): Validates parsed time slots
- **Aggregation** (`src/aggregation/aggregate.py`): Finds optimal overlapping times

### Processing Pipeline (`src/processing/pipeline.ts`)
- Bridges TypeScript and Python modules
- Handles file-based communication
- Executes Python scripts

## File Structure

```
sync/
├── src/
│   ├── slack/              # Omar: Slack API integration
│   ├── bot/                # Hugo: Bot command handlers
│   ├── parsing/            # Ethan: Message parsing
│   ├── qc/                 # Daniel: Quality control (Python)
│   ├── aggregation/        # Daniel: Aggregation (Python)
│   ├── processing/         # TypeScript-Python bridge
│   ├── types/              # Type definitions
│   └── index.ts            # Main entry point
├── data/processing/        # Temporary processing files
├── package.json
├── requirements.txt
├── README.md
└── SETUP.md
```

## How It Works

### 1. Starting an Event
```
User: /event start
Bot: "🎉 Event tracking started! I'm now collecting availability preferences..."
```

### 2. Collecting Responses
Team members respond naturally:
- "I'm free after 7pm Saturday"
- "Available Saturday morning"
- "Can do 2pm - 5pm"

### 3. Automatic Processing
When messages come in:
1. Bot scrapes all messages since event started
2. Parser extracts time slots from each message
3. QC validates the time slots
4. Aggregation finds overlapping times
5. Bot posts updates with optimal times

### 4. Checking Status
```
User: /event status
Bot: Shows current progress and optimal times
```

### 5. Completing Event
```
User: /event stop
Bot: Posts final results with best time and participants
```

## Setup Requirements

1. **Node.js dependencies**: `npm install`
2. **Python dependencies**: `pip install -r requirements.txt`
3. **Slack App Setup**:
   - Create app at api.slack.com/apps
   - Configure bot token scopes
   - Enable Socket Mode
   - Create `/event` slash command
   - Install to workspace

4. **Environment Variables**:
   - `SLACK_BOT_TOKEN`
   - `SLACK_SIGNING_SECRET`
   - `SLACK_APP_TOKEN` (for Socket Mode)

See [SETUP.md](./SETUP.md) for detailed instructions.

## Development

### Running
```bash
npm run dev
```

### Testing
1. Install bot in Slack workspace
2. Invite bot to a channel
3. Test commands in Slack

### Python Modules
Can be tested independently:
```bash
python src/qc/quality_control.py input.json output.json
python src/aggregation/aggregate.py qc_output.json agg_output.json
```

## Data Flow Example

### Input (Slack Messages)
```
User 1: "I'm free after 7pm Saturday"
User 2: "Available Saturday morning"
User 3: "Can do 2pm - 5pm Saturday"
```

### Parsed Output
```json
{
  "user_id": "U123",
  "parsed_slots": [
    {"start": "19:00", "end": "23:00", "conf": 0.9}
  ]
}
```

### QC Output
```json
{
  "validated_entries": [...],
  "flagged_entries": []
}
```

### Aggregated Result
```json
{
  "optimal_times": [
    {
      "start": "19:00",
      "end": "20:00",
      "participants": ["U123"],
      "confidence": 0.33
    }
  ]
}
```

## Team Responsibilities

- **Omar**: Slack Integration Layer
- **Hugo**: Bot Orchestration & Command Handling
- **Ethan**: Parsing & Normalization
- **Daniel**: QC & Aggregation Modules
- **Eshaan**: (Optional) Dashboard for viewing events

## Next Steps

1. **Setup**: Follow SETUP.md to configure Slack app
2. **Test**: Run the bot and test commands
3. **Customize**: Adjust parsing patterns, QC rules, aggregation logic
4. **Deploy**: Deploy to a server for production use

## Notes

- Uses Socket Mode for development (no public URL needed)
- Can switch to HTTP mode for production
- Python modules are called via child_process
- All processing is file-based between TypeScript and Python
- Results are posted back to Slack automatically

