/**
 * useBookingSync Hook
 * Manages iCal synchronization with external booking platforms
 */
import { useState, useCallback } from 'react';
import { useCalendarStore, Booking } from '@/src/core/stores';
import { iCalParser } from '../services/iCalParser';

interface SyncResult {
    success: boolean;
    newBookings: number;
    errors: string[];
}

export function useBookingSync() {
    const [isSyncing, setIsSyncing] = useState(false);
    const { setBookings, setSyncStatus, bookings } = useCalendarStore();

    /**
     * Sync bookings from an iCal URL
     */
    const syncFromUrl = useCallback(async (
        icalUrl: string,
        source: 'booking' | 'airbnb' | 'other' = 'booking'
    ): Promise<SyncResult> => {
        setIsSyncing(true);
        const errors: string[] = [];
        let newBookings = 0;

        try {
            // Fetch iCal feed
            const response = await fetch(icalUrl);
            if (!response.ok) {
                throw new Error(`Error de red: ${response.status}`);
            }

            const icalText = await response.text();

            // Parse iCal data
            const events = iCalParser.parseICalString(icalText);
            const externalBookings = iCalParser.iCalEventsToBookings(events, source);

            // Merge with existing bookings (avoiding duplicates)
            const existingIds = new Set(bookings.map((b) => b.id));
            const newItems = externalBookings.filter((b) => !existingIds.has(b.id));

            // Keep manual bookings, replace external ones
            const manualBookings = bookings.filter((b) => b.source === 'manual');
            const updatedBookings = [...manualBookings, ...externalBookings];

            setBookings(updatedBookings);
            setSyncStatus(new Date().toISOString(), null);

            newBookings = newItems.length;

            return { success: true, newBookings, errors };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            errors.push(errorMessage);
            setSyncStatus(null, errorMessage);

            return { success: false, newBookings: 0, errors };
        } finally {
            setIsSyncing(false);
        }
    }, [bookings, setBookings, setSyncStatus]);

    /**
     * Add a manual booking
     */
    const addManualBooking = useCallback((booking: Omit<Booking, 'id' | 'source'>) => {
        const newBooking: Booking = {
            ...booking,
            id: `manual-${Date.now()}`,
            source: 'manual',
        };

        useCalendarStore.getState().addBooking(newBooking);
        return newBooking;
    }, []);

    /**
     * Check if a date range conflicts with existing bookings
     */
    const checkConflict = useCallback((
        startDate: string,
        endDate: string,
        excludeId?: string
    ): Booking | null => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (const booking of bookings) {
            if (excludeId && booking.id === excludeId) continue;

            const bookingStart = new Date(booking.startDate);
            const bookingEnd = new Date(booking.endDate);

            // Check for overlap
            if (start < bookingEnd && end > bookingStart) {
                return booking;
            }
        }

        return null;
    }, [bookings]);

    return {
        isSyncing,
        syncFromUrl,
        addManualBooking,
        checkConflict,
    };
}
