/**
 * Profile Service
 * Handles CRUD operations for user profiles with Supabase
 */
import { Database, supabase } from '@/src/core/api/supabase';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;

export interface ProfileResult {
    success: boolean;
    data?: Profile;
    error?: string;
}

/**
 * Get the current user's profile
 */
export async function getMyProfile(): Promise<ProfileResult> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            // Profile might not exist yet, create it
            if (error.code === 'PGRST116') {
                return await createProfile(user.id, user.email || '');
            }
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Create a new profile for user
 */
async function createProfile(userId: string, email: string): Promise<ProfileResult> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                email: email,
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
 * Update the current user's profile
 */
export async function updateMyProfile(updates: ProfileUpdate): Promise<ProfileResult> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
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
 * Upload avatar image and update profile
 */
export async function uploadAvatar(imageUri: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        // Create file path: avatars/{user_id}/avatar.jpg
        const fileExt = imageUri.split('.').pop() || 'jpg';
        const fileName = `${user.id}/avatar.${fileExt}`;

        // Read file and convert to blob
        const response = await fetch(imageUri);
        const blob = await response.blob();

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(fileName, blob, {
                contentType: `image/${fileExt}`,
                upsert: true,
            });

        if (error) {
            console.error('Upload error:', error);
            return { success: false, error: error.message };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        const avatarUrl = urlData.publicUrl;

        // Update profile with new avatar URL
        await updateMyProfile({ avatar_url: avatarUrl });

        return { success: true, url: avatarUrl };
    } catch (err: any) {
        console.error('Avatar upload error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Get settings from profile
 */
export function getProfileSetting<T>(profile: Profile, key: string, defaultValue: T): T {
    if (!profile.settings || typeof profile.settings !== 'object') {
        return defaultValue;
    }
    return (profile.settings as Record<string, any>)[key] ?? defaultValue;
}

/**
 * Update a specific setting in the profile
 */
export async function updateProfileSetting(key: string, value: any): Promise<ProfileResult> {
    try {
        const profileResult = await getMyProfile();
        if (!profileResult.success || !profileResult.data) {
            return profileResult;
        }

        const currentSettings = (profileResult.data.settings as Record<string, any>) || {};
        const newSettings = {
            ...currentSettings,
            [key]: value,
        };

        return await updateMyProfile({ settings: newSettings });
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
