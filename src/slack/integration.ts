/**
 * Slack Integration Layer
 * Handles Slack API interactions and message scraping
 */

import { WebClient } from '@slack/web-api';
import { ParsedMessage, ChannelMessages } from '../types/message.js';

export class SlackIntegration {
  private client: WebClient;

  constructor(token: string) {
    this.client = new WebClient(token);
  }

  /**
   * Get channel name from channel ID
   */
  async getChannelName(channelId: string): Promise<string> {
    try {
      const result = await this.client.conversations.info({
        channel: channelId,
      });
      return (result.channel as any)?.name || channelId;
    } catch (error) {
      console.error('Error getting channel name:', error);
      return channelId;
    }
  }

  /**
   * Get user name from user ID
   */
  async getUserName(userId: string): Promise<string> {
    try {
      const result = await this.client.users.info({
        user: userId,
      });
      return (result.user as any)?.real_name || (result.user as any)?.name || userId;
    } catch (error) {
      console.error('Error getting user name:', error);
      return userId;
    }
  }

  /**
   * Scrape messages from a channel since a specific timestamp
   */
  async scrapeMessages(
    channelId: string,
    sinceTimestamp: Date
  ): Promise<ChannelMessages> {
    const channelName = await this.getChannelName(channelId);
    const messages: ParsedMessage[] = [];
    let cursor: string | undefined;

    try {
      do {
        const result = await this.client.conversations.history({
          channel: channelId,
          oldest: (sinceTimestamp.getTime() / 1000).toString(),
          cursor: cursor,
          limit: 200,
        });

        if (!result.messages) break;

        for (const msg of result.messages) {
          // Skip bot messages and messages without text
          if (msg.bot_id || msg.subtype || !msg.text) continue;

          const userId = msg.user || '';
          const userName = await this.getUserName(userId);
          const timestamp = msg.ts ? new Date(parseFloat(msg.ts) * 1000) : new Date();

          messages.push({
            user_id: userId,
            user_name: userName,
            raw_message: msg.text,
            parsed_slots: [], // Will be filled by parsing module
            timestamp,
            message_id: msg.ts || '',
            channel_id: channelId,
          });
        }

        cursor = result.response_metadata?.next_cursor;
      } while (cursor);

      // Reverse to get chronological order (oldest first)
      messages.reverse();

      return {
        channel_id: channelId,
        channel_name: channelName,
        messages,
      };
    } catch (error) {
      console.error('Error scraping messages:', error);
      throw error;
    }
  }

  /**
   * Post a message to a channel
   */
  async postMessage(
    channelId: string,
    text: string,
    blocks?: any[]
  ): Promise<void> {
    try {
      await this.client.chat.postMessage({
        channel: channelId,
        text,
        blocks,
      });
    } catch (error) {
      console.error('Error posting message:', error);
      throw error;
    }
  }

  /**
   * Get all messages from a channel (useful for testing)
   */
  async getAllMessages(channelId: string): Promise<ChannelMessages> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return this.scrapeMessages(channelId, weekAgo);
  }
}

