/**
 * Reservation Details Screen
 * Shows full details of a reservation with management actions
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HighContrastCard, LargeTextButton } from '@/src/components/accessible';
import { useCalendarStore } from '@/src/core/stores';
import { borderRadius, colors, spacing, typography } from '@/src/core/theme';
import { useReservations } from '@/src/features/calendar/hooks/useReservations';

export default function ReservationDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { bookings } = useCalendarStore();
    const { deleteReservation } = useReservations(); // Need to implement delete in useReservations
    const [isDeleting, setIsDeleting] = useState(false);

    // Find booking
    const booking = bookings.find((b) => b.id === id);

    if (!booking) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>No se encontró la reserva</Text>
                    <LargeTextButton title="Volver" onPress={() => router.back()} />
                </View>
            </SafeAreaView>
        );
    }

    // Actions
    const handleCall = () => {
        if (booking.guestPhone) {
            Linking.openURL(`tel:${booking.guestPhone}`);
        }
    };

    const handleWhatsApp = () => {
        if (booking.guestPhone) {
            let phone = booking.guestPhone.replace(/\s+/g, '').replace(/-/g, '');
            Linking.openURL(`whatsapp://send?phone=${phone}`);
        }
    };

    const handleEmail = () => {
        if (booking.guestEmail) {
            Linking.openURL(`mailto:${booking.guestEmail}`);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            '🗑️ Eliminar Reserva',
            '¿Estás seguro de que quieres eliminar esta reserva? Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        const result = await deleteReservation(booking.id);
                        if (result.success) {
                            Alert.alert('Eliminado', 'La reserva ha sido eliminada correctamente', [
                                { text: 'OK', onPress: () => router.back() }
                            ]);
                        } else {
                            Alert.alert('Error', result.error || 'No se pudo eliminar la reserva');
                            setIsDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    // Calculate nights
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.guestName}>{booking.guestName}</Text>
                    <View style={styles.badgesContainer}>
                        <View style={[
                            styles.badge,
                            { backgroundColor: booking.source === 'manual' ? colors.primary : colors.occupied }
                        ]}>
                            <Text style={styles.badgeText}>
                                {booking.source === 'manual' ? 'Manual' : 'Booking.com'}
                            </Text>
                        </View>
                        <View style={[
                            styles.badge,
                            { backgroundColor: booking.status === 'confirmed' ? colors.success : colors.warning, marginLeft: spacing.sm }
                        ]}>
                            <Text style={styles.badgeText}>
                                {booking.status === 'confirmed' ? 'Confirmada' : (booking.status || 'Pendiente')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Dates Card */}
                <HighContrastCard style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>📅 Fechas</Text>
                    <View style={styles.row}>
                        <View style={styles.dateCol}>
                            <Text style={styles.label}>Entrada</Text>
                            <Text style={styles.value}>{start.toLocaleDateString('es-ES')}</Text>
                        </View>
                        <Text style={styles.arrow}>→</Text>
                        <View style={styles.dateCol}>
                            <Text style={styles.label}>Salida</Text>
                            <Text style={styles.value}>{end.toLocaleDateString('es-ES')}</Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <Text style={styles.nightsText}>{nights} {nights === 1 ? 'Noche' : 'Noches'}</Text>
                </HighContrastCard>

                {/* Contact Card */}
                {(booking.guestPhone || booking.guestEmail) && (
                    <HighContrastCard style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>📞 Contacto</Text>

                        {booking.guestPhone && (
                            <View style={styles.contactRow}>
                                <View style={styles.contactInfo}>
                                    <Text style={styles.label}>Teléfono</Text>
                                    <Text style={styles.value}>{booking.guestPhone}</Text>
                                </View>
                                <View style={styles.contactActions}>
                                    <TouchableOpacity style={styles.iconButton} onPress={handleWhatsApp}>
                                        <Text style={styles.iconText}>💬</Text>
                                        {/* TODO: Use proper icon library if available */}
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.iconButton, styles.callButton]} onPress={handleCall}>
                                        <Text style={styles.iconText}>📞</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {booking.guestEmail && (
                            <View style={[styles.contactRow, booking.guestPhone && { marginTop: spacing.md }]}>
                                <View style={styles.contactInfo}>
                                    <Text style={styles.label}>Email</Text>
                                    <Text style={styles.value}>{booking.guestEmail}</Text>
                                </View>
                                <TouchableOpacity style={styles.iconButton} onPress={handleEmail}>
                                    <Text style={styles.iconText}>✉️</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </HighContrastCard>
                )}

                {/* Financial Card */}
                <HighContrastCard style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>💰 Económico</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Total Reserva</Text>
                        <Text style={styles.priceValue}>{booking.totalPrice?.toFixed(2) || '0.00'} €</Text>
                    </View>
                </HighContrastCard>

                {/* Danger Zone */}
                {booking.source === 'manual' && (
                    <View style={styles.dangerZone}>
                        <LargeTextButton
                            title={isDeleting ? "Eliminando..." : "Eliminar Reserva"}
                            onPress={handleDelete}
                            variant="primary" // Should be destructive style ideally
                            style={{ backgroundColor: colors.error }}
                        />
                        <Text style={styles.dangerText}>
                            Esta acción eliminará la reserva permanentemente de la base de datos.
                        </Text>
                    </View>
                )}

                {/* Back Button */}
                <View style={{ marginTop: spacing.xl }}>
                    <LargeTextButton
                        title="Volver"
                        onPress={() => router.back()}
                        variant="secondary"
                    />
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
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: 40,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    errorText: {
        fontSize: typography.fontSize.large,
        color: colors.text,
        marginBottom: spacing.lg,
    },
    header: {
        marginBottom: spacing.lg,
    },
    guestName: {
        fontSize: typography.fontSize.title,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    badgesContainer: {
        flexDirection: 'row',
    },
    badge: {
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        borderRadius: borderRadius.md,
    },
    badgeText: {
        color: colors.background,
        fontWeight: '600',
        fontSize: 14,
    },
    sectionCard: {
        marginBottom: spacing.lg,
        padding: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.fontSize.large,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateCol: {
        alignItems: 'center',
    },
    arrow: {
        fontSize: 24,
        color: colors.primary,
        marginHorizontal: spacing.md,
    },
    label: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    value: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
    },
    nightsText: {
        textAlign: 'center',
        color: colors.primary,
        fontWeight: '700',
        fontSize: typography.fontSize.body,
    },
    contactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    contactInfo: {
        flex: 1,
    },
    contactActions: {
        flexDirection: 'row',
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        marginLeft: spacing.sm,
    },
    callButton: {
        backgroundColor: '#E8F5E9',
        borderColor: colors.success,
    },
    iconText: {
        fontSize: 20,
    },
    priceValue: {
        fontSize: typography.fontSize.large,
        fontWeight: '700',
        color: colors.success,
    },
    dangerZone: {
        marginTop: spacing.xl,
        paddingTop: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    dangerText: {
        marginTop: spacing.sm,
        color: colors.textSecondary,
        fontSize: 12,
        textAlign: 'center',
    },
});
