/**
 * Property Photos Service
 * Handles photo uploads to Supabase Storage for properties
 */
import { supabase } from '@/src/core/api/supabase';

export interface PhotoUploadResult {
    success: boolean;
    url?: string;
    error?: string;
}

/**
 * Upload a property photo to Supabase Storage
 * @param propertyId - The property ID (used for folder organization)
 * @param imageUri - Local URI of the image to upload
 * @param index - Photo index (0, 1, 2...) for naming
 */
export async function uploadPropertyPhoto(
    propertyId: string,
    imageUri: string,
    index: number = 0
): Promise<PhotoUploadResult> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        // Get file extension
        const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        const timestamp = Date.now();

        // Path: property-photos/{user_id}/{property_id}/{timestamp}_{index}.{ext}
        const filePath = `${user.id}/${propertyId}/${timestamp}_${index}.${fileExt}`;

        // Fetch the image and convert to blob
        const response = await fetch(imageUri);
        const blob = await response.blob();

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('property-photos')
            .upload(filePath, blob, {
                contentType: `image/${fileExt}`,
                upsert: false,
            });

        if (error) {
            console.error('Photo upload error:', error);
            return { success: false, error: error.message };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('property-photos')
            .getPublicUrl(filePath);

        return { success: true, url: urlData.publicUrl };
    } catch (err: any) {
        console.error('Photo upload error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Upload multiple property photos
 */
export async function uploadPropertyPhotos(
    propertyId: string,
    imageUris: string[]
): Promise<{ success: boolean; urls: string[]; errors: string[] }> {
    const urls: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < imageUris.length; i++) {
        const result = await uploadPropertyPhoto(propertyId, imageUris[i], i);

        if (result.success && result.url) {
            urls.push(result.url);
        } else {
            errors.push(result.error || `Error uploading photo ${i + 1}`);
        }
    }

    return {
        success: errors.length === 0,
        urls,
        errors,
    };
}

/**
 * Delete a property photo from Supabase Storage
 */
export async function deletePropertyPhoto(photoUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Extract file path from URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/property-photos/{path}
        const urlParts = photoUrl.split('/property-photos/');
        if (urlParts.length < 2) {
            return { success: false, error: 'Invalid photo URL' };
        }

        const filePath = urlParts[1];

        const { error } = await supabase.storage
            .from('property-photos')
            .remove([filePath]);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
