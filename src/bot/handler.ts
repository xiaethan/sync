/**
 * Slack Bot Handler
 * Main bot logic for /event start command and message processing
 */

import bolt from '@slack/bolt';
const { App } = bolt;
import type { SlashCommand } from '@slack/bolt';
import { SlackIntegration } from '../slack/integration.js';
import { Parser } from '../parsing/parser.js';
import { ProcessingPipeline } from '../processing/pipeline.js';
import { EventSession, ParsedMessage, ChannelMessages, AggregatedResult } from '../types/message.js';
import { v4 as uuidv4 } from 'uuid';
import { generateICS, timeStringToDate, CalendarEvent } from '../utils/calendar.js';

type AppInstance = InstanceType<typeof App>;

export class BotHandler {
  private app: AppInstance;
  private slack: SlackIntegration;
  private parser: Parser;
  private pipeline: ProcessingPipeline;
  private activeEvents: Map<string, EventSession> = new Map();

  constructor(
    app: AppInstance,
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
    this.app.command('/event', async ({ command, ack }: { command: SlashCommand; ack: () => Promise<void> }) => {
      await ack();

      const [action, ...args] = command.text.split(' ');

      if (action === 'start') {
        // Extract text parameter (everything after "start")
        // Handle both quoted and unquoted text
        let textParam = args.join(' ').trim();
        
        // Remove surrounding quotes if present
        if ((textParam.startsWith('"') && textParam.endsWith('"')) ||
            (textParam.startsWith("'") && textParam.endsWith("'"))) {
          textParam = textParam.slice(1, -1);
        }
        
        await this.handleEventStart(command.channel_id, command.user_id, textParam);
      } else if (action === 'status') {
        await this.handleEventStatus(command.channel_id);
      } else if (action === 'stop' || action === 'end') {
        await this.handleEventStop(command.channel_id);
      } else {
        await this.slack.postMessage(
          command.channel_id,
          'Unknown command. Use `/event start` to begin tracking availability.'
        );
      }
    });

    // Listen for messages in channels with active events
    this.app.message(async ({ message }: { message: any }) => {
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

    // Handle button actions (for calendar)
    this.app.action('add_to_calendar', async ({ ack, action, body, respond }: any) => {
      await ack();
      
      try {
        const actionBody = action as any;
        const eventData = JSON.parse(actionBody.value);
        const channelId = (body as any).channel?.id;
        
        if (!channelId) {
          await respond({ text: 'Error: Could not determine channel.', response_type: 'ephemeral' });
          return;
        }

        await this.handleAddToCalendar(
          eventData,
          channelId,
          (body as any).user?.id
        );

        await respond({
          text: '📅 Calendar event generated! Check the channel for the .ics file.',
          response_type: 'ephemeral',
        });
      } catch (error) {
        console.error('Error handling calendar action:', error);
        await respond({
          text: '❌ Error generating calendar file. Please try again.',
          response_type: 'ephemeral',
        });
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
    textParam?: string
  ): Promise<void> {
    // Check if there's already an active event
    const existingEvent = this.findActiveEvent(channelId);
    if (existingEvent) {
      await this.slack.postMessage(
        channelId,
        `There's already an active event tracking availability. Use \`/event status\` to check progress.`
      );
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
      event_text: textParam || undefined,
      started_at: new Date(),
      expires_at: expiresAt,
      status: 'active',
      parsed_messages: [],
    };

    this.activeEvents.set(eventId, event);

    // Post the text parameter if provided, then confirm parser started
    if (textParam && textParam.trim()) {
      await this.slack.postMessage(
        channelId,
        `<!channel> ${textParam}\n\n(authored by <@${userId}>)`
      );
    }
  }

  /**
   * Handle /event status command
   */
  private async handleEventStatus(channelId: string): Promise<void> {
    const event = this.findActiveEvent(channelId);

    if (!event) {
      await this.slack.postMessage(
        channelId,
        'No active event in this channel. Use `/event start` to begin tracking availability.'
      );
      return;
    }

    const messageCount = event.parsed_messages.length;
    
    // Count unique users who have sent parsed messages
    const uniqueUsers = new Set(event.parsed_messages.map(msg => msg.user_id));
    const uniqueUserCount = uniqueUsers.size;
    
    let statusText = `📊 Event Status\n\n`;
    statusText += `• Messages collected: ${messageCount}\n`;
    statusText += `• People's texts parsed: ${uniqueUserCount}\n`;
    statusText += `• Started by: ${event.initiated_by_name}\n`;

    if (event.aggregated_result) {
      const result = event.aggregated_result;
      statusText += `• Participants: ${result.participant_count}\n\n`;
      
      if (result.optimal_times.length > 0) {
        statusText += `✅ **Optimal Times Found:**\n\n`;
        result.optimal_times.slice(0, 3).forEach((time, idx) => {
          statusText += `${idx + 1}. ${time.start} - ${time.end}`;
          if (time.location) {
            statusText += ` 📍 ${time.location}`;
          }
          statusText += `\n`;
          statusText += `   👥 ${time.participant_names.join(', ')}\n`;
          statusText += `   📈 ${(time.confidence * 100).toFixed(0)}% coverage\n\n`;
        });
      } else {
        statusText += `⏳ Still collecting responses...\n`;
      }

      // Show optimal locations if available
      if (result.optimal_locations && result.optimal_locations.length > 0) {
        statusText += `📍 **Optimal Locations:**\n\n`;
        result.optimal_locations.slice(0, 3).forEach((loc, idx) => {
          statusText += `${idx + 1}. ${loc.location}\n`;
          statusText += `   👥 ${loc.participant_names.join(', ')}\n`;
          statusText += `   📈 ${(loc.confidence * 100).toFixed(0)}% coverage\n\n`;
        });
      }
    } else {
      statusText += `\n⏳ Processing messages...\n`;
    }

    await this.slack.postMessage(channelId, statusText);
  }

  /**
   * Handle /event stop or /event end command
   */
  private async handleEventStop(channelId: string): Promise<void> {
    const event = this.findActiveEvent(channelId);

    if (!event) {
      await this.slack.postMessage(
        channelId,
        'No active event in this channel.'
      );
      return;
    }

    // Process the event one final time before ending
    await this.processEvent(event.event_id);
    
    // Get the updated event (results may have changed)
    const updatedEvent = this.activeEvents.get(event.event_id);
    if (updatedEvent) {
      event.aggregated_result = updatedEvent.aggregated_result;
      event.qc_output = updatedEvent.qc_output;
    }

    event.status = 'completed';
    this.activeEvents.set(event.event_id, event);

    // Use the new QC and aggregate function to output best result
    if (event.parsed_messages.length > 0) {
      await this.processAndOutputBestResult(event.parsed_messages, channelId);
    } else {
      await this.slack.postMessage(
        channelId,
        '<!channel> Event ended, Output: No messages were collected. Make sure team members have posted their availability.'
      );
    }
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
          const locationText = bestTime.location ? ` 📍 ${bestTime.location}` : '';
          await this.slack.postMessage(
            event.channel_id,
            `📊 **Update:** Found ${aggregatedResult.optimal_times.length} optimal time(s)!\n🎯 **Best so far:** ${bestTime.start} - ${bestTime.end}${locationText} (${bestTime.participant_names.length} people)`
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

  /**
   * QC and Aggregate function
   * Takes parsed messages, runs QC and aggregation, and returns the best result
   */
  async qcAndAggregate(parsedMessages: ParsedMessage[], channelId: string): Promise<{
    bestTime?: { start: string; end: string; participants: string[]; participant_names: string[]; location?: string };
    allOptimalTimes: AggregatedResult['optimal_times'];
    optimalLocations?: AggregatedResult['optimal_locations'];
    participantCount: number;
  }> {
    try {
      // Prepare channel messages format for pipeline
      const channelName = await this.slack.getChannelName(channelId);
      const channelMessages: ChannelMessages = {
        channel_id: channelId,
        channel_name: channelName,
        messages: parsedMessages,
      };

      // Run through QC and Aggregation pipeline
      const { qcOutput, aggregatedResult } = await this.pipeline.process(channelMessages);

      // Get the best optimal time (first one, as they're sorted by participant count and confidence)
      const bestTime = aggregatedResult.optimal_times.length > 0 
        ? aggregatedResult.optimal_times[0] 
        : undefined;

      return {
        bestTime: bestTime ? {
          start: bestTime.start,
          end: bestTime.end,
          participants: bestTime.participants,
          participant_names: bestTime.participant_names,
          location: bestTime.location,
        } : undefined,
        allOptimalTimes: aggregatedResult.optimal_times,
        optimalLocations: aggregatedResult.optimal_locations,
        participantCount: aggregatedResult.participant_count,
      };
    } catch (error) {
      console.error('Error in QC and Aggregation:', error);
      throw error;
    }
  }

  /**
   * Process messages and output best result to channel
   */
  async processAndOutputBestResult(
    parsedMessages: ParsedMessage[],
    channelId: string
  ): Promise<void> {
    try {
      const result = await this.qcAndAggregate(parsedMessages, channelId);

      if (result.bestTime) {
        // Format time for display (e.g., "10:00" -> "10AM", "14:00" -> "2PM")
        const formatTime = (time: string): string => {
          const [hours, minutes] = time.split(':').map(Number);
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
          const displayMinutes = minutes > 0 ? `:${String(minutes).padStart(2, '0')}` : '';
          return `${displayHour}${displayMinutes}${period}`;
        };

        const startTime = formatTime(result.bestTime.start);
        const endTime = formatTime(result.bestTime.end);
        const participantNames = result.bestTime.participant_names.join(', ');
        const locationText = result.bestTime.location ? `\n📍 **Location:** ${result.bestTime.location}` : '';

        let message = `<!channel> 🎯 **Best Overall Result:**\n\n` +
          `⏰ **Time:** ${startTime} - ${endTime}${locationText}\n` +
          `👥 **Available:** ${participantNames}\n` +
          `📊 **Participants:** ${result.participantCount} people`;

        // Add optimal locations section if available
        if (result.optimalLocations && result.optimalLocations.length > 0) {
          const bestLocation = result.optimalLocations[0];
          message += `\n\n📍 **Best Location:** ${bestLocation.location} (${bestLocation.participant_names.length} people: ${bestLocation.participant_names.join(', ')})`;
        }

        // Get event text for calendar title
        const event = this.findActiveEvent(channelId);
        const eventTitle = event?.event_text || 'Team Meeting';

        // Create calendar button with event data
        const calendarButton = {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📅 Add to Calendar',
                emoji: true,
              },
              style: 'primary',
              action_id: 'add_to_calendar',
              value: JSON.stringify({
                title: eventTitle,
                start: result.bestTime.start,
                end: result.bestTime.end,
                location: result.bestTime.location,
                participants: result.bestTime.participant_names,
              }),
            },
          ],
        };

        await this.slack.postMessage(channelId, message, [calendarButton]);
      } else {
        await this.slack.postMessage(
          channelId,
          '<!channel> ❌ No optimal time found. Make sure team members have posted their availability with valid time slots.'
        );
      }
    } catch (error) {
      console.error('Error processing and outputting best result:', error);
      await this.slack.postMessage(
        channelId,
        '❌ Error processing messages. Please try again.'
      );
    }
  }

  /**
   * Handle add to calendar button click
   */
  private async handleAddToCalendar(
    eventData: {
      title: string;
      start: string;
      end: string;
      location?: string;
      participants?: string[];
    },
    channelId: string,
    userId?: string
  ): Promise<void> {
    try {
      // Convert time strings to Date objects
      // Use tomorrow as base date to ensure it's in the future
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const startDate = timeStringToDate(eventData.start, tomorrow);
      const endDate = timeStringToDate(eventData.end, tomorrow);
      
      // Ensure end time is after start time
      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }

      // Create calendar event
      const calendarEvent: CalendarEvent = {
        title: eventData.title,
        description: `Participants: ${eventData.participants?.join(', ') || 'Team members'}`,
        startTime: startDate,
        endTime: endDate,
        location: eventData.location,
        attendees: eventData.participants,
      };

      // Generate .ics file
      const icsContent = generateICS(calendarEvent);

      // Upload to Slack
      const filename = `${eventData.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.ics`;
      await this.slack.uploadFile(channelId, icsContent, filename, eventData.title);
    } catch (error) {
      console.error('Error generating calendar file:', error);
      throw error;
    }
  }
}

