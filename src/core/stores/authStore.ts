/**
 * Auth Store
 * Manages authentication state using Zustand and Supabase
 */
import {
    getSession,
    onAuthStateChange,
    resetPassword,
    signIn,
    signOut,
    signUp
} from '@/src/core/services/authService';
import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;

    // Actions
    initialize: () => Promise<void>;
    login: (email: string, password: string) => Promise<boolean>;
    register: (email: string, password: string, fullName?: string) => Promise<boolean>;
    logout: () => Promise<void>;
    forgotPassword: (email: string) => Promise<boolean>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,

    initialize: async () => {
        set({ isLoading: true, error: null });

        try {
            // Get current session
            const session = await getSession();

            set({
                session,
                user: session?.user ?? null,
                isAuthenticated: !!session,
                isLoading: false,
            });

            // Listen for auth changes
            onAuthStateChange((session) => {
                set({
                    session,
                    user: session?.user ?? null,
                    isAuthenticated: !!session,
                });
            });
        } catch (error: any) {
            set({
                isLoading: false,
                error: error.message,
                isAuthenticated: false,
            });
        }
    },

    login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        const result = await signIn(email, password);

        if (result.success) {
            set({
                user: result.user ?? null,
                session: result.session ?? null,
                isAuthenticated: true,
                isLoading: false,
            });
            return true;
        } else {
            set({
                error: result.error ?? 'Error al iniciar sesión',
                isLoading: false,
            });
            return false;
        }
    },

    register: async (email: string, password: string, fullName?: string) => {
        set({ isLoading: true, error: null });

        const result = await signUp(email, password, fullName);

        if (result.success) {
            set({
                user: result.user ?? null,
                session: result.session ?? null,
                isAuthenticated: !!result.session,
                isLoading: false,
            });
            return true;
        } else {
            set({
                error: result.error ?? 'Error al registrarse',
                isLoading: false,
            });
            return false;
        }
    },

    logout: async () => {
        set({ isLoading: true, error: null });

        await signOut();

        set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
        });
    },

    forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });

        const result = await resetPassword(email);

        set({ isLoading: false });

        if (!result.success) {
            set({ error: result.error ?? 'Error al enviar email' });
        }

        return result.success;
    },

    clearError: () => set({ error: null }),
}));

export default useAuthStore;
