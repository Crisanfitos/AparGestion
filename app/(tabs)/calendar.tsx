/**
 * Calendar Screen - Dual View (Calendar / Agenda List)
 * Toggle between calendar grid and list view
 * Enhanced booking modal with calendar picker & auto-calculation
 * Cross-platform compatible (Web + Native)
 */
import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarList, DateData, Calendar } from 'react-native-calendars';

import { colors, typography, spacing, borderRadius, touchTarget } from '@/src/core/theme';
import { HighContrastCard, LargeTextButton } from '@/src/components/accessible';
import { useCalendarStore, Booking } from '@/src/core/stores';
import { useBookingSync } from '@/src/features/calendar/hooks/useBookingSync';

type ViewMode = 'calendar' | 'list';

export default function CalendarScreen() {
    const { bookings, isLoading } = useCalendarStore();
    const { addManualBooking, checkConflict } = useBookingSync();

    const [viewMode, setViewMode] = useState<ViewMode>('calendar');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showNewBookingModal, setShowNewBookingModal] = useState(false);

    // New booking form state
    const [newBooking, setNewBooking] = useState({
        guestName: '',
        guestCount: 2,
        startDate: new Date(),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        pricePerNight: '',
    });

    // Date picker modal states
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerType, setDatePickerType] = useState<'start' | 'end'>('start');

    // Calculate nights and total price
    const nights = useMemo(() => {
        const diff = newBooking.endDate.getTime() - newBooking.startDate.getTime();
        return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }, [newBooking.startDate, newBooking.endDate]);

    const totalPrice = useMemo(() => {
        const price = parseFloat(newBooking.pricePerNight) || 0;
        return (price * nights).toFixed(2);
    }, [newBooking.pricePerNight, nights]);

    // Sort bookings by date for list view
    const sortedBookings = useMemo(() => {
        return [...bookings].sort(
            (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
    }, [bookings]);

    // Group bookings by month for list view
    const groupedBookings = useMemo(() => {
        const groups: { [key: string]: Booking[] } = {};

        sortedBookings.forEach((booking) => {
            const date = new Date(booking.startDate);
            const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

            if (!groups[monthName]) {
                groups[monthName] = [];
            }
            groups[monthName].push(booking);
        });

        return groups;
    }, [sortedBookings]);

    // Convert bookings to calendar marked dates
    const markedDates = useMemo(() => {
        const marks: { [key: string]: any } = {};

        bookings.forEach((booking) => {
            const start = new Date(booking.startDate);
            const end = new Date(booking.endDate);

            const current = new Date(start);
            while (current < end) {
                const dateStr = current.toISOString().split('T')[0];
                const isStart = current.getTime() === start.getTime();
                const isEnd = current.getTime() === new Date(end.getTime() - 86400000).getTime();

                marks[dateStr] = {
                    marked: true,
                    startingDay: isStart,
                    endingDay: isEnd,
                    color: booking.source === 'manual' ? colors.primary : colors.occupied,
                    textColor: colors.background,
                };

                current.setDate(current.getDate() + 1);
            }
        });

        if (selectedDate) {
            marks[selectedDate] = {
                ...marks[selectedDate],
                selected: true,
                selectedColor: colors.primary,
            };
        }

        return marks;
    }, [bookings, selectedDate]);

    const handleDayPress = (day: DateData) => {
        setSelectedDate(day.dateString);

        const booking = bookings.find((b) => {
            const start = new Date(b.startDate);
            const end = new Date(b.endDate);
            const selected = new Date(day.dateString);
            return selected >= start && selected < end;
        });

        if (booking) {
            Alert.alert(
                '📅 Reserva',
                `Huésped: ${booking.guestName}\n` +
                `Entrada: ${new Date(booking.startDate).toLocaleDateString('es-ES')}\n` +
                `Salida: ${new Date(booking.endDate).toLocaleDateString('es-ES')}\n` +
                `Precio: ${booking.totalPrice || 0}€\n` +
                `Origen: ${booking.source === 'manual' ? 'Manual' : 'Booking.com'}`,
                [{ text: 'Cerrar', style: 'cancel' }]
            );
        }
    };

    const handleOpenNewBooking = () => {
        const today = new Date();
        const endDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

        setNewBooking({
            guestName: '',
            guestCount: 2,
            startDate: today,
            endDate: endDate,
            pricePerNight: '',
        });
        setShowNewBookingModal(true);
    };

    const handleOpenDatePicker = (type: 'start' | 'end') => {
        setDatePickerType(type);
        setShowDatePicker(true);
    };

    const handleDateSelected = (day: DateData) => {
        const selectedDate = new Date(day.dateString);

        if (datePickerType === 'start') {
            setNewBooking({
                ...newBooking,
                startDate: selectedDate,
                // If end is before start, adjust it
                endDate: selectedDate >= newBooking.endDate
                    ? new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)
                    : newBooking.endDate
            });
        } else {
            if (selectedDate > newBooking.startDate) {
                setNewBooking({ ...newBooking, endDate: selectedDate });
            }
        }

        setShowDatePicker(false);
    };

    const handleCreateBooking = () => {
        if (!newBooking.guestName.trim()) {
            Alert.alert('Error', 'Por favor, introduzca el nombre del huésped');
            return;
        }

        if (!newBooking.pricePerNight || parseFloat(newBooking.pricePerNight) <= 0) {
            Alert.alert('Error', 'Por favor, introduzca el precio por noche');
            return;
        }

        const startStr = newBooking.startDate.toISOString();
        const endStr = newBooking.endDate.toISOString();

        const conflict = checkConflict(startStr, endStr);
        if (conflict) {
            Alert.alert(
                '⚠️ Conflicto de Fechas',
                `Las fechas seleccionadas ya están ocupadas por: ${conflict.guestName}`,
                [{ text: 'Entendido' }]
            );
            return;
        }

        addManualBooking({
            propertyId: 'default',
            guestName: newBooking.guestName,
            startDate: startStr,
            endDate: endStr,
            status: 'confirmed',
            totalPrice: parseFloat(totalPrice),
        });

        setShowNewBookingModal(false);
        Alert.alert('✅ Éxito', `Reserva creada: ${nights} noches por ${totalPrice}€`);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatDateRange = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        const nightCount = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
        return `${s.getDate()} ${s.toLocaleDateString('es-ES', { month: 'short' })} → ${e.getDate()} ${e.toLocaleDateString('es-ES', { month: 'short' })} (${nightCount} noches)`;
    };

    const renderBookingCard = (booking: Booking) => (
        <TouchableOpacity
            key={booking.id}
            style={[
                styles.bookingCard,
                { borderLeftColor: booking.source === 'manual' ? colors.primary : colors.occupied }
            ]}
            onPress={() => {
                Alert.alert(
                    '📅 ' + booking.guestName,
                    `${formatDateRange(booking.startDate, booking.endDate)}\n\n` +
                    `Precio: ${booking.totalPrice || 0}€\n` +
                    `Origen: ${booking.source === 'manual' ? 'Manual' : 'Booking.com'}\n` +
                    `Estado: ${booking.status}`,
                    [{ text: 'Cerrar', style: 'cancel' }]
                );
            }}
        >
            <View style={styles.bookingCardHeader}>
                <Text style={styles.bookingCardName}>{booking.guestName}</Text>
                <View style={[
                    styles.sourceBadge,
                    { backgroundColor: booking.source === 'manual' ? colors.primary : colors.occupied }
                ]}>
                    <Text style={styles.sourceBadgeText}>
                        {booking.source === 'manual' ? 'Manual' : 'Booking'}
                    </Text>
                </View>
            </View>
            <Text style={styles.bookingCardDates}>
                {formatDateRange(booking.startDate, booking.endDate)}
            </Text>
            {booking.totalPrice > 0 && (
                <Text style={styles.bookingCardPrice}>💰 {booking.totalPrice}€</Text>
            )}
        </TouchableOpacity>
    );

    // Get minimum date for date picker based on type
    const getMinDate = () => {
        if (datePickerType === 'start') {
            return new Date().toISOString().split('T')[0];
        }
        return new Date(newBooking.startDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* View Toggle */}
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, viewMode === 'calendar' && styles.toggleButtonActive]}
                    onPress={() => setViewMode('calendar')}
                >
                    <Text style={styles.toggleIcon}>📅</Text>
                    <Text style={[styles.toggleText, viewMode === 'calendar' && styles.toggleTextActive]}>
                        Calendario
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
                    onPress={() => setViewMode('list')}
                >
                    <Text style={styles.toggleIcon}>📋</Text>
                    <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
                        Lista
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Calendar View */}
            {viewMode === 'calendar' && (
                <>
                    <View style={styles.statsHeader}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{bookings.length}</Text>
                            <Text style={styles.statLabel}>Reservas</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>
                                {bookings.filter((b) => b.source !== 'manual').length}
                            </Text>
                            <Text style={styles.statLabel}>Booking</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>
                                {bookings.filter((b) => b.source === 'manual').length}
                            </Text>
                            <Text style={styles.statLabel}>Manuales</Text>
                        </View>
                    </View>

                    <CalendarList
                        pastScrollRange={3}
                        futureScrollRange={12}
                        scrollEnabled={true}
                        showScrollIndicator={true}
                        onDayPress={handleDayPress}
                        markingType="period"
                        markedDates={markedDates}
                        monthFormat={'MMMM yyyy'}
                        theme={{
                            backgroundColor: colors.backgroundSecondary,
                            calendarBackground: colors.background,
                            textSectionTitleColor: colors.text,
                            selectedDayBackgroundColor: colors.primary,
                            selectedDayTextColor: colors.background,
                            todayTextColor: colors.primary,
                            todayBackgroundColor: '#E3F2FD',
                            dayTextColor: colors.text,
                            textDisabledColor: colors.placeholder,
                            arrowColor: colors.primary,
                            monthTextColor: colors.text,
                            textDayFontSize: 18,
                            textMonthFontSize: 22,
                            textMonthFontWeight: '700',
                            textDayFontWeight: '600',
                        }}
                        calendarHeight={380}
                        horizontal={false}
                        pagingEnabled={false}
                    />
                </>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <ScrollView style={styles.listContainer}>
                    {bookings.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>📭</Text>
                            <Text style={styles.emptyTitle}>Sin reservas</Text>
                            <Text style={styles.emptyText}>
                                Crea tu primera reserva pulsando el botón de abajo
                            </Text>
                        </View>
                    ) : (
                        Object.entries(groupedBookings).map(([monthName, monthBookings]) => (
                            <View key={monthName} style={styles.monthGroup}>
                                <Text style={styles.monthTitle}>{monthName}</Text>
                                {monthBookings.map(renderBookingCard)}
                            </View>
                        ))
                    )}
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}

            {/* Floating Action Button */}
            <View style={styles.fabContainer}>
                <LargeTextButton
                    title="+ Nueva Reserva"
                    onPress={handleOpenNewBooking}
                    accessibilityHint="Crear una nueva reserva manual"
                />
            </View>

            {/* New Booking Modal */}
            <Modal
                visible={showNewBookingModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowNewBookingModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView style={styles.modalScroll}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Nueva Reserva</Text>

                            {/* Guest Name */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Nombre del Huésped</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newBooking.guestName}
                                    onChangeText={(text) => setNewBooking({ ...newBooking, guestName: text })}
                                    placeholder="Ej: Juan García López"
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>

                            {/* Guest Count */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Número de Huéspedes</Text>
                                <View style={styles.guestCountContainer}>
                                    <TouchableOpacity
                                        style={styles.countButton}
                                        onPress={() => setNewBooking({
                                            ...newBooking,
                                            guestCount: Math.max(1, newBooking.guestCount - 1)
                                        })}
                                    >
                                        <Text style={styles.countButtonText}>−</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.guestCountText}>{newBooking.guestCount}</Text>
                                    <TouchableOpacity
                                        style={styles.countButton}
                                        onPress={() => setNewBooking({
                                            ...newBooking,
                                            guestCount: Math.min(10, newBooking.guestCount + 1)
                                        })}
                                    >
                                        <Text style={styles.countButtonText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Check-in Date */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Fecha de Entrada</Text>
                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => handleOpenDatePicker('start')}
                                >
                                    <Text style={styles.dateIcon}>📅</Text>
                                    <Text style={styles.dateText}>{formatDate(newBooking.startDate)}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Check-out Date */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Fecha de Salida</Text>
                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => handleOpenDatePicker('end')}
                                >
                                    <Text style={styles.dateIcon}>📅</Text>
                                    <Text style={styles.dateText}>{formatDate(newBooking.endDate)}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Price per Night */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Precio por Noche (€)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newBooking.pricePerNight}
                                    onChangeText={(text) => setNewBooking({ ...newBooking, pricePerNight: text })}
                                    placeholder="Ej: 85"
                                    placeholderTextColor={colors.placeholder}
                                    keyboardType="numeric"
                                />
                            </View>

                            {/* Summary */}
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryTitle}>📋 Resumen</Text>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Noches:</Text>
                                    <Text style={styles.summaryValue}>{nights}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Huéspedes:</Text>
                                    <Text style={styles.summaryValue}>{newBooking.guestCount}</Text>
                                </View>
                                <View style={styles.summaryDivider} />
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabelTotal}>TOTAL:</Text>
                                    <Text style={styles.summaryValueTotal}>{totalPrice} €</Text>
                                </View>
                            </View>

                            <View style={styles.modalButtons}>
                                <LargeTextButton title="Guardar Reserva" onPress={handleCreateBooking} />
                                <View style={{ height: spacing.md }} />
                                <LargeTextButton
                                    title="Cancelar"
                                    onPress={() => setShowNewBookingModal(false)}
                                    variant="secondary"
                                />
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Date Picker Modal - Cross-platform */}
            <Modal
                visible={showDatePicker}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowDatePicker(false)}
            >
                <View style={styles.datePickerOverlay}>
                    <View style={styles.datePickerContainer}>
                        <Text style={styles.datePickerTitle}>
                            {datePickerType === 'start' ? '📅 Fecha de Entrada' : '📅 Fecha de Salida'}
                        </Text>
                        <Calendar
                            onDayPress={handleDateSelected}
                            minDate={getMinDate()}
                            markedDates={{
                                [datePickerType === 'start'
                                    ? newBooking.startDate.toISOString().split('T')[0]
                                    : newBooking.endDate.toISOString().split('T')[0]
                                ]: { selected: true, selectedColor: colors.primary }
                            }}
                            theme={{
                                backgroundColor: colors.background,
                                calendarBackground: colors.background,
                                todayTextColor: colors.primary,
                                dayTextColor: colors.text,
                                textDisabledColor: colors.placeholder,
                                arrowColor: colors.primary,
                                monthTextColor: colors.text,
                                textDayFontSize: 18,
                                textMonthFontSize: 20,
                                textMonthFontWeight: '700',
                            }}
                        />
                        <TouchableOpacity
                            style={styles.datePickerCancel}
                            onPress={() => setShowDatePicker(false)}
                        >
                            <Text style={styles.datePickerCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        padding: spacing.sm,
        borderBottomWidth: 2,
        borderBottomColor: colors.border,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        marginHorizontal: spacing.xs,
    },
    toggleButtonActive: {
        backgroundColor: colors.primary,
    },
    toggleIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    toggleText: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
    },
    toggleTextActive: {
        color: colors.background,
    },
    statsHeader: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 2,
        borderBottomColor: colors.border,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.border,
    },
    statNumber: {
        fontSize: typography.fontSize.title,
        fontWeight: '700',
        color: colors.text,
    },
    statLabel: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
    },
    listContainer: {
        flex: 1,
        padding: spacing.lg,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyIcon: {
        fontSize: 60,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        fontSize: typography.fontSize.title,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    monthGroup: {
        marginBottom: spacing.xl,
    },
    monthTitle: {
        fontSize: typography.fontSize.large,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: spacing.md,
        textTransform: 'capitalize',
    },
    bookingCard: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    bookingCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    bookingCardName: {
        fontSize: typography.fontSize.body,
        fontWeight: '700',
        color: colors.text,
    },
    sourceBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    sourceBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.background,
    },
    bookingCardDates: {
        fontSize: typography.fontSize.body,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    bookingCardPrice: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.success,
    },
    fabContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.lg,
        backgroundColor: colors.background,
        borderTopWidth: 2,
        borderTopColor: colors.border,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalScroll: {
        flex: 1,
        marginTop: 60,
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius.lg,
        borderTopRightRadius: borderRadius.lg,
        padding: spacing.xl,
        minHeight: '100%',
    },
    modalTitle: {
        fontSize: typography.fontSize.title,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    inputLabel: {
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
    guestCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    countButton: {
        width: 60,
        height: 60,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countButtonText: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.background,
    },
    guestCountText: {
        fontSize: typography.fontSize.header,
        fontWeight: '700',
        color: colors.text,
        marginHorizontal: spacing.xl,
        minWidth: 50,
        textAlign: 'center',
    },
    dateButton: {
        height: touchTarget.minimum,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    dateIcon: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    dateText: {
        fontSize: typography.fontSize.body,
        color: colors.text,
        fontWeight: '600',
    },
    summaryCard: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        borderWidth: 2,
        borderColor: colors.primary,
        marginTop: spacing.md,
    },
    summaryTitle: {
        fontSize: typography.fontSize.large,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    summaryLabel: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
    },
    summaryValue: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
    },
    summaryDivider: {
        height: 2,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
    },
    summaryLabelTotal: {
        fontSize: typography.fontSize.large,
        fontWeight: '700',
        color: colors.text,
    },
    summaryValueTotal: {
        fontSize: typography.fontSize.title,
        fontWeight: '700',
        color: colors.success,
    },
    modalButtons: {
        marginTop: spacing.xl,
        marginBottom: spacing.xxl,
    },
    // Date Picker Modal styles
    datePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    datePickerContainer: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        maxWidth: 400,
        alignSelf: 'center',
        width: '100%',
    },
    datePickerTitle: {
        fontSize: typography.fontSize.large,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    datePickerCancel: {
        marginTop: spacing.md,
        padding: spacing.md,
        alignItems: 'center',
    },
    datePickerCancelText: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        fontWeight: '600',
    },
});
