/**
 * Login Screen - Elder-Friendly Design
 * - Large touch targets (60dp+)
 * - High contrast colors
 * - Biometric authentication option
 * - Simple, clear layout
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';

import { colors, typography, spacing, borderRadius, touchTarget } from '@/src/core/theme';
import { LargeTextButton } from '@/src/components/accessible';
import { useAuthStore } from '@/src/core/stores';
import { supabase } from '@/src/core/api/supabase';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const { setUser } = useAuthStore();

    useEffect(() => {
        checkBiometricAvailability();
    }, []);

    const checkBiometricAvailability = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(compatible && enrolled);
    };

    const handleLogin = async () => {
        if (!email || !password) {
            setErrorMessage('Por favor, complete todos los campos');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setErrorMessage('Email o contraseña incorrectos');
                return;
            }

            if (data.user) {
                setUser({
                    id: data.user.id,
                    email: data.user.email || '',
                    name: data.user.user_metadata?.name || 'Usuario',
                });
                router.replace('/(tabs)');
            }
        } catch (error) {
            setErrorMessage('Error de conexión. Inténtelo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBiometricLogin = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Inicie sesión con su huella o cara',
                cancelLabel: 'Cancelar',
                fallbackLabel: 'Usar contraseña',
            });

            if (result.success) {
                // TODO: Retrieve stored credentials and login
                // For now, show demo login
                setUser({
                    id: 'demo-user',
                    email: 'demo@apargestion.app',
                    name: 'Usuario Demo',
                });
                router.replace('/(tabs)');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo usar la autenticación biométrica');
        }
    };

    const handleDemoLogin = () => {
        // Demo login for testing
        setUser({
            id: 'demo-user',
            email: 'demo@apargestion.app',
            name: 'Usuario Demo',
        });
        router.replace('/(tabs)');
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

                    {/* Login Form */}
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="su.email@ejemplo.com"
                                placeholderTextColor={colors.placeholder}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                accessibilityLabel="Dirección de email"
                                accessibilityHint="Introduzca su email para iniciar sesión"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Contraseña</Text>
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Su contraseña"
                                placeholderTextColor={colors.placeholder}
                                secureTextEntry
                                accessibilityLabel="Contraseña"
                                accessibilityHint="Introduzca su contraseña"
                            />
                        </View>

                        {errorMessage ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorIcon}>⚠️</Text>
                                <Text style={styles.errorText}>{errorMessage}</Text>
                            </View>
                        ) : null}

                        <View style={styles.buttonContainer}>
                            <LargeTextButton
                                title={isLoading ? 'Entrando...' : 'Entrar'}
                                onPress={handleLogin}
                                disabled={isLoading}
                                accessibilityHint="Pulsar para iniciar sesión"
                            />
                        </View>

                        {biometricAvailable && (
                            <View style={styles.buttonContainer}>
                                <LargeTextButton
                                    title="🔐 Entrar con Huella/Cara"
                                    onPress={handleBiometricLogin}
                                    variant="secondary"
                                    accessibilityHint="Usar huella dactilar o reconocimiento facial"
                                />
                            </View>
                        )}

                        {/* Demo login for development */}
                        <View style={styles.demoContainer}>
                            <Text style={styles.demoText}>¿Primera vez?</Text>
                            <LargeTextButton
                                title="Probar sin cuenta"
                                onPress={handleDemoLogin}
                                variant="secondary"
                                accessibilityHint="Entrar en modo demostración"
                            />
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            ¿Problemas para acceder?
                        </Text>
                        <Text style={styles.footerLink}>
                            Contacte con soporte
                        </Text>
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
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.sm,
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
    demoContainer: {
        marginTop: spacing.xl,
        alignItems: 'center',
    },
    demoText: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
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
    },
});
