/**
 * Message Schema and Types
 * Shared types for Slack messages and processing
 */

export interface ParsedSlot {
  start: string;  // Format: "HH:MM" or ISO date-time
  end: string;    // Format: "HH:MM" or ISO date-time
  conf: number;   // Confidence score (0-1)
  location?: string;  // Optional location string
}

export interface ParsedMessage {
  user_id: string;
  user_name: string;
  raw_message: string;
  parsed_slots: ParsedSlot[];
  parsed_locations?: string[];  // Array of extracted locations
  timestamp: Date;
  message_id: string;
  channel_id: string;
}

export interface ChannelMessages {
  channel_id: string;
  channel_name: string;
  messages: ParsedMessage[];
}

export interface ValidatedEntry {
  user_id: string;
  user_name: string;
  clean_slots: {
    start: string;
    end: string;
    location?: string;
  }[];
  locations?: string[];  // General locations mentioned by user
  status: 'valid' | 'flagged';
  flags?: string[];
}

export interface QCOutput {
  validated_entries: ValidatedEntry[];
  flagged_entries: ValidatedEntry[];
}

export interface AggregatedResult {
  optimal_times: {
    start: string;
    end: string;
    participants: string[];
    participant_names: string[];
    confidence: number;
    location?: string;  // Optional location for this time slot
  }[];
  optimal_locations?: {
    location: string;
    participants: string[];
    participant_names: string[];
    confidence: number;
  }[];
  participant_count: number;
  response_rate: number;
  status: 'active' | 'completed' | 'expired';
}

export interface EventSession {
  event_id: string;
  channel_id: string;
  channel_name: string;
  initiated_by: string;
  initiated_by_name: string;
  event_text?: string;  // Text parameter from /event start command
  started_at: Date;
  expires_at: Date;
  status: 'active' | 'completed' | 'expired';
  parsed_messages: ParsedMessage[];
  qc_output?: QCOutput;
  aggregated_result?: AggregatedResult;
}

