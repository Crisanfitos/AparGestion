/**
 * Login Screen - Elder-Friendly Design
 * - Large touch targets (60dp+)
 * - High contrast colors
 * - Biometric authentication option
 * - Password show/hide toggle
 */
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LargeTextButton, PasswordInput } from '@/src/components/accessible';
import {
    biometricLogin,
    checkBiometricAvailability,
    hasStoredCredentials
} from '@/src/core/services/biometricService';
import { useAuthStore } from '@/src/core/stores';
import { borderRadius, colors, spacing, touchTarget, typography } from '@/src/core/theme';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    // Biometric state
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [checkingBiometric, setCheckingBiometric] = useState(true);

    const { login, register, isLoading, error, clearError } = useAuthStore();

    // Check biometric availability and if credentials are stored locally
    // Note: We check stored credentials, not Supabase preference (which requires auth)
    const checkBiometric = useCallback(async () => {
        setCheckingBiometric(true);

        const status = await checkBiometricAvailability();
        const hasCredentials = await hasStoredCredentials();

        setBiometricAvailable(status.isAvailable && status.isEnrolled);
        // If device has biometric AND we have stored credentials, enable biometric login
        setBiometricEnabled(status.isAvailable && status.isEnrolled && hasCredentials);

        setCheckingBiometric(false);
    }, []);

    useEffect(() => {
        checkBiometric();
    }, [checkBiometric]);

    useEffect(() => {
        // Clear error when switching between login/register
        clearError();
    }, [isRegistering]);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Aviso', 'Por favor, complete todos los campos');
            return;
        }

        const success = await login(email, password);

        if (success) {
            router.replace('/(tabs)');
        }
    };

    const handleRegister = async () => {
        if (!email || !password) {
            Alert.alert('Aviso', 'Por favor, complete todos los campos');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Aviso', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }

        const success = await register(email, password, fullName);

        if (success) {
            Alert.alert(
                '✅ Cuenta Creada',
                'Revisa tu email para confirmar tu cuenta. Después podrás iniciar sesión.',
                [{ text: 'OK', onPress: () => setIsRegistering(false) }]
            );
        }
    };

    const handleBiometricLogin = async () => {
        try {
            const result = await biometricLogin();

            if (result.success && result.credentials) {
                // Use stored credentials to login
                const loginSuccess = await login(
                    result.credentials.email,
                    result.credentials.password
                );

                if (loginSuccess) {
                    router.replace('/(tabs)');
                } else {
                    Alert.alert(
                        'Error de credenciales',
                        'Las credenciales guardadas no son válidas. Inicia sesión manualmente.'
                    );
                }
            } else {
                if (result.error) {
                    Alert.alert('Error', result.error);
                }
            }
        } catch (error: any) {
            Alert.alert('Error', 'No se pudo usar la autenticación biométrica');
        }
    };

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        setEmail('');
        setPassword('');
        setFullName('');
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.logo}>🏠</Text>
                        <Text style={styles.title}>AparGestión</Text>
                        <Text style={styles.subtitle}>
                            Gestión de alquileres accesible
                        </Text>
                    </View>

                    {/* Login/Register Form */}
                    <View style={styles.form}>
                        <Text style={styles.formTitle}>
                            {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
                        </Text>

                        {isRegistering && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nombre Completo</Text>
                                <TextInput
                                    style={styles.input}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder="Tu nombre"
                                    placeholderTextColor={colors.placeholder}
                                    autoCapitalize="words"
                                    accessibilityLabel="Nombre completo"
                                />
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="tu.email@ejemplo.com"
                                placeholderTextColor={colors.placeholder}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                accessibilityLabel="Dirección de email"
                            />
                        </View>

                        <PasswordInput
                            value={password}
                            onChangeText={setPassword}
                            label="Contraseña"
                            placeholder="Tu contraseña"
                        />

                        {error ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorIcon}>⚠️</Text>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <View style={styles.buttonContainer}>
                            <LargeTextButton
                                title={isLoading
                                    ? (isRegistering ? 'Creando...' : 'Entrando...')
                                    : (isRegistering ? 'Crear Cuenta' : 'Entrar')
                                }
                                onPress={isRegistering ? handleRegister : handleLogin}
                                disabled={isLoading}
                            />
                        </View>

                        {/* Biometric Login Button - only show if enabled and credentials stored */}
                        {!isRegistering && biometricEnabled && (
                            <View style={styles.buttonContainer}>
                                <LargeTextButton
                                    title="🔐 Entrar con Huella/Cara"
                                    onPress={handleBiometricLogin}
                                    variant="secondary"
                                    disabled={isLoading}
                                />
                            </View>
                        )}

                        {/* Show hint if biometric available but not enabled */}
                        {!isRegistering && biometricAvailable && !biometricEnabled && !checkingBiometric && (
                            <View style={styles.biometricHint}>
                                <Text style={styles.biometricHintText}>
                                    💡 Puedes activar el login con huella en Configuración después de iniciar sesión
                                </Text>
                            </View>
                        )}

                        {/* Toggle Login/Register */}
                        <View style={styles.toggleContainer}>
                            <Text style={styles.toggleText}>
                                {isRegistering
                                    ? '¿Ya tienes cuenta?'
                                    : '¿No tienes cuenta?'
                                }
                            </Text>
                            <TouchableOpacity onPress={toggleMode}>
                                <Text style={styles.toggleLink}>
                                    {isRegistering ? 'Iniciar Sesión' : 'Crear Cuenta'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            ¿Problemas para acceder?
                        </Text>
                        <TouchableOpacity onPress={() => {
                            if (email) {
                                useAuthStore.getState().forgotPassword(email);
                                Alert.alert('Email Enviado', 'Revisa tu correo para restablecer la contraseña');
                            } else {
                                Alert.alert('Aviso', 'Introduce tu email primero');
                            }
                        }}>
                            <Text style={styles.footerLink}>
                                Olvidé mi contraseña
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: spacing.xl,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    logo: {
        fontSize: 80,
        marginBottom: spacing.md,
    },
    title: {
        fontSize: typography.fontSize.header,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    form: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    formTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    input: {
        height: touchTarget.minimum,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        fontSize: typography.fontSize.body,
        color: colors.text,
        backgroundColor: colors.background,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        borderWidth: 2,
        borderColor: colors.error,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    errorIcon: {
        fontSize: 24,
        marginRight: spacing.sm,
    },
    errorText: {
        flex: 1,
        fontSize: typography.fontSize.body,
        color: colors.error,
        fontWeight: '600',
    },
    buttonContainer: {
        marginTop: spacing.md,
    },
    biometricHint: {
        marginTop: spacing.lg,
        padding: spacing.md,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.md,
    },
    biometricHintText: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    toggleContainer: {
        marginTop: spacing.xl,
        alignItems: 'center',
    },
    toggleText: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
    },
    toggleLink: {
        fontSize: typography.fontSize.body,
        color: colors.primary,
        fontWeight: 'bold',
        marginTop: spacing.sm,
        padding: spacing.sm,
    },
    footer: {
        alignItems: 'center',
        marginTop: spacing.xxl,
    },
    footerText: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
    },
    footerLink: {
        fontSize: typography.fontSize.body,
        color: colors.primary,
        fontWeight: '600',
        marginTop: spacing.sm,
        padding: spacing.sm,
    },
});
