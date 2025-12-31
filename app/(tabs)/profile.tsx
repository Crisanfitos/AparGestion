import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, typography, spacing, borderRadius } from '@/src/core/theme';
import { HighContrastCard } from '@/src/components/accessible';
import { LargeTextButton } from '@/src/components/accessible';
import { useAuthStore } from '@/src/core/stores';

export default function ProfileScreen() {
    const { user, isAuthenticated, logout } = useAuthStore();

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
            >
                <View style={styles.profileHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.name?.[0]?.toUpperCase() || '👤'}
                        </Text>
                    </View>
                    <Text style={styles.userName}>
                        {user?.name || 'Usuario'}
                    </Text>
                    <Text style={styles.userEmail}>
                        {user?.email || 'No conectado'}
                    </Text>
                </View>

                <HighContrastCard title="⚙️ Configuración">
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Sincronización Booking</Text>
                        <Text style={styles.settingValue}>No configurada</Text>
                    </View>
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Notificaciones</Text>
                        <Text style={styles.settingValue}>Activadas</Text>
                    </View>
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Biometría</Text>
                        <Text style={styles.settingValue}>Desactivada</Text>
                    </View>
                </HighContrastCard>

                <HighContrastCard title="📋 Mis Propiedades">
                    <Text style={styles.emptyText}>
                        No hay propiedades configuradas.
                    </Text>
                    <View style={styles.buttonRow}>
                        <LargeTextButton
                            title="+ Añadir Propiedad"
                            onPress={() => {
                                // TODO: Add property
                            }}
                            variant="secondary"
                            accessibilityHint="Añadir una nueva propiedad de alquiler"
                        />
                    </View>
                </HighContrastCard>

                <View style={styles.logoutContainer}>
                    <LargeTextButton
                        title="Cerrar Sesión"
                        onPress={() => {
                            logout();
                        }}
                        variant="danger"
                        accessibilityHint="Cerrar sesión de la aplicación"
                    />
                </View>

                <Text style={styles.versionText}>
                    AparGestión v1.0.0
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.lg,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    avatarText: {
        fontSize: 40,
        color: colors.background,
        fontWeight: '700',
    },
    userName: {
        fontSize: typography.fontSize.title,
        fontWeight: '700',
        color: colors.text,
    },
    userEmail: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    settingLabel: {
        fontSize: typography.fontSize.body,
        color: colors.text,
    },
    settingValue: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
    },
    emptyText: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    buttonRow: {
        marginTop: spacing.sm,
    },
    logoutContainer: {
        marginTop: spacing.xl,
    },
    versionText: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.xl,
    },
});
