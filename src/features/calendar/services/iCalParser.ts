/**
 * iCal Parser Service
 * Parses .ics feeds from Booking.com and other OTAs
 */
import type { Booking } from '@/src/core/stores';

export interface ICalEvent {
    uid: string;
    summary: string;
    dtstart: Date;
    dtend: Date;
    description?: string;
}

/**
 * Parse an iCal string into structured events
 * Note: In production, use cal-parser library for robust parsing
 */
export function parseICalString(icalString: string): ICalEvent[] {
    const events: ICalEvent[] = [];

    // Split into individual events
    const eventBlocks = icalString.split('BEGIN:VEVENT');

    for (let i = 1; i < eventBlocks.length; i++) {
        const block = eventBlocks[i];
        const endIndex = block.indexOf('END:VEVENT');
        const eventContent = block.substring(0, endIndex);

        const event = parseEventBlock(eventContent);
        if (event) {
            events.push(event);
        }
    }

    return events;
}

function parseEventBlock(content: string): ICalEvent | null {
    const lines = content.split(/\r?\n/);
    const event: Partial<ICalEvent> = {};

    for (const line of lines) {
        if (line.startsWith('UID:')) {
            event.uid = line.substring(4).trim();
        } else if (line.startsWith('SUMMARY:')) {
            event.summary = line.substring(8).trim();
        } else if (line.startsWith('DTSTART')) {
            event.dtstart = parseICalDate(line);
        } else if (line.startsWith('DTEND')) {
            event.dtend = parseICalDate(line);
        } else if (line.startsWith('DESCRIPTION:')) {
            event.description = line.substring(12).trim();
        }
    }

    if (event.uid && event.dtstart && event.dtend) {
        return event as ICalEvent;
    }

    return null;
}

function parseICalDate(line: string): Date {
    // Extract date value (handles both DATE and DATE-TIME formats)
    const colonIndex = line.indexOf(':');
    const dateStr = line.substring(colonIndex + 1).trim();

    // Format: YYYYMMDD or YYYYMMDDTHHmmssZ
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));

    if (dateStr.length > 8) {
        const hour = parseInt(dateStr.substring(9, 11));
        const minute = parseInt(dateStr.substring(11, 13));
        return new Date(Date.UTC(year, month, day, hour, minute));
    }

    return new Date(year, month, day);
}

/**
 * Convert iCal events to Booking format
 */
export function iCalEventsToBookings(
    events: ICalEvent[],
    source: 'booking' | 'airbnb' | 'other' = 'booking'
): Booking[] {
    return events.map((event) => ({
        id: event.uid,
        propertyId: 'default', // TODO: Map to actual property
        guestName: event.summary || 'Reserva Externa',
        startDate: event.dtstart.toISOString(),
        endDate: event.dtend.toISOString(),
        source,
        status: 'confirmed' as const,
        notes: event.description,
    }));
}

export const iCalParser = {
    parseICalString,
    iCalEventsToBookings,
};
