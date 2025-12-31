/**
 * Calendar Store - Zustand
 * Manages bookings and iCal sync state
 */
import { create } from 'zustand';

export interface Booking {
    id: string;
    propertyId: string;
    guestName: string;
    startDate: string;
    endDate: string;
    source: 'manual' | 'booking' | 'airbnb' | 'other';
    status: 'confirmed' | 'pending' | 'cancelled' | 'checked-in';
    totalPrice?: number;
    notes?: string;
}

interface CalendarState {
    bookings: Booking[];
    isLoading: boolean;
    lastSyncDate: string | null;
    syncError: string | null;

    // Actions
    setBookings: (bookings: Booking[]) => void;
    addBooking: (booking: Booking) => void;
    updateBooking: (id: string, updates: Partial<Booking>) => void;
    removeBooking: (id: string) => void;
    setSyncStatus: (date: string | null, error: string | null) => void;
    setLoading: (loading: boolean) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
    bookings: [],
    isLoading: false,
    lastSyncDate: null,
    syncError: null,

    setBookings: (bookings) => set({ bookings }),

    addBooking: (booking) => set((state) => ({
        bookings: [...state.bookings, booking]
    })),

    updateBooking: (id, updates) => set((state) => ({
        bookings: state.bookings.map((b) =>
            b.id === id ? { ...b, ...updates } : b
        ),
    })),

    removeBooking: (id) => set((state) => ({
        bookings: state.bookings.filter((b) => b.id !== id),
    })),

    setSyncStatus: (lastSyncDate, syncError) => set({ lastSyncDate, syncError }),

    setLoading: (isLoading) => set({ isLoading }),
}));
