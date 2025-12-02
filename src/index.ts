/**
 * Main Entry Point
 * Slack Bot for Crowdsourcing Group Availability
 */

// Load environment variables from .env file
import 'dotenv/config';

import { App } from '@slack/bolt';
import { SlackIntegration } from './slack/integration.js';
import { Parser } from './parsing/parser.js';
import { ProcessingPipeline } from './processing/pipeline.js';
import { BotHandler } from './bot/handler.js';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

async function main() {
  console.log('🚀 Starting Slack Bot...\n');

  // Check for required environment variables
  const token = process.env.SLACK_BOT_TOKEN;
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const appToken = process.env.SLACK_APP_TOKEN; // For Socket Mode

  if (!token || !signingSecret) {
    console.error('❌ Missing required environment variables!');
    console.error('\nPlease set the following:');
    console.error('  - SLACK_BOT_TOKEN (from https://api.slack.com/apps)');
    console.error('  - SLACK_SIGNING_SECRET (from https://api.slack.com/apps)');
    console.error('  - SLACK_APP_TOKEN (optional, for Socket Mode)');
    console.error('\nSee README.md for setup instructions.\n');
    process.exit(1);
  }

  // Ensure data directory exists
  const dataDir = './data/processing';
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }

  // Initialize Slack app
  console.log('🔌 Initializing Slack app...');
  const app = new App({
    token,
    signingSecret,
    socketMode: !!appToken,
    appToken: appToken,
  });

  // Initialize components
  console.log('📱 Initializing Slack integration...');
  const slack = new SlackIntegration(token);

  console.log('📝 Initializing parser...');
  const parser = new Parser();

  console.log('⚙️  Initializing processing pipeline...');
  const pipeline = new ProcessingPipeline(dataDir);

  console.log('🤖 Initializing bot handler...');
  const botHandler = new BotHandler(app, slack, parser, pipeline);

  // Start the app
  const port = process.env.PORT || 3000;
  
  if (appToken) {
    // Socket Mode (recommended for development)
    console.log('🔌 Starting in Socket Mode...');
    await app.start();
    console.log('✅ Bot is running in Socket Mode!\n');
  } else {
    // HTTP Mode (requires public URL or ngrok)
    console.log(`🌐 Starting HTTP server on port ${port}...`);
    await app.start(port);
    console.log(`✅ Bot is running on port ${port}!\n`);
    console.log('⚠️  Note: You need a public URL for HTTP mode.');
    console.log('   Consider using Socket Mode (set SLACK_APP_TOKEN) or ngrok.\n');
  }

  console.log('📋 Available commands in Slack:');
  console.log('  - /event start - Begin tracking availability');
  console.log('  - /event status - Check progress');
  console.log('  - /event stop - Stop tracking and show results\n');

  console.log('💡 How it works:');
  console.log('  1. Type /event start in a channel');
  console.log('  2. Team members respond with their availability');
  console.log('  3. Bot automatically finds optimal times\n');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down...');
    await app.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
});
