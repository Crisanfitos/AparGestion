/**
 * Supabase Client Configuration
 * Configured for AparGestión with AsyncStorage for session persistence
 * Credentials are read from environment variables
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Read Supabase credentials from environment variables
// EXPO_PUBLIC_ prefix makes them available on client side in Expo
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate that credentials are present
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
        '⚠️ Supabase credentials not found in environment variables.\n' +
        'Make sure .env file exists with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
    );
}

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(
    SUPABASE_URL || '',
    SUPABASE_ANON_KEY || '',
    {
        auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    }
);

// Export for use throughout the app
export default supabase;

// Database types (generated from schema)
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string | null;
                    full_name: string | null;
                    phone: string | null;
                    avatar_url: string | null;
                    settings: Record<string, any>;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
            };
            properties: {
                Row: {
                    id: string;
                    owner_id: string;
                    name: string;
                    address: string | null;
                    city: string | null;
                    country: string;
                    description: string | null;
                    photos: string[];
                    price_per_night: number | null;
                    max_guests: number;
                    bedrooms: number;
                    bathrooms: number;
                    amenities: Record<string, any>;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['properties']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['properties']['Insert']>;
            };
            reservations: {
                Row: {
                    id: string;
                    property_id: string;
                    owner_id: string;
                    external_id: string | null;
                    guest_name: string;
                    guest_email: string | null;
                    guest_phone: string | null;
                    check_in: string;
                    check_out: string;
                    num_guests: number;
                    total_price: number | null;
                    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
                    source: 'manual' | 'booking' | 'airbnb' | 'vrbo' | 'ical' | 'other';
                    notes: string | null;
                    metadata: Record<string, any>;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['reservations']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['reservations']['Insert']>;
            };
            guests: {
                Row: {
                    id: string;
                    reservation_id: string;
                    full_name: string;
                    document_type: 'dni' | 'passport' | 'nie' | 'driving_license' | 'other' | null;
                    document_number: string | null;
                    nationality: string | null;
                    birth_date: string | null;
                    signature_url: string | null;
                    document_photo_url: string | null;
                    extra_data: Record<string, any>;
                    checked_in_at: string | null;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['guests']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['guests']['Insert']>;
            };
            document_templates: {
                Row: {
                    id: string;
                    user_id: string;
                    name: string;
                    html_content: string;
                    variables: string[];
                    type: 'contract' | 'invoice' | 'checkin' | 'other';
                    is_default: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['document_templates']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['document_templates']['Insert']>;
            };
            user_preferences: {
                Row: {
                    id: string;
                    user_id: string;
                    key: string;
                    value: any;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['user_preferences']['Row'], 'id' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>;
            };
            ical_syncs: {
                Row: {
                    id: string;
                    property_id: string;
                    source: 'booking' | 'airbnb' | 'google' | 'vrbo' | 'manual' | 'other';
                    ical_url: string;
                    last_synced_at: string | null;
                    sync_status: 'ok' | 'error' | 'pending' | 'syncing';
                    error_message: string | null;
                    is_active: boolean;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['ical_syncs']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['ical_syncs']['Insert']>;
            };
        };
    };
}
