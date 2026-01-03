/**
 * Biometric Authentication Service
 * Handles fingerprint/Face ID login with secure credential storage
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const SECURE_KEYS = {
    EMAIL: 'apargesion_user_email',
    PASSWORD: 'apargesion_user_password',
};

export interface BiometricResult {
    success: boolean;
    error?: string;
}

export interface BiometricStatus {
    isAvailable: boolean;
    isEnrolled: boolean;
    biometricTypes: string[];
}

/**
 * Check if device supports biometric authentication
 */
export async function checkBiometricAvailability(): Promise<BiometricStatus> {
    try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

        const biometricTypes = supportedTypes.map(type => {
            switch (type) {
                case LocalAuthentication.AuthenticationType.FINGERPRINT:
                    return 'Huella dactilar';
                case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
                    return 'Face ID';
                case LocalAuthentication.AuthenticationType.IRIS:
                    return 'Iris';
                default:
                    return 'Desconocido';
            }
        });

        return {
            isAvailable: hasHardware,
            isEnrolled: isEnrolled,
            biometricTypes,
        };
    } catch (err) {
        console.error('Error checking biometric:', err);
        return {
            isAvailable: false,
            isEnrolled: false,
            biometricTypes: [],
        };
    }
}

/**
 * Authenticate user with biometrics
 */
export async function authenticateWithBiometrics(
    promptMessage: string = 'Autentícate para continuar'
): Promise<BiometricResult> {
    try {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage,
            cancelLabel: 'Cancelar',
            fallbackLabel: 'Usar contraseña',
            disableDeviceFallback: false,
        });

        if (result.success) {
            return { success: true };
        }

        // Handle different error types
        if (result.error === 'user_cancel') {
            return { success: false, error: 'Autenticación cancelada' };
        }
        if (result.error === 'lockout') {
            return { success: false, error: 'Demasiados intentos fallidos. Intenta más tarde.' };
        }
        if (result.error === 'not_enrolled') {
            return { success: false, error: 'No hay biometría configurada en el dispositivo' };
        }

        return { success: false, error: 'Autenticación fallida' };
    } catch (err: any) {
        console.error('Biometric auth error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Save credentials securely for biometric login
 */
export async function saveCredentialsForBiometric(
    email: string,
    password: string
): Promise<BiometricResult> {
    try {
        await SecureStore.setItemAsync(SECURE_KEYS.EMAIL, email);
        await SecureStore.setItemAsync(SECURE_KEYS.PASSWORD, password);
        return { success: true };
    } catch (err: any) {
        console.error('Error saving credentials:', err);
        return { success: false, error: 'No se pudieron guardar las credenciales' };
    }
}

/**
 * Get saved credentials for biometric login
 */
export async function getSavedCredentials(): Promise<{
    email?: string;
    password?: string;
} | null> {
    try {
        const email = await SecureStore.getItemAsync(SECURE_KEYS.EMAIL);
        const password = await SecureStore.getItemAsync(SECURE_KEYS.PASSWORD);

        if (email && password) {
            return { email, password };
        }
        return null;
    } catch (err) {
        console.error('Error getting credentials:', err);
        return null;
    }
}

/**
 * Check if credentials are saved
 */
export async function hasStoredCredentials(): Promise<boolean> {
    try {
        const email = await SecureStore.getItemAsync(SECURE_KEYS.EMAIL);
        const password = await SecureStore.getItemAsync(SECURE_KEYS.PASSWORD);
        return !!(email && password);
    } catch (err) {
        return false;
    }
}

/**
 * Clear saved credentials
 */
export async function clearStoredCredentials(): Promise<BiometricResult> {
    try {
        await SecureStore.deleteItemAsync(SECURE_KEYS.EMAIL);
        await SecureStore.deleteItemAsync(SECURE_KEYS.PASSWORD);
        return { success: true };
    } catch (err: any) {
        console.error('Error clearing credentials:', err);
        return { success: false, error: 'No se pudieron borrar las credenciales' };
    }
}

/**
 * Full biometric login flow:
 * 1. Check if credentials are stored
 * 2. Authenticate with biometrics
 * 3. Return credentials if successful
 */
export async function biometricLogin(): Promise<{
    success: boolean;
    credentials?: { email: string; password: string };
    error?: string;
}> {
    // Check for stored credentials
    const credentials = await getSavedCredentials();
    if (!credentials) {
        return { success: false, error: 'No hay credenciales guardadas' };
    }

    // Authenticate with biometrics
    const authResult = await authenticateWithBiometrics('Usa tu huella para iniciar sesión');
    if (!authResult.success) {
        return { success: false, error: authResult.error };
    }

    return {
        success: true,
        credentials: {
            email: credentials.email!,
            password: credentials.password!,
        },
    };
}
