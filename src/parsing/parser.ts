/**
 * Parsing and Normalization Module
 * Cleans and structures raw text messages
 */

import { ParsedMessage, ParsedSlot } from '../types/message.js';

export class Parser {
  /**
   * Parse a message and extract availability slots
   */
  async parse(message: ParsedMessage): Promise<ParsedMessage> {
    const text = message.raw_message || '';
    const parsedSlots = this.extractTimeSlots(text);

    return {
      ...message,
      parsed_slots: parsedSlots,
    };
  }

  /**
   * Extract time slots from text
   */
  private extractTimeSlots(text: string): ParsedSlot[] {
    const slots: ParsedSlot[] = [];
    const lowerText = text.toLowerCase();

    // Pattern 1: Explicit time ranges "X:XX - Y:YY" or "X:XX to Y:YY"
    const rangePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?\s*[-–—to]\s*(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/gi;
    let match;
    
    while ((match = rangePattern.exec(text)) !== null) {
      const start = this.normalizeTime(match[1], match[2] || '00', match[3] || '');
      const end = this.normalizeTime(match[4], match[5] || '00', match[6] || match[3] || '');
      
      if (start && end) {
        slots.push({
          start,
          end,
          conf: 0.9,
        });
      }
    }

    // Pattern 2: Single time mentions with context
    if (slots.length === 0) {
      const singleTimePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)/gi;
      const timeMatches = [...text.matchAll(singleTimePattern)];
      
      if (timeMatches.length > 0) {
        for (let i = 0; i < timeMatches.length; i++) {
          const match = timeMatches[i];
          const time = this.normalizeTime(match[1], match[2] || '00', match[3] || '');
          
          if (time) {
            // Check for "after", "before", "around" keywords
            const contextStart = Math.max(0, match.index! - 20);
            const contextEnd = Math.min(text.length, match.index! + 30);
            const context = text.substring(contextStart, contextEnd).toLowerCase();
            
            let start = time;
            let end = this.addHours(time, 2); // Default 2-hour window
            
            if (context.includes('after') || context.includes('from')) {
              start = time;
              end = this.addHours(time, 4);
            } else if (context.includes('before') || context.includes('until')) {
              start = this.subtractHours(time, 4);
              end = time;
            } else if (context.includes('around') || context.includes('at')) {
              start = this.subtractHours(time, 1);
              end = this.addHours(time, 2);
            }
            
            slots.push({
              start,
              end,
              conf: 0.7,
            });
          }
        }
      }
    }

    // Pattern 3: Relative time expressions
    if (slots.length === 0) {
      const relativeSlots = this.extractRelativeTimeSlots(text);
      slots.push(...relativeSlots);
    }

    // Pattern 4: Day + time combinations
    const dayTimeSlots = this.extractDayTimeSlots(text);
    if (dayTimeSlots.length > 0) {
      slots.push(...dayTimeSlots);
    }

    // Deduplicate and merge overlapping slots
    return this.deduplicateSlots(slots);
  }

  /**
   * Normalize time string to HH:MM format
   */
  private normalizeTime(hour: string, minute: string, period: string): string {
    let h = parseInt(hour);
    const m = parseInt(minute) || 0;
    const isPM = period.toLowerCase() === 'pm';

    if (isPM && h !== 12) {
      h += 12;
    } else if (!isPM && h === 12) {
      h = 0;
    }

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Add hours to a time string
   */
  private addHours(time: string, hours: number): string {
    const [h, m] = time.split(':').map(Number);
    const newHour = (h + hours) % 24;
    return `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Subtract hours from a time string
   */
  private subtractHours(time: string, hours: number): string {
    const [h, m] = time.split(':').map(Number);
    let newHour = h - hours;
    if (newHour < 0) newHour += 24;
    return `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Extract relative time slots (e.g., "tonight", "tomorrow morning")
   */
  private extractRelativeTimeSlots(text: string): ParsedSlot[] {
    const slots: ParsedSlot[] = [];
    const lowerText = text.toLowerCase();
    
    // "Tonight" -> 19:00 - 23:00
    if (lowerText.includes('tonight')) {
      slots.push({ start: '19:00', end: '23:00', conf: 0.8 });
    }
    
    // "Tomorrow morning" -> 08:00 - 12:00
    if (lowerText.includes('tomorrow') && lowerText.includes('morning')) {
      slots.push({ start: '08:00', end: '12:00', conf: 0.8 });
    }
    
    // "Tomorrow afternoon" -> 12:00 - 17:00
    if (lowerText.includes('tomorrow') && lowerText.includes('afternoon')) {
      slots.push({ start: '12:00', end: '17:00', conf: 0.8 });
    }
    
    // "Tomorrow evening" -> 17:00 - 22:00
    if (lowerText.includes('tomorrow') && lowerText.includes('evening')) {
      slots.push({ start: '17:00', end: '22:00', conf: 0.8 });
    }

    // "Saturday morning" -> 08:00 - 12:00
    if (lowerText.includes('saturday') && lowerText.includes('morning')) {
      slots.push({ start: '08:00', end: '12:00', conf: 0.7 });
    }

    // "Saturday afternoon" -> 12:00 - 17:00
    if (lowerText.includes('saturday') && lowerText.includes('afternoon')) {
      slots.push({ start: '12:00', end: '17:00', conf: 0.7 });
    }

    // "Saturday evening" -> 17:00 - 22:00
    if (lowerText.includes('saturday') && lowerText.includes('evening')) {
      slots.push({ start: '17:00', end: '22:00', conf: 0.7 });
    }

    return slots;
  }

  /**
   * Extract day + time combinations
   */
  private extractDayTimeSlots(text: string): ParsedSlot[] {
    const slots: ParsedSlot[] = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of days) {
      if (text.toLowerCase().includes(day)) {
        // Default to afternoon/evening if day mentioned
        slots.push({ start: '14:00', end: '20:00', conf: 0.6 });
      }
    }

    return slots;
  }

  /**
   * Deduplicate and merge overlapping slots
   */
  private deduplicateSlots(slots: ParsedSlot[]): ParsedSlot[] {
    if (slots.length === 0) return [];

    // Sort by start time
    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    const merged: ParsedSlot[] = [];
    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      
      // If overlapping or adjacent, merge
      if (next.start <= current.end) {
        current.end = current.end > next.end ? current.end : next.end;
        current.conf = Math.max(current.conf, next.conf);
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    
    merged.push(current);
    return merged;
  }
}

