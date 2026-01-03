/**
 * Preferences Service
 * Handles user preferences with Supabase user_preferences table
 */
import { supabase } from '@/src/core/api/supabase';

// Preference keys
export const PREF_KEYS = {
    NOTIFICATIONS_ENABLED: 'notifications_enabled',
    BIOMETRIC_ENABLED: 'biometric_enabled',
    THEME: 'theme',
    LANGUAGE: 'language',
} as const;

export type PreferenceKey = (typeof PREF_KEYS)[keyof typeof PREF_KEYS];

export interface PreferenceResult {
    success: boolean;
    value?: any;
    error?: string;
}

/**
 * Get a specific preference value
 */
export async function getPreference<T>(key: PreferenceKey, defaultValue: T): Promise<T> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return defaultValue;
        }

        const { data, error } = await supabase
            .from('user_preferences')
            .select('value')
            .eq('user_id', user.id)
            .eq('key', key)
            .single();

        if (error || !data) {
            return defaultValue;
        }

        return data.value as T;
    } catch (err) {
        console.error('Error getting preference:', err);
        return defaultValue;
    }
}

/**
 * Set a user preference
 */
export async function setPreference(key: PreferenceKey, value: any): Promise<PreferenceResult> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        // Upsert to handle both insert and update
        const { data, error } = await supabase
            .from('user_preferences')
            .upsert(
                {
                    user_id: user.id,
                    key: key,
                    value: value,
                },
                {
                    onConflict: 'user_id,key',
                }
            )
            .select()
            .single();

        if (error) {
            console.error('Error setting preference:', error);
            return { success: false, error: error.message };
        }

        return { success: true, value: data?.value };
    } catch (err: any) {
        console.error('Error setting preference:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Get all preferences for current user
 */
export async function getAllPreferences(): Promise<Record<string, any>> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return {};
        }

        const { data, error } = await supabase
            .from('user_preferences')
            .select('key, value')
            .eq('user_id', user.id);

        if (error || !data) {
            return {};
        }

        // Convert array to object
        const prefs: Record<string, any> = {};
        data.forEach((pref) => {
            prefs[pref.key] = pref.value;
        });

        return prefs;
    } catch (err) {
        console.error('Error getting all preferences:', err);
        return {};
    }
}

/**
 * Delete a preference
 */
export async function deletePreference(key: PreferenceKey): Promise<PreferenceResult> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const { error } = await supabase
            .from('user_preferences')
            .delete()
            .eq('user_id', user.id)
            .eq('key', key);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
