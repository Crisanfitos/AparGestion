/**
 * Custom Accessible Day Component for Calendar
 * - Large touch target (60dp+)
 * - High contrast colors
 * - Clear status indicators
 * - Full accessibility labels
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DateData } from 'react-native-calendars';

import { colors, typography, spacing, borderRadius } from '@/src/core/theme';

export type DayStatus = 'available' | 'occupied' | 'pending' | 'checkout' | 'checkin';

interface AccessibleDayProps {
    date: DateData;
    state?: 'disabled' | 'today' | 'selected' | '';
    status?: DayStatus;
    guestName?: string;
    onPress?: (date: DateData) => void;
}

export function AccessibleDay({
    date,
    state,
    status = 'available',
    guestName,
    onPress,
}: AccessibleDayProps) {
    const isDisabled = state === 'disabled';
    const isToday = state === 'today';
    const isOccupied = status === 'occupied' || status === 'checkin' || status === 'checkout';

    const getStatusColor = () => {
        switch (status) {
            case 'occupied':
                return colors.occupied;
            case 'pending':
                return colors.pending;
            case 'checkin':
                return colors.success;
            case 'checkout':
                return colors.warning;
            default:
                return colors.available;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'occupied':
                return 'Ocupado';
            case 'pending':
                return 'Pendiente';
            case 'checkin':
                return 'Entrada';
            case 'checkout':
                return 'Salida';
            default:
                return 'Libre';
        }
    };

    const getDayName = () => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const d = new Date(date.year, date.month - 1, date.day);
        return days[d.getDay()];
    };

    const getMonthName = () => {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return months[date.month - 1];
    };

    const accessibilityLabel = `${getDayName()} ${date.day} de ${getMonthName()}. Estado: ${getStatusText()}${guestName ? `. Huésped: ${guestName}` : ''}`;

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isToday && styles.todayContainer,
                isOccupied && styles.occupiedContainer,
                isOccupied && { borderColor: getStatusColor() },
                isDisabled && styles.disabledContainer,
            ]}
            onPress={() => onPress?.(date)}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ disabled: isDisabled }}
        >
            {/* Day number */}
            <Text
                style={[
                    styles.dayNumber,
                    isToday && styles.todayText,
                    isDisabled && styles.disabledText,
                ]}
            >
                {date.day}
            </Text>

            {/* Status indicator */}
            {status !== 'available' && (
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                    <Text style={styles.statusText}>{getStatusText()}</Text>
                </View>
            )}

            {/* Guest name (if space permits) */}
            {guestName && isOccupied && (
                <Text style={styles.guestName} numberOfLines={1}>
                    {guestName}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 48,
        minHeight: 60,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: 'transparent',
        backgroundColor: colors.background,
        margin: 1,
    },
    todayContainer: {
        borderWidth: 3,
        borderColor: colors.primary,
    },
    occupiedContainer: {
        borderWidth: 2,
        backgroundColor: '#FFF5F5',
    },
    disabledContainer: {
        opacity: 0.4,
    },
    dayNumber: {
        fontSize: typography.fontSize.body,
        fontWeight: '700',
        color: colors.text,
    },
    todayText: {
        color: colors.primary,
    },
    disabledText: {
        color: colors.textSecondary,
    },
    statusBadge: {
        marginTop: 2,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.background,
    },
    guestName: {
        fontSize: 8,
        color: colors.textSecondary,
        marginTop: 1,
        maxWidth: 44,
    },
});
