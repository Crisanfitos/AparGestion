/**
 * Owner Dashboard (Home)
 * Main overview screen with stats, upcoming bookings, and alerts
 */
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HighContrastCard, LargeTextButton } from '@/src/components/accessible';
import { useAuthStore, useCalendarStore } from '@/src/core/stores';
import { borderRadius, colors, spacing, typography } from '@/src/core/theme';

export default function DashboardScreen() {
    const { bookings } = useCalendarStore();
    const { user } = useAuthStore();

    // Calculate stats
    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filter bookings for current month
        const monthBookings = bookings.filter((b) => {
            const start = new Date(b.startDate);
            return start.getMonth() === currentMonth && start.getFullYear() === currentYear;
        });

        // Calculate total nights this month
        let totalNights = 0;
        let totalRevenue = 0;
        monthBookings.forEach((b) => {
            const start = new Date(b.startDate);
            const end = new Date(b.endDate);
            const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            totalNights += nights;
            totalRevenue += b.totalPrice || 0;
        });

        // Occupancy rate (assuming 30 days month)
        const occupancyRate = Math.round((totalNights / 30) * 100);

        return {
            totalBookings: monthBookings.length,
            totalNights,
            occupancyRate,
            totalRevenue,
        };
    }, [bookings]);

    // Upcoming check-ins (next 7 days)
    const upcomingCheckIns = useMemo(() => {
        const now = new Date();
        const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        return bookings
            .filter((b) => {
                const start = new Date(b.startDate);
                return start >= now && start <= weekLater;
            })
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 3);
    }, [bookings]);

    // Upcoming check-outs (next 7 days)
    const upcomingCheckOuts = useMemo(() => {
        const now = new Date();
        const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        return bookings
            .filter((b) => {
                const end = new Date(b.endDate);
                return end >= now && end <= weekLater;
            })
            .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
            .slice(0, 3);
    }, [bookings]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
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
                        👋 Hola, {user?.name || 'Propietario'}
                    </Text>
                    <Text style={styles.subtitle}>
                        Resumen de {getMonthName()} {new Date().getFullYear()}
                    </Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>📅</Text>
                        <Text style={styles.statValue}>{stats.totalBookings}</Text>
                        <Text style={styles.statLabel}>Reservas</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>🌙</Text>
                        <Text style={styles.statValue}>{stats.totalNights}</Text>
                        <Text style={styles.statLabel}>Noches</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>📊</Text>
                        <Text style={styles.statValue}>{stats.occupancyRate}%</Text>
                        <Text style={styles.statLabel}>Ocupación</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>💰</Text>
                        <Text style={styles.statValue}>{stats.totalRevenue}€</Text>
                        <Text style={styles.statLabel}>Ingresos</Text>
                    </View>
                </View>

                {/* Upcoming Check-ins */}
                <HighContrastCard title="🟢 Próximas Entradas">
                    {upcomingCheckIns.length === 0 ? (
                        <Text style={styles.emptyText}>
                            No hay entradas en los próximos 7 días
                        </Text>
                    ) : (
                        upcomingCheckIns.map((booking) => (
                            <TouchableOpacity
                                key={booking.id}
                                style={styles.bookingItem}
                                onPress={() => router.push('/calendar')}
                                accessibilityLabel={`Entrada de ${booking.guestName} el ${formatDate(booking.startDate)}`}
                            >
                                <View style={styles.bookingDate}>
                                    <Text style={styles.bookingDay}>
                                        {new Date(booking.startDate).getDate()}
                                    </Text>
                                    <Text style={styles.bookingMonth}>
                                        {new Date(booking.startDate).toLocaleDateString('es-ES', { month: 'short' })}
                                    </Text>
                                </View>
                                <View style={styles.bookingInfo}>
                                    <Text style={styles.bookingGuest}>{booking.guestName}</Text>
                                    <Text style={styles.bookingSource}>
                                        {booking.source === 'manual' ? 'Reserva manual' : 'Booking.com'}
                                    </Text>
                                </View>
                                <Text style={styles.bookingArrow}>→</Text>
                            </TouchableOpacity>
                        ))
                    )}
                </HighContrastCard>

                {/* Upcoming Check-outs */}
                <HighContrastCard title="🔴 Próximas Salidas">
                    {upcomingCheckOuts.length === 0 ? (
                        <Text style={styles.emptyText}>
                            No hay salidas en los próximos 7 días
                        </Text>
                    ) : (
                        upcomingCheckOuts.map((booking) => (
                            <TouchableOpacity
                                key={booking.id}
                                style={styles.bookingItem}
                                onPress={() => router.push('/calendar')}
                                accessibilityLabel={`Salida de ${booking.guestName} el ${formatDate(booking.endDate)}`}
                            >
                                <View style={[styles.bookingDate, styles.bookingDateRed]}>
                                    <Text style={styles.bookingDay}>
                                        {new Date(booking.endDate).getDate()}
                                    </Text>
                                    <Text style={styles.bookingMonth}>
                                        {new Date(booking.endDate).toLocaleDateString('es-ES', { month: 'short' })}
                                    </Text>
                                </View>
                                <View style={styles.bookingInfo}>
                                    <Text style={styles.bookingGuest}>{booking.guestName}</Text>
                                    <Text style={styles.bookingSource}>
                                        {booking.source === 'manual' ? 'Reserva manual' : 'Booking.com'}
                                    </Text>
                                </View>
                                <Text style={styles.bookingArrow}>→</Text>
                            </TouchableOpacity>
                        ))
                    )}
                </HighContrastCard>

                {/* Alerts */}
                {bookings.length === 0 && (
                    <HighContrastCard title="⚠️ Alertas" variant="warning">
                        <Text style={styles.alertText}>
                            No tienes reservas configuradas
                        </Text>
                        <View style={styles.alertButton}>
                            <LargeTextButton
                                title="Crear Primera Reserva"
                                onPress={() => router.push('/calendar')}
                                variant="secondary"
                            />
                        </View>
                    </HighContrastCard>
                )}

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push('/calendar')}
                            accessibilityLabel="Ver calendario"
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
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -spacing.xs,
        marginBottom: spacing.lg,
    },
    statCard: {
        width: '50%',
        padding: spacing.xs,
    },
    statCardInner: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
    },
    statIcon: {
        fontSize: 32,
        marginBottom: spacing.sm,
        textAlign: 'center',
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 2,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    statValue: {
        fontSize: typography.fontSize.title,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    statLabel: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    bookingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    bookingDate: {
        width: 50,
        height: 50,
        backgroundColor: colors.success,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    bookingDateRed: {
        backgroundColor: colors.error,
    },
    bookingDay: {
        fontSize: typography.fontSize.large,
        fontWeight: '700',
        color: colors.background,
    },
    bookingMonth: {
        fontSize: 10,
        color: colors.background,
        textTransform: 'uppercase',
    },
    bookingInfo: {
        flex: 1,
    },
    bookingGuest: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
    },
    bookingSource: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
    },
    bookingArrow: {
        fontSize: typography.fontSize.large,
        color: colors.textSecondary,
    },
    alertText: {
        fontSize: typography.fontSize.body,
        color: colors.text,
        marginBottom: spacing.md,
    },
    alertButton: {
        marginTop: spacing.sm,
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
