/**
 * Slack Bot Handler
 * Main bot logic for /event start command and message processing
 */

import { App } from '@slack/bolt';
import { SlackIntegration } from '../slack/integration.js';
import { Parser } from '../parsing/parser.js';
import { ProcessingPipeline } from '../processing/pipeline.js';
import { EventSession } from '../types/message.js';
import { v4 as uuidv4 } from 'uuid';

export class BotHandler {
  private app: App;
  private slack: SlackIntegration;
  private parser: Parser;
  private pipeline: ProcessingPipeline;
  private activeEvents: Map<string, EventSession> = new Map();

  constructor(
    app: App,
    slack: SlackIntegration,
    parser: Parser,
    pipeline: ProcessingPipeline
  ) {
    this.app = app;
    this.slack = slack;
    this.parser = parser;
    this.pipeline = pipeline;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle /event start command
    this.app.command('/event', async ({ command, ack, respond }) => {
      await ack();

      const [action, ...args] = command.text.split(' ');

      if (action === 'start') {
        await this.handleEventStart(command.channel_id, command.user_id, respond);
      } else if (action === 'status') {
        await this.handleEventStatus(command.channel_id, respond);
      } else if (action === 'stop') {
        await this.handleEventStop(command.channel_id, respond);
      } else {
        await respond({
          text: 'Unknown command. Use `/event start` to begin tracking availability.',
        });
      }
    });

    // Listen for messages in channels with active events
    this.app.message(async ({ message }) => {
      // Skip bot messages, edits, and other subtypes
      if (!('channel' in message) || !('user' in message) || message.subtype) {
        return;
      }

      // Skip messages from bots
      if ('bot_id' in message && message.bot_id) {
        return;
      }

      const channelId = message.channel;
      const activeEvent = this.findActiveEvent(channelId);

      if (activeEvent) {
        // Trigger a full reprocess of all messages since event started
        // This ensures we capture all messages, not just new ones
        // Use debouncing to avoid processing too frequently
        this.debouncedProcessEvent(activeEvent.event_id);
      }
    });
  }

  // Debounce event processing to avoid too many API calls
  private processEventTimers: Map<string, NodeJS.Timeout> = new Map();
  
  private debouncedProcessEvent(eventId: string): void {
    // Clear existing timer for this event
    const existingTimer = this.processEventTimers.get(eventId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.processEvent(eventId);
      this.processEventTimers.delete(eventId);
    }, 3000); // Wait 3 seconds after last message

