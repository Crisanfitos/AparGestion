/**
 * iCal Service
 * Manages iCal synchronization configurations and parsing
 */
import { supabase } from '@/src/core/api/supabase';
import { ICalEvent, iCalParser } from './iCalParser';
import { upsertReservationByExternalId } from './reservationService';

export interface IcalSync {
    id: string;
    property_id: string;
    source: 'booking' | 'airbnb' | 'google' | 'vrbo' | 'manual' | 'other';
    ical_url: string;
    last_synced_at?: string;
    sync_status?: 'ok' | 'error' | 'pending' | 'syncing';
    error_message?: string;
    is_active: boolean;
    created_at: string;
}

export interface CreateIcalSyncDTO {
    property_id: string;
    source: IcalSync['source'];
    ical_url: string;
}

export interface IcalSyncResult {
    success: boolean;
    data?: IcalSync[];
    error?: string;
}

/**
 * Get all iCal sync configurations for a property
 */
export async function getIcalSyncs(propertyId: string): Promise<IcalSyncResult> {
    try {
        const { data, error } = await supabase
            .from('ical_syncs')
            .select('*')
            .eq('property_id', propertyId)
            .order('created_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data as IcalSync[] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Create a new iCal sync configuration
 */
export async function createIcalSync(sync: CreateIcalSyncDTO): Promise<{ success: boolean; data?: IcalSync; error?: string }> {
    try {
        // Validate URL
        if (!sync.ical_url.startsWith('http')) {
            return { success: false, error: 'La URL debe comenzar con http o https' };
        }

        const { data, error } = await supabase
            .from('ical_syncs')
            .insert({
                property_id: sync.property_id,
                source: sync.source,
                ical_url: sync.ical_url,
                sync_status: 'pending'
            })
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data as IcalSync };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Delete an iCal sync configuration
 */
export async function deleteIcalSync(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('ical_syncs')
            .delete()
            .eq('id', id);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Fetch and Parse iCal Feed (Mock-safe or Real)
 * Returns the raw events for inspection
 */
export async function fetchAndParseIcal(url: string): Promise<{ success: boolean; events?: ICalEvent[]; rawText?: string; error?: string }> {
    try {
        console.log('Fetching iCal from:', url);
        const response = await fetch(url);

        if (!response.ok) {
            return { success: false, error: `Error HTTP: ${response.status}` };
        }

        const text = await response.text();
        const events = iCalParser.parseICalString(text);

        return { success: true, events, rawText: text };
    } catch (err: any) {
        console.error('Error parsing iCal:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Process an iCal feed and sync it to the database
 */
export async function processIcalFeed(sync: IcalSync): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        // 1. Fetch & Parse
        const result = await fetchAndParseIcal(sync.ical_url);

        if (!result.success || !result.events) {
            return { success: false, count: 0, error: result.error };
        }

        let count = 0;

        // 2. Iterate and Upsert
        const errors: string[] = [];
        for (const event of result.events) {
            if (!event.uid) continue;

            const checkIn = event.dtstart.toISOString().split('T')[0];
            const checkOut = event.dtend.toISOString().split('T')[0];

            // Booking.com specific logic
            // "CLOSED - Not available" -> "Bloqueo Booking.com"
            // But we respect original summary if it's different
            let guestName = event.summary || 'Reserva Externa';
            if (guestName.includes('CLOSED - Not available')) {
                guestName = `Bloqueo ${sync.source.charAt(0).toUpperCase() + sync.source.slice(1)}`;
            }

            console.log(`[iCal Sync] Upserting: ${event.uid} | ${checkIn} -> ${checkOut} | ${guestName}`);

            const upsertResult = await upsertReservationByExternalId({
                property_id: sync.property_id,
                external_id: event.uid,
                guest_name: guestName,
                check_in: checkIn,
                check_out: checkOut,
                status: 'confirmed', // External bookings block the calendar
                source: 'ical',
                num_guests: 1,
                notes: `Event Summary: ${event.summary}\nDescription: ${event.description || ''}`,
            });

            if (upsertResult.success) {
                count++;
                console.log(`[iCal Sync] Success: ${event.uid}`);
            } else {
                console.error(`[iCal Sync] Failed: ${event.uid} - ${upsertResult.error}`);
                errors.push(`${event.uid}: ${upsertResult.error}`);
            }
        }

        if (errors.length > 0) {
            console.error('[iCal Sync] Some events failed:', errors);
        }

        // 3. Update Sync Status
        await supabase
            .from('ical_syncs')
            .update({
                last_sync: new Date().toISOString(),
                sync_status: 'success'
            })
            .eq('id', sync.id);

        return { success: true, count };

    } catch (err: any) {
        // Update Sync Status to Error
        await supabase
            .from('ical_syncs')
            .update({
                last_sync: new Date().toISOString(),
                sync_status: 'error',
                error_message: err.message
            })
            .eq('id', sync.id);

        return { success: false, count: 0, error: err.message };
    }
}

/**
 * Sync all calendars for a property
 */
export async function syncPropertyCalendars(propertyId: string): Promise<{ success: boolean; totalEvents: number; error?: string }> {
    try {
        const { data: syncs, error } = await supabase
            .from('ical_syncs')
            .select('*')
            .eq('property_id', propertyId);

        if (error || !syncs) return { success: false, totalEvents: 0 };

        let total = 0;
        for (const sync of syncs) {
            const result = await processIcalFeed(sync);
            if (result.success) {
                total += result.count;
            }
        }

        return { success: true, totalEvents: total };
    } catch (err: any) {
        return { success: false, totalEvents: 0, error: err.message };
    }
}
