/**
 * Property Service
 * Handles CRUD operations for rental properties/accommodations with Supabase
 */
import { Database, supabase } from '@/src/core/api/supabase';

export type Property = Database['public']['Tables']['properties']['Row'];
export type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
export type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

export interface PropertyResult {
    success: boolean;
    data?: Property | Property[];
    error?: string;
}

/**
 * Get all properties for the current user
 */
export async function getMyProperties(): Promise<PropertyResult> {
    try {
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get a single property by ID
 */
export async function getProperty(id: string): Promise<PropertyResult> {
    try {
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', id)
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
 * Create a new property
 */
export async function createProperty(property: {
    name: string;
    address?: string | null;
    city?: string | null;
    country?: string;
    description?: string | null;
    photos?: string[];
    price_per_night?: number | null;
    max_guests?: number;
    bedrooms?: number;
    bathrooms?: number;
    amenities?: Record<string, any>;
    is_active?: boolean;
    booking_url?: string | null;
}): Promise<PropertyResult> {
    try {
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const { data, error } = await supabase
            .from('properties')
            .insert({
                ...property,
                owner_id: user.id,
            })
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
 * Update a property
 */
export async function updateProperty(id: string, updates: PropertyUpdate): Promise<PropertyResult> {
    try {
        const { data, error } = await supabase
            .from('properties')
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
 * Delete a property
 */
export async function deleteProperty(id: string): Promise<PropertyResult> {
    try {
        const { error } = await supabase
            .from('properties')
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
 * Toggle property active status
 */
export async function togglePropertyActive(id: string, isActive: boolean): Promise<PropertyResult> {
    return updateProperty(id, { is_active: isActive });
}
