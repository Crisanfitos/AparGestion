/**
 * Authentication Service
 * Handles user registration, login, logout, and session management with Supabase
 */
import { supabase } from '@/src/core/api/supabase';
import { AuthError, Session, User } from '@supabase/supabase-js';

export interface AuthResult {
    success: boolean;
    user?: User | null;
    session?: Session | null;
    error?: string;
}

/**
 * Register a new user with email and password
 */
export async function signUp(
    email: string,
    password: string,
    fullName?: string
): Promise<AuthResult> {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName || '',
                },
            },
        });

        if (error) {
            return { success: false, error: translateAuthError(error) };
        }

        return {
            success: true,
            user: data.user,
            session: data.session
        };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { success: false, error: translateAuthError(error) };
        }

        return {
            success: true,
            user: data.user,
            session: data.session
        };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<AuthResult> {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            return { success: false, error: translateAuthError(error) };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get current session
 * Handles invalid refresh token by clearing the corrupted session
 */
export async function getSession(): Promise<Session | null> {
    try {
        const { data, error } = await supabase.auth.getSession();

        // Handle invalid refresh token error
        if (error) {
            console.warn('Session error:', error.message);

            // If refresh token is invalid, sign out to clear corrupted session
            if (error.message.includes('Refresh Token') ||
                error.message.includes('refresh_token') ||
                error.message.includes('Invalid')) {
                console.log('Clearing corrupted session...');
                await supabase.auth.signOut();
                return null;
            }
        }

        return data.session;
    } catch (err: any) {
        console.error('getSession error:', err);
        // Try to clear session on any error
        try {
            await supabase.auth.signOut();
        } catch { }
        return null;
    }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<AuthResult> {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'apargestion://reset-password',
        });

        if (error) {
            return { success: false, error: translateAuthError(error) };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(session);
    });
}

/**
 * Translate Supabase auth errors to Spanish
 */
function translateAuthError(error: AuthError): string {
    const message = error.message.toLowerCase();

    if (message.includes('invalid login credentials')) {
        return 'Email o contraseña incorrectos';
    }
    if (message.includes('email not confirmed')) {
        return 'Debes confirmar tu email antes de iniciar sesión';
    }
    if (message.includes('user already registered')) {
        return 'Este email ya está registrado';
    }
    if (message.includes('password should be at least')) {
        return 'La contraseña debe tener al menos 6 caracteres';
    }
    if (message.includes('invalid email')) {
        return 'El email no es válido';
    }
    if (message.includes('rate limit')) {
        return 'Demasiados intentos. Espera un momento';
    }
    if (message.includes('network')) {
        return 'Error de conexión. Comprueba tu internet';
    }

    return error.message;
}
