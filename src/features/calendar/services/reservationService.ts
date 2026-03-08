/**
 * Reservation Service
 * Handles CRUD operations for reservations in Supabase
 */
import { supabase } from '@/src/core/api/supabase';

export interface Reservation {
    id: string;
    property_id: string;
    owner_id: string;
    external_id?: string;
    guest_name: string;
    guest_email?: string;
    guest_phone?: string;
    check_in: string; // YYYY-MM-DD
    check_out: string; // YYYY-MM-DD
    num_guests: number;
    total_price?: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    source: 'manual' | 'booking' | 'airbnb' | 'vrbo' | 'ical' | 'other';
    notes?: string;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface CreateReservationDTO {
    property_id: string;
    guest_name: string;
    guest_email?: string;
    guest_phone?: string;
    check_in: string;
    check_out: string;
    num_guests?: number;
    total_price?: number;
    status?: Reservation['status'];
    source?: Reservation['source'];
    notes?: string;
}

export interface UpdateReservationDTO extends Partial<CreateReservationDTO> {
    id: string;
}

export interface ReservationResult {
    success: boolean;
    data?: Reservation | Reservation[];
    error?: string;
}

// ============================================
// Reservation CRUD
// ============================================

/**
 * Create a new reservation
 */
export async function createReservation(reservation: CreateReservationDTO): Promise<ReservationResult> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const { data, error } = await supabase
            .from('reservations')
            .insert({
                ...reservation,
                owner_id: user.id,
                source: reservation.source || 'manual',
                status: reservation.status || 'confirmed',
                num_guests: reservation.num_guests || 1,
            })
            .select()
            .single();

        if (error) {
            console.error('Create reservation error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get reservations for a property
 */
export async function getReservationsByProperty(propertyId: string): Promise<ReservationResult> {
    try {
        const { data, error } = await supabase
            .from('reservations')
            .select('*')
            .eq('property_id', propertyId)
            .order('check_in', { ascending: true });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get reservations for a date range (for calendar view)
 */
export async function getReservationsByDateRange(
    propertyId: string,
    startDate: string,
    endDate: string
): Promise<ReservationResult> {
    try {
        // Find reservations that overlap with the range
        // (check_in <= endDate) AND (check_out >= startDate)
        const { data, error } = await supabase
            .from('reservations')
            .select('*')
            .eq('property_id', propertyId)
            .lte('check_in', endDate)
            .gte('check_out', startDate)
            .order('check_in', { ascending: true });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Update a reservation
 */
export async function updateReservation(reservation: UpdateReservationDTO): Promise<ReservationResult> {
    try {
        const { id, ...updates } = reservation;

        const { data, error } = await supabase
            .from('reservations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Delete a reservation
 */
export async function deleteReservation(id: string): Promise<ReservationResult> {
    try {
        const { error } = await supabase
            .from('reservations')
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
 * Upsert a reservation by external ID (for iCal sync)
 * If a reservation with the same external_id exists, update it.
 * Otherwise, create a new one.
 */
export async function upsertReservationByExternalId(reservation: CreateReservationDTO & { external_id: string }): Promise<ReservationResult> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        // 1. Check if it exists
        const { data: existing, error: findError } = await supabase
            .from('reservations')
            .select('id')
            .eq('external_id', reservation.external_id)
            .maybeSingle();

        if (findError) {
            console.error('Find reservation error:', findError);
            return { success: false, error: findError.message };
        }

        if (existing) {
            // 2. Update existing reservation
            const { data, error } = await supabase
                .from('reservations')
                .update({
                    check_in: reservation.check_in,
                    check_out: reservation.check_out,
                    status: reservation.status,
                    guest_name: reservation.guest_name,
                    notes: reservation.notes,
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) {
                console.error('Update reservation error:', error);
                return { success: false, error: error.message };
            }
            console.log('Updated reservation:', data?.id);
            return { success: true, data };
        } else {
            // 3. Insert new reservation
            const { data, error } = await supabase
                .from('reservations')
                .insert({
                    ...reservation,
                    owner_id: user.id,
                })
                .select()
                .single();

            if (error) {
                console.error('Insert reservation error:', error);
                return { success: false, error: error.message };
            }
            console.log('Created reservation:', data?.id);
            return { success: true, data };
        }

    } catch (err: any) {
        console.error('Upsert reservation exception:', err);
        return { success: false, error: err.message };
    }
}
