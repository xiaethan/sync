/**
 * Calendar Utility
 * Generates .ics calendar files for events
 */

export interface CalendarEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
}

/**
 * Generate an .ics file content from event data
 */
export function generateICS(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const lines: string[] = [];

  // Header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Sync Bot//Event Calendar//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');

  // Event
  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${Date.now()}-${Math.random().toString(36).substring(2, 11)}@sync-bot`);
  lines.push(`DTSTAMP:${formatDate(new Date())}`);
  lines.push(`DTSTART:${formatDate(event.startTime)}`);
  lines.push(`DTEND:${formatDate(event.endTime)}`);
  lines.push(`SUMMARY:${escapeText(event.title)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }

  // Add attendees if provided
  if (event.attendees && event.attendees.length > 0) {
    for (const attendee of event.attendees) {
      lines.push(`ATTENDEE;CN=${escapeText(attendee)}:mailto:${escapeText(attendee.toLowerCase().replace(/\s+/g, '.'))}@example.com`);
    }
  }

  lines.push('STATUS:CONFIRMED');
  lines.push('SEQUENCE:0');
  lines.push('END:VEVENT');

  // Footer
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Convert time string (HH:MM) to Date object for today
 * If time is in the past, assume it's for tomorrow
 */
export function timeStringToDate(timeStr: string, baseDate?: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = baseDate ? new Date(baseDate) : new Date();
  
  date.setHours(hours, minutes, 0, 0);
  
  // If the time is in the past and no base date specified, assume tomorrow
  if (!baseDate && date < new Date()) {
    date.setDate(date.getDate() + 1);
  }
  
  return date;
}

