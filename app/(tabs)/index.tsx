/**
 * Owner Dashboard (Home)
 * Main overview screen with stats, upcoming bookings, and alerts
 */
import { router } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HighContrastCard } from '@/src/components/accessible';
import { useAuthStore } from '@/src/core/stores';
import { borderRadius, colors, spacing, typography } from '@/src/core/theme';

export default function DashboardScreen() {
    const { user } = useAuthStore();

    const handleCalendarDisabled = () => {
        Alert.alert(
            'Calendario no disponible',
            'Esta funcionalidad se encuentra temporalmente deshabilitada mientras mejoramos la integración con los calendarios externos.',
            [{ text: 'Entendido' }]
        );
    };

    const getMonthName = () => {
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return months[new Date().getMonth()];
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
            >
                {/* Welcome Header */}
                <View style={styles.header}>
                    <Text style={styles.greeting}>
                        👋 Hola, {user?.user_metadata?.full_name || 'Propietario'}
                    </Text>
                    <Text style={styles.subtitle}>
                        Resumen de {getMonthName()} {new Date().getFullYear()}
                    </Text>
                </View>

                {/* Calendar Disabled Notice */}
                <HighContrastCard title="📅 Calendario">
                    <Text style={styles.emptyText}>
                        El calendario y las reservas se encuentran temporalmente deshabilitados mientras mejoramos la integración con calendarios externos.
                    </Text>
                </HighContrastCard>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.actionButton, { opacity: 0.4 }]}
                            onPress={handleCalendarDisabled}
                            accessibilityLabel="Calendario deshabilitado"
                        >
                            <Text style={styles.actionIcon}>📅</Text>
                            <Text style={styles.actionText}>Calendario</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push('/documents')}
                            accessibilityLabel="Crear factura"
                        >
                            <Text style={styles.actionIcon}>📄</Text>
                            <Text style={styles.actionText}>Factura</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push('/documents')}
                            accessibilityLabel="Crear contrato"
                        >
                            <Text style={styles.actionIcon}>📝</Text>
                            <Text style={styles.actionText}>Contrato</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
    header: {
        marginBottom: spacing.xl,
    },
    greeting: {
        fontSize: typography.fontSize.header,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
    },
    emptyText: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    quickActions: {
        marginTop: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.fontSize.large,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        marginHorizontal: spacing.xs,
        borderWidth: 2,
        borderColor: colors.border,
    },
    actionIcon: {
        fontSize: 32,
        marginBottom: spacing.sm,
    },
    actionText: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
    },
});
