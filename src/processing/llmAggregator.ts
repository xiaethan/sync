/**
 * LLM Aggregation (replaces Python aggregation)
 * Uses OpenAI to pick optimal times/locations from QC output
 */

import OpenAI from 'openai';
import { AggregatedResult, QCOutput } from '../types/message.js';

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export class LLMAggregator {
  private client: OpenAI;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('Missing OPENAI_API_KEY for LLM aggregation');
    }

    this.client = new OpenAI({ apiKey: key });
    this.model = model || DEFAULT_MODEL;
  }

  /**
   * Aggregate using the LLM, returning AggregatedResult shape
   */
  async aggregate(qcOutput: QCOutput, opts?: { eventTitle?: string }): Promise<AggregatedResult> {
    const participantCount = qcOutput.validated_entries.length;
    const prompt = this.buildPrompt(qcOutput, opts?.eventTitle);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a scheduling optimizer. Return ONLY JSON following the schema; no extra text.',
          },
          { role: 'user', content: prompt },
        ],
      });

      const text = this.extractText(response);
      const parsed = this.safeParse(text);

      // Log the response for debugging
      console.log('[LLMAggregator] LLM response:', JSON.stringify(parsed, null, 2));

      const result = this.normalizeResult(parsed, participantCount);

      // Fallback: If LLM returns no optimal times but we have validated entries with slots,
      // try to find a basic overlap programmatically
      if (result.optimal_times.length === 0 && qcOutput.validated_entries.length > 0) {
        const fallbackResult = this.findBasicOverlap(qcOutput);
        if (fallbackResult.optimal_times.length > 0) {
          console.log('[LLMAggregator] Using fallback overlap detection');
          return fallbackResult;
        }
      }

      return result;
    } catch (error) {
      console.error('[LLMAggregator] Error calling OpenAI:', error);
      throw error;
    }
  }

  /**
   * Build a compact prompt from QC output to control token use
   */
  private buildPrompt(qcOutput: QCOutput, eventTitle?: string): string {
    const title = eventTitle || 'Team meeting';
    const entries = qcOutput.validated_entries.slice(0, 50); // guard against very large channels

    const participantsSummary = entries
      .map((entry) => {
        const slots = entry.clean_slots
          .map((s) => `${s.start}-${s.end}${s.location ? ` @ ${s.location}` : ''}`)
          .join('; ');
        const locations = entry.locations && entry.locations.length > 0 ? ` | locations: ${entry.locations.join(', ')}` : '';
        return `${entry.user_name || entry.user_id}: ${slots || 'none'}${locations}`;
      })
      .join('\n');

    return [
      `Event: ${title}`,
      `Participants (validated): ${entries.length}`,
      ``,
      `TASK: Find overlapping time windows where multiple participants are available.`,
      `- Analyze all time slots and find intersections (overlaps) between participants.`,
      `- Even if only 2 people overlap, include that time window.`,
      `- Pick 1-3 optimal time windows that maximize participant count.`,
      `- Prefer 30-120 minute windows. Use 24-hour HH:MM format (e.g., "17:00", "19:30").`,
      `- Calculate confidence as: (number of participants in slot) / (total participants).`,
      `- IMPORTANT: If there are ANY overlapping time slots, you MUST return at least one optimal_time.`,
      `- Only return an empty optimal_times array if there are truly NO overlapping time slots at all.`,
      ``,
      `If location mentions overlap for >=50% of people in a slot, set location on that time slot.`,
      `Also find the best overall location(s) for the meetup by analyzing all location mentions.`,
      `Rank locations by participant count - include locations mentioned by 2+ people.`,
      ``,
      `Output JSON ONLY with these exact keys:`,
      `- optimal_times: array of { start, end, participants (array of user_ids), participant_names (array), confidence (0-1), location? (optional) }`,
      `- optimal_locations: array of { location, participants (array of user_ids), participant_names (array), confidence (0-1) } - REQUIRED if locations are mentioned, sorted by participant count descending`,
      `- participant_count: integer (total number of participants)`,
      `- response_rate: float 0-1 (usually 1.0 if all entries are validated)`,
      `- status: "active"`,
      ``,
      `Validated entries:\n${participantsSummary || 'None'}`,
    ].join('\n');
  }

  /**
   * Extract text content from OpenAI Chat Completions API response
   */
  private extractText(response: any): string {
    // OpenAI Chat Completions API structure: response.choices[0].message.content
    if (response?.choices && response.choices.length > 0) {
      const content = response.choices[0]?.message?.content;
      if (typeof content === 'string') {
        return content;
      }
    }

    throw new Error('LLM response did not contain text output');
  }

  private safeParse(text: string): any {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Failed to parse LLM JSON: ${(error as Error).message}`);
    }
  }

  /**
   * Fallback: Find basic overlap when LLM fails
   */
  private findBasicOverlap(qcOutput: QCOutput): AggregatedResult {
    const allSlots: Array<{
      start: string;
      end: string;
      user_id: string;
      user_name: string;
    }> = [];

    // Collect all slots from all participants
    for (const entry of qcOutput.validated_entries) {
      for (const slot of entry.clean_slots || []) {
        allSlots.push({
          start: slot.start,
          end: slot.end,
          user_id: entry.user_id,
          user_name: entry.user_name || entry.user_id,
        });
      }
    }

    // Find overlaps by comparing all pairs of slots
    const overlaps: Array<{
      start: string;
      end: string;
      participants: string[];
      participant_names: string[];
    }> = [];

    for (let i = 0; i < allSlots.length; i++) {
      for (let j = i + 1; j < allSlots.length; j++) {
        const slot1 = allSlots[i];
        const slot2 = allSlots[j];

        // Skip if same user
        if (slot1.user_id === slot2.user_id) continue;

        // Convert times to minutes for comparison
        const timeToMinutes = (time: string): number => {
          const [h, m] = time.split(':').map(Number);
          return h * 60 + m;
        };

        const start1 = timeToMinutes(slot1.start);
        const end1 = timeToMinutes(slot1.end);
        const start2 = timeToMinutes(slot2.start);
        const end2 = timeToMinutes(slot2.end);

        // Find overlap
        const overlapStart = Math.max(start1, start2);
        const overlapEnd = Math.min(end1, end2);

        if (overlapStart < overlapEnd) {
          // Convert back to time string
          const minutesToTime = (mins: number): string => {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          };

          const overlapStartStr = minutesToTime(overlapStart);
          const overlapEndStr = minutesToTime(overlapEnd);

          // Check if this overlap already exists
          const existing = overlaps.find(
            o => o.start === overlapStartStr && o.end === overlapEndStr
          );

          if (existing) {
            // Add participants if not already included
            if (!existing.participants.includes(slot1.user_id)) {
              existing.participants.push(slot1.user_id);
              existing.participant_names.push(slot1.user_name);
            }
            if (!existing.participants.includes(slot2.user_id)) {
              existing.participants.push(slot2.user_id);
              existing.participant_names.push(slot2.user_name);
            }
          } else {
            overlaps.push({
              start: overlapStartStr,
              end: overlapEndStr,
              participants: [slot1.user_id, slot2.user_id],
              participant_names: [slot1.user_name, slot2.user_name],
            });
          }
        }
      }
    }

    // Sort by number of participants (descending)
    overlaps.sort((a, b) => b.participants.length - a.participants.length);

    // Convert to optimal_times format
    const optimal_times = overlaps.slice(0, 3).map(overlap => ({
      start: overlap.start,
      end: overlap.end,
      participants: overlap.participants,
      participant_names: overlap.participant_names,
      confidence: overlap.participants.length / qcOutput.validated_entries.length,
      location: undefined,
    }));

    return {
      optimal_times,
      optimal_locations: undefined,
      participant_count: qcOutput.validated_entries.length,
      response_rate: 1.0,
      status: 'active',
    };
  }

  /**
   * Normalize/guardrail the result into AggregatedResult shape
   */
  private normalizeResult(data: any, participantCount: number): AggregatedResult {
    const safeTimes = Array.isArray(data?.optimal_times) ? data.optimal_times : [];
    const safeLocations = Array.isArray(data?.optimal_locations) ? data.optimal_locations : [];

    const optimal_times = safeTimes.map((t: any) => ({
      start: t.start,
      end: t.end,
      participants: Array.isArray(t.participants) ? t.participants : [],
      participant_names: Array.isArray(t.participant_names) ? t.participant_names : [],
      confidence: typeof t.confidence === 'number' ? t.confidence : 0,
      location: t.location,
    }));

    const optimal_locations = safeLocations.map((l: any) => ({
      location: l.location,
      participants: Array.isArray(l.participants) ? l.participants : [],
      participant_names: Array.isArray(l.participant_names) ? l.participant_names : [],
      confidence: typeof l.confidence === 'number' ? l.confidence : 0,
    }));

    return {
      optimal_times,
      optimal_locations: optimal_locations.length > 0 ? optimal_locations : undefined,
      participant_count: typeof data?.participant_count === 'number' ? data.participant_count : participantCount,
      response_rate: typeof data?.response_rate === 'number' ? data.response_rate : participantCount > 0 ? 1 : 0,
      status: data?.status === 'completed' ? 'completed' : 'active',
    };
  }
}


