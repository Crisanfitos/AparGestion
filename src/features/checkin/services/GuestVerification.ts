/**
 * Guest Verification Service
 * Handles guest check-in data submission to Supabase
 */
import { supabase } from '@/src/core/api/supabase';

export interface GuestData {
    bookingId: string;
    fullName: string;
    documentType: 'dni' | 'passport' | 'other';
    documentNumber: string;
    nationality: string;
    documentPhotoUri?: string;
    signatureUri?: string;
    checkInTime: string;
}

export const GuestVerificationService = {
    /**
     * Submit guest check-in data
     */
    async submitCheckIn(data: GuestData): Promise<{ success: boolean; error?: string }> {
        try {
            // Upload document photo if provided
            let documentUrl: string | null = null;
            if (data.documentPhotoUri) {
                documentUrl = await this.uploadDocument(data.bookingId, data.documentPhotoUri);
            }

            // Upload signature if provided
            let signatureUrl: string | null = null;
            if (data.signatureUri) {
                signatureUrl = await this.uploadSignature(data.bookingId, data.signatureUri);
            }

            // Save check-in record
            const { error } = await supabase
                .from('guest_checkins')
                .insert({
                    booking_id: data.bookingId,
                    full_name: data.fullName,
                    document_type: data.documentType,
                    document_number: data.documentNumber,
                    nationality: data.nationality,
                    document_photo_url: documentUrl,
                    signature_url: signatureUrl,
                    check_in_time: data.checkInTime,
                    status: 'completed',
                });

            if (error) throw error;

            // Update booking status
            await supabase
                .from('bookings')
                .update({ status: 'checked-in' })
                .eq('id', data.bookingId);

            return { success: true };
        } catch (error) {
            console.error('Check-in error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido'
            };
        }
    },

    /**
     * Upload document photo to Supabase Storage
     */
    async uploadDocument(bookingId: string, uri: string): Promise<string | null> {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const fileName = `${bookingId}/document_${Date.now()}.jpg`;

            const { data, error } = await supabase.storage
                .from('guest-documents')
                .upload(fileName, blob);

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('guest-documents')
                .getPublicUrl(data.path);

            return urlData.publicUrl;
        } catch (error) {
            console.error('Document upload error:', error);
            return null;
        }
    },

    /**
     * Upload signature to Supabase Storage
     */
    async uploadSignature(bookingId: string, uri: string): Promise<string | null> {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const fileName = `${bookingId}/signature_${Date.now()}.png`;

            const { data, error } = await supabase.storage
                .from('guest-signatures')
                .upload(fileName, blob);

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('guest-signatures')
                .getPublicUrl(data.path);

            return urlData.publicUrl;
        } catch (error) {
            console.error('Signature upload error:', error);
            return null;
        }
    },

    /**
     * Get check-in status for a booking
     */
    async getCheckInStatus(bookingId: string): Promise<'pending' | 'completed' | 'not-found'> {
        const { data, error } = await supabase
            .from('guest_checkins')
            .select('status')
            .eq('booking_id', bookingId)
            .single();

        if (error || !data) return 'not-found';
        return data.status === 'completed' ? 'completed' : 'pending';
    },
};
