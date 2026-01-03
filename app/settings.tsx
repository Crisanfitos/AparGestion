/**
 * Settings Screen
 * User preferences: notifications, biometric login, theme
 * With cross-platform password modal for biometric setup
 */
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HighContrastCard, LargeTextButton, PasswordInput } from '@/src/components/accessible';
import {
    BiometricStatus,
    checkBiometricAvailability,
    clearStoredCredentials,
    hasStoredCredentials,
    saveCredentialsForBiometric,
} from '@/src/core/services/biometricService';
import {
    getPreference,
    PREF_KEYS,
    setPreference
} from '@/src/core/services/preferencesService';
import { useAuthStore } from '@/src/core/stores';
import { borderRadius, colors, spacing, touchTarget, typography } from '@/src/core/theme';

export default function SettingsScreen() {
    const { user } = useAuthStore();

    // Loading state
    const [isLoading, setIsLoading] = useState(true);

    // Preference states
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);

    // Biometric availability
    const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
    const [hasCredentials, setHasCredentials] = useState(false);

    // Saving states
    const [savingNotifications, setSavingNotifications] = useState(false);
    const [savingBiometric, setSavingBiometric] = useState(false);

    // Password modal for biometric setup
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');

    // Load preferences
    const loadPreferences = useCallback(async () => {
        setIsLoading(true);

        // Load from Supabase
        const notifications = await getPreference(PREF_KEYS.NOTIFICATIONS_ENABLED, false);
        const biometric = await getPreference(PREF_KEYS.BIOMETRIC_ENABLED, false);

        setNotificationsEnabled(notifications);
        setBiometricEnabled(biometric);

        // Check biometric availability
        const status = await checkBiometricAvailability();
        setBiometricStatus(status);

        // Check if credentials are stored
        const hasCreds = await hasStoredCredentials();
        setHasCredentials(hasCreds);

        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]);

    // Handle notifications toggle
    const handleNotificationsToggle = async (value: boolean) => {
        setSavingNotifications(true);
        setNotificationsEnabled(value);

        const result = await setPreference(PREF_KEYS.NOTIFICATIONS_ENABLED, value);

        setSavingNotifications(false);

        if (!result.success) {
            // Revert on error
            setNotificationsEnabled(!value);
            Alert.alert('Error', 'No se pudo guardar la configuración');
        }
    };

    // Handle biometric toggle
    const handleBiometricToggle = async (value: boolean) => {
        if (!biometricStatus?.isAvailable) {
            Alert.alert(
                'No disponible',
                'Tu dispositivo no soporta autenticación biométrica'
            );
            return;
        }

        if (!biometricStatus?.isEnrolled) {
            Alert.alert(
                'Sin biometría configurada',
                'Configura una huella o Face ID en los ajustes de tu dispositivo'
            );
            return;
        }

        if (value) {
            // Show password modal to enable biometric
            setPasswordInput('');
            setShowPasswordModal(true);
        } else {
            // Disabling biometric
            setSavingBiometric(true);
            await clearStoredCredentials();
            await setPreference(PREF_KEYS.BIOMETRIC_ENABLED, false);

            setSavingBiometric(false);
            setBiometricEnabled(false);
            setHasCredentials(false);
            Alert.alert('Biometría desactivada', 'Login con huella deshabilitado');
        }
    };

    // Handle password submission for biometric setup
    const handlePasswordSubmit = async () => {
        if (!passwordInput || !user?.email) {
            Alert.alert('Error', 'Contraseña requerida');
            return;
        }

        setShowPasswordModal(false);
        setSavingBiometric(true);

        // Save credentials securely
        const saveResult = await saveCredentialsForBiometric(
            user.email,
            passwordInput
        );

        if (!saveResult.success) {
            Alert.alert('Error', saveResult.error || 'No se pudieron guardar las credenciales');
            setSavingBiometric(false);
            return;
        }

        // Save preference
        const prefResult = await setPreference(
            PREF_KEYS.BIOMETRIC_ENABLED,
            true
        );

        setSavingBiometric(false);
        setPasswordInput('');

        if (prefResult.success) {
            setBiometricEnabled(true);
            setHasCredentials(true);
            Alert.alert(
                '✅ Biometría activada',
                'Ahora puedes usar tu huella para iniciar sesión'
            );
        } else {
            await clearStoredCredentials();
            Alert.alert('Error', 'No se pudo guardar la configuración');
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ title: '⚙️ Configuración' }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: '⚙️ Configuración' }} />

            <ScrollView style={styles.content}>
                {/* Notifications */}
                <HighContrastCard title="🔔 Notificaciones">
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Notificaciones push</Text>
                            <Text style={styles.settingDescription}>
                                Recibe alertas de nuevas reservas y check-ins
                            </Text>
                        </View>
                        <View style={styles.switchContainer}>
                            {savingNotifications && (
                                <ActivityIndicator
                                    size="small"
                                    color={colors.primary}
                                    style={styles.savingIndicator}
                                />
                            )}
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={handleNotificationsToggle}
                                disabled={savingNotifications}
                                trackColor={{ false: '#ccc', true: colors.success }}
                                thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                            />
                        </View>
                    </View>
                </HighContrastCard>

                {/* Biometric Login */}
                <HighContrastCard title="🔐 Seguridad">
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Login con huella/Face ID</Text>
                            <Text style={styles.settingDescription}>
                                {biometricStatus?.isAvailable
                                    ? biometricStatus.isEnrolled
                                        ? `Disponible: ${biometricStatus.biometricTypes.join(', ')}`
                                        : 'Configura biometría en tu dispositivo'
                                    : 'No disponible en este dispositivo'}
                            </Text>
                            {hasCredentials && (
                                <Text style={styles.credentialsStored}>
                                    ✓ Credenciales guardadas
                                </Text>
                            )}
                        </View>
                        <View style={styles.switchContainer}>
                            {savingBiometric && (
                                <ActivityIndicator
                                    size="small"
                                    color={colors.primary}
                                    style={styles.savingIndicator}
                                />
                            )}
                            <Switch
                                value={biometricEnabled}
                                onValueChange={handleBiometricToggle}
                                disabled={savingBiometric || !biometricStatus?.isAvailable}
                                trackColor={{ false: '#ccc', true: colors.success }}
                                thumbColor={biometricEnabled ? '#fff' : '#f4f3f4'}
                            />
                        </View>
                    </View>
                </HighContrastCard>

                {/* Theme (placeholder for future) */}
                <HighContrastCard title="🎨 Apariencia">
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Tema</Text>
                            <Text style={styles.settingDescription}>
                                Modo claro/oscuro (próximamente)
                            </Text>
                        </View>
                        <Text style={styles.comingSoon}>Pronto</Text>
                    </View>
                </HighContrastCard>

                {/* Danger zone */}
                {hasCredentials && (
                    <HighContrastCard title="⚠️ Zona de peligro">
                        <LargeTextButton
                            title="Borrar credenciales guardadas"
                            onPress={async () => {
                                Alert.alert(
                                    'Borrar credenciales',
                                    '¿Seguro que quieres borrar las credenciales guardadas?',
                                    [
                                        { text: 'Cancelar', style: 'cancel' },
                                        {
                                            text: 'Borrar',
                                            style: 'destructive',
                                            onPress: async () => {
                                                await clearStoredCredentials();
                                                await setPreference(PREF_KEYS.BIOMETRIC_ENABLED, false);
                                                setBiometricEnabled(false);
                                                setHasCredentials(false);
                                                Alert.alert('Borrado', 'Credenciales eliminadas');
                                            },
                                        },
                                    ]
                                );
                            }}
                            variant="danger"
                        />
                    </HighContrastCard>
                )}
            </ScrollView>

            {/* Password Modal for Biometric Setup */}
            <Modal
                visible={showPasswordModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPasswordModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>🔐 Habilitar Biometría</Text>
                        <Text style={styles.modalDescription}>
                            Introduce tu contraseña para guardar las credenciales de forma segura
                        </Text>

                        <PasswordInput
                            value={passwordInput}
                            onChangeText={setPasswordInput}
                            placeholder="Tu contraseña"
                            autoFocus
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setShowPasswordModal(false);
                                    setPasswordInput('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handlePasswordSubmit}
                            >
                                <Text style={styles.confirmButtonText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    settingInfo: {
        flex: 1,
        marginRight: spacing.md,
    },
    settingLabel: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
    },
    settingDescription: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
        marginTop: 2,
    },
    credentialsStored: {
        fontSize: typography.fontSize.small,
        color: colors.success,
        marginTop: 4,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    savingIndicator: {
        marginRight: spacing.sm,
    },
    comingSoon: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: typography.fontSize.title,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    modalDescription: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    passwordInput: {
        height: touchTarget.minimum,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        fontSize: typography.fontSize.body,
        color: colors.text,
        backgroundColor: colors.background,
        marginBottom: spacing.lg,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    modalButton: {
        flex: 1,
        height: touchTarget.minimum,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 2,
        borderColor: colors.border,
    },
    cancelButtonText: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
    },
    confirmButton: {
        backgroundColor: colors.primary,
    },
    confirmButtonText: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.background,
    },
});
