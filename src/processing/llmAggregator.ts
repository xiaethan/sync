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

    return this.normalizeResult(parsed, participantCount);
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
      `Pick 1-3 optimal time windows that maximize participant count.`,
      `Prefer 30-120 minute windows. Use 24-hour HH:MM.`,
      `If no overlap exists, return an empty list.`,
      `If location mentions overlap for >=50% of people in a slot, set location.`,
      `Also find the best overall location(s) for the meetup by analyzing all location mentions.`,
      `Rank locations by participant count - include locations mentioned by 2+ people.`,
      `Output JSON ONLY with keys:`,
      `optimal_times: [{ start, end, participants (user_ids), participant_names, confidence (0-1), location? }],`,
      `optimal_locations: [{ location, participants (user_ids), participant_names, confidence (0-1) }] - REQUIRED if locations are mentioned, sorted by participant count descending,`,
      `participant_count (int), response_rate (0-1), status ("active").`,
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


