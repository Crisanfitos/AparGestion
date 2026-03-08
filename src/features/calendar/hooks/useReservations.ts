/**
 * useReservations Hook
 * Manages reservation CRUD and synchronization with Supabase
 */
import { Booking, useCalendarStore } from '@/src/core/stores';
import { getMyProperties } from '@/src/features/properties/propertyService';
import { useCallback, useState } from 'react';
import {
    createReservation,
    deleteReservation,
    getReservationsByProperty,
    Reservation
} from '../services/reservationService';

export function useReservations() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { bookings, setBookings, addBooking: addStoreBooking } = useCalendarStore();
    const [activePropertyId, setActivePropertyId] = useState<string | null>(null);

    /**
     * Map DB Reservation to Store Booking
     */
    const mapReservationToBooking = (res: Reservation): Booking => {
        // Map Status
        let status: Booking['status'] = 'confirmed'; // Default
        switch (res.status) {
            case 'pending': status = 'pending'; break;
            case 'confirmed': status = 'confirmed'; break;
            case 'cancelled': status = 'cancelled'; break;
            case 'completed': status = 'checked-in'; break; // Map completed to checked-in
            case 'no_show': status = 'cancelled'; break; // Map no_show to cancelled
            default: status = 'confirmed';
        }

        // Map Source
        let source: Booking['source'] = 'manual';
        switch (res.source) {
            case 'booking': source = 'booking'; break;
            case 'airbnb': source = 'airbnb'; break;
            case 'manual': source = 'manual'; break;
            default: source = 'other'; // Map vrbo, ical, etc to other
        }

        return {
            id: res.id,
            propertyId: res.property_id,
            guestName: res.guest_name,
            guestEmail: res.guest_email,
            guestPhone: res.guest_phone,
            startDate: res.check_in,
            endDate: res.check_out,
            status: status,
            source: source,
            totalPrice: res.total_price || 0,
            notes: res.notes
        };
    };

    /**
     * Initialize/Load reservations
     */
    const loadReservations = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        // 1. Get Property ID if we don't have one
        let propertyId = activePropertyId;
        if (!propertyId) {
            const propsResult = await getMyProperties();
            // Check if data is array and has items
            if (propsResult.success && Array.isArray(propsResult.data) && propsResult.data.length > 0) {
                propertyId = propsResult.data[0].id;
                setActivePropertyId(propertyId);
            } else {
                setIsLoading(false);
                return;
            }
        }

        // 2. Fetch Reservations
        const result = await getReservationsByProperty(propertyId);

        if (result.success && Array.isArray(result.data)) {
            const mapped = (result.data as Reservation[]).map(mapReservationToBooking);
            // Replace store bookings with DB ones
            // Note: This replaces ALL bookings. If we want to keep iCal ones that are NOT in DB, we need logic.
            // For Phase 14 step 1, assuming DB is single source of truth for THIS property.
            setBookings(mapped);
        } else {
            setError(result.error || 'Error al cargar reservas');
        }
        setIsLoading(false);
    }, [activePropertyId, setBookings]);

    /**
     * Create a new manual reservation
     */
    const createManualReservation = useCallback(async (booking: {
        guestName: string;
        guestEmail?: string;
        guestPhone?: string;
        startDate: string;
        endDate: string;
        totalPrice: number;
        status?: 'confirmed' | 'pending';
    }) => {
        setIsLoading(true);
        setError(null);

        // Ensure we have a property ID
        let propertyId = activePropertyId;
        if (!propertyId) {
            const propsResult = await getMyProperties();
            if (propsResult.success && Array.isArray(propsResult.data) && propsResult.data.length > 0) {
                propertyId = propsResult.data[0].id;
                setActivePropertyId(propertyId);
            } else {
                setError('No tienes propiedades creadas. Crea una primero.');
                setIsLoading(false);
                return { success: false, error: 'No properties found' };
            }
        }

        const result = await createReservation({
            property_id: propertyId,
            guest_name: booking.guestName,
            guest_email: booking.guestEmail,
            guest_phone: booking.guestPhone,
            check_in: booking.startDate,
            check_out: booking.endDate,
            total_price: booking.totalPrice,
            status: booking.status || 'confirmed',
            source: 'manual',
        });

        if (result.success && result.data) {
            const newBooking = mapReservationToBooking(result.data as Reservation);
            addStoreBooking(newBooking);
            setIsLoading(false);
            return { success: true, booking: newBooking };
        } else {
            setError(result.error || 'Error al crear reserva');
            setIsLoading(false);
            return { success: false, error: result.error };
        }
    }, [activePropertyId, addStoreBooking]);

    const deleteReservationAction = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);

        const result = await deleteReservation(id);

        if (result.success) {
            useCalendarStore.getState().removeBooking(id);
            setIsLoading(false);
            return { success: true };
        } else {
            setError(result.error || 'Error al eliminar reserva');
            setIsLoading(false);
            return { success: false, error: result.error };
        }
    }, []);

    return {
        isLoading,
        error,
        loadReservations,
        createManualReservation,
        deleteReservation: deleteReservationAction
    };
}