    this.processEventTimers.set(eventId, timer);
  }

  /**
   * Handle /event start command
   */
  private async handleEventStart(
    channelId: string,
    userId: string,
    respond: any
  ): Promise<void> {
    // Check if there's already an active event
    const existingEvent = this.findActiveEvent(channelId);
    if (existingEvent) {
      await respond({
        text: `There's already an active event tracking availability. Use \`/event status\` to check progress.`,
      });
      return;
    }

    // Create new event session
    const eventId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const userName = await this.slack.getUserName(userId);
    const channelName = await this.slack.getChannelName(channelId);

    const event: EventSession = {
      event_id: eventId,
      channel_id: channelId,
      channel_name: channelName,
      initiated_by: userId,
      initiated_by_name: userName,
      started_at: new Date(),
      expires_at: expiresAt,
      status: 'active',
      parsed_messages: [],
    };

    this.activeEvents.set(eventId, event);

    await respond({
      text: `🎉 Event tracking started!\n\nI'm now collecting availability preferences from this channel. Just respond with your available times (e.g., "free after 7pm", "available Saturday morning", etc.) and I'll automatically find the best time for everyone.\n\nUse \`/event status\` to check progress.`,
    });
  }

  /**
   * Handle /event status command
   */
  private async handleEventStatus(channelId: string, respond: any): Promise<void> {
    const event = this.findActiveEvent(channelId);

    if (!event) {
      await respond({
        text: 'No active event in this channel. Use `/event start` to begin tracking availability.',
      });
      return;
    }

    const messageCount = event.parsed_messages.length;
    let statusText = `📊 Event Status\n\n`;
    statusText += `• Messages collected: ${messageCount}\n`;
    statusText += `• Started by: ${event.initiated_by_name}\n`;

    if (event.aggregated_result) {
      const result = event.aggregated_result;
      statusText += `• Participants: ${result.participant_count}\n\n`;
      
      if (result.optimal_times.length > 0) {
        statusText += `✅ **Optimal Times Found:**\n\n`;
        result.optimal_times.slice(0, 3).forEach((time, idx) => {
          statusText += `${idx + 1}. ${time.start} - ${time.end}\n`;
          statusText += `   👥 ${time.participant_names.join(', ')}\n`;
          statusText += `   📈 ${(time.confidence * 100).toFixed(0)}% coverage\n\n`;
        });
      } else {
        statusText += `⏳ Still collecting responses...\n`;
      }
    } else {
      statusText += `\n⏳ Processing messages...\n`;
    }

    await respond({ text: statusText });
  }

  /**
   * Handle /event stop command
   */
  private async handleEventStop(channelId: string, respond: any): Promise<void> {
    const event = this.findActiveEvent(channelId);

    if (!event) {
      await respond({
        text: 'No active event in this channel.',
      });
      return;
    }

    event.status = 'completed';
    this.activeEvents.set(event.event_id, event);

    // Post final results
    if (event.aggregated_result && event.aggregated_result.optimal_times.length > 0) {
      const result = event.aggregated_result;
      const bestTime = result.optimal_times[0];

      await this.slack.postMessage(
        channelId,
        `✅ **Event Complete!**\n\n🎯 **Best Time:** ${bestTime.start} - ${bestTime.end}\n👥 **Available:** ${bestTime.participant_names.join(', ')}\n📈 **Coverage:** ${(bestTime.confidence * 100).toFixed(0)}%`
      );
    }

    await respond({
      text: 'Event tracking stopped. Final results posted to channel.',
    });
  }

  /**
   * Process an event: scrape messages, parse, QC, aggregate
   */
  private async processEvent(eventId: string): Promise<void> {
    const event = this.activeEvents.get(eventId);
    if (!event) return;

    try {
      // Scrape all messages since event started
      const channelMessages = await this.slack.scrapeMessages(
        event.channel_id,
        event.started_at
      );

      // Parse all messages
      const parsedMessages = [];
      for (const msg of channelMessages.messages) {
        const parsed = await this.parser.parse(msg);
        parsedMessages.push(parsed);
      }

      // Update event with parsed messages
      event.parsed_messages = parsedMessages;
      channelMessages.messages = parsedMessages;

      // Run through QC and Aggregation pipeline
      const { qcOutput, aggregatedResult } = await this.pipeline.process(channelMessages);

      // Update event with results
      event.qc_output = qcOutput;
      event.aggregated_result = aggregatedResult;

      this.activeEvents.set(eventId, event);

      // Post update if we have results
      if (aggregatedResult.optimal_times.length > 0) {
        const bestTime = aggregatedResult.optimal_times[0];
        if (aggregatedResult.participant_count >= 2) {
          await this.slack.postMessage(
            event.channel_id,
            `📊 **Update:** Found ${aggregatedResult.optimal_times.length} optimal time(s)!\n🎯 **Best so far:** ${bestTime.start} - ${bestTime.end} (${bestTime.participant_names.length} people)`
          );
        }
      }
    } catch (error) {
      console.error(`Error processing event ${eventId}:`, error);
    }
  }

  /**
   * Find active event for a channel
   */
  private findActiveEvent(channelId: string): EventSession | undefined {
    for (const event of this.activeEvents.values()) {
      if (event.channel_id === channelId && event.status === 'active') {
        return event;
      }
    }
    return undefined;
  }

  /**
   * Get active events (for debugging/admin)
   */
  getActiveEvents(): EventSession[] {
    return Array.from(this.activeEvents.values()).filter(
      event => event.status === 'active'
    );
  }
}

