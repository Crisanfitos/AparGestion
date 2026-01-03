/**
 * Calendar Screen - Main booking calendar view
 * Uses vertical CalendarList for senior-friendly scrolling
 */
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarList, DateData } from 'react-native-calendars';

import { colors, typography, spacing, borderRadius, touchTarget } from '@/src/core/theme';
import { HighContrastCard, LargeTextButton } from '@/src/components/accessible';
import { useCalendarStore } from '@/src/core/stores';
import { useBookingSync } from '@/src/features/calendar/hooks/useBookingSync';

// Spanish locale
const LOCALE_CONFIG = {
  monthNames: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy',
};

export default function CalendarScreen() {
  const { bookings, lastSyncDate, isLoading } = useCalendarStore();
  const { isSyncing, addManualBooking, checkConflict } = useBookingSync();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [newBooking, setNewBooking] = useState({
    guestName: '',
    startDate: '',
    endDate: '',
    totalPrice: '',
  });

  // Convert bookings to calendar marked dates format
  const markedDates = useMemo(() => {
    const marks: { [key: string]: any } = {};

    bookings.forEach((booking) => {
      const start = new Date(booking.startDate);
      const end = new Date(booking.endDate);

      // Mark all days in the booking range
      const current = new Date(start);
      while (current < end) {
        const dateStr = current.toISOString().split('T')[0];

        const isStart = current.getTime() === start.getTime();
        const isEnd = current.getTime() === new Date(end.getTime() - 86400000).getTime();

        marks[dateStr] = {
          marked: true,
          customStyles: {
            container: {
              backgroundColor: booking.source === 'manual' ? colors.primary : colors.occupied,
              borderRadius: isStart ? 8 : isEnd ? 8 : 0,
              borderTopLeftRadius: isStart ? 8 : 0,
              borderBottomLeftRadius: isStart ? 8 : 0,
              borderTopRightRadius: isEnd ? 8 : 0,
              borderBottomRightRadius: isEnd ? 8 : 0,
            },
            text: {
              color: colors.background,
              fontWeight: '700',
            },
          },
          startingDay: isStart,
          endingDay: isEnd,
          color: booking.source === 'manual' ? colors.primary : colors.occupied,
          textColor: colors.background,
        };

        current.setDate(current.getDate() + 1);
      }
    });

    // Mark selected date
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

    // Check if there's a booking on this date
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
        `Origen: ${booking.source === 'manual' ? 'Manual' : 'Booking.com'}`,
        [{ text: 'Cerrar', style: 'cancel' }]
      );
    } else {
      // Offer to create new booking
      setNewBooking({
        ...newBooking,
        startDate: day.dateString,
        endDate: '',
      });
    }
  };

  const handleCreateBooking = () => {
    if (!newBooking.guestName || !newBooking.startDate || !newBooking.endDate) {
      Alert.alert('Error', 'Por favor, complete todos los campos');
      return;
    }

    // Check for conflicts
    const conflict = checkConflict(newBooking.startDate, newBooking.endDate);
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
      startDate: new Date(newBooking.startDate).toISOString(),
      endDate: new Date(newBooking.endDate).toISOString(),
      status: 'confirmed',
      totalPrice: parseFloat(newBooking.totalPrice) || 0,
    });

    setShowNewBookingModal(false);
    setNewBooking({ guestName: '', startDate: '', endDate: '', totalPrice: '' });
    Alert.alert('✅ Éxito', 'Reserva creada correctamente');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Stats Header */}
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

      {/* Calendar - Vertical Scroll */}
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
          textDisabledColor: colors.textSecondary,
          dotColor: colors.primary,
          selectedDotColor: colors.background,
          arrowColor: colors.primary,
          monthTextColor: colors.text,
          textDayFontSize: 18,
          textMonthFontSize: 22,
          textMonthFontWeight: '700',
          textDayFontWeight: '600',
          textDayHeaderFontSize: 14,
          textDayHeaderFontWeight: '600',
          'stylesheet.calendar.header': {
            monthText: {
              fontSize: 22,
              fontWeight: '700',
              color: colors.text,
              margin: 10,
            },
          },
        }}
        calendarWidth={undefined}
        calendarHeight={380}
        horizontal={false}
        pagingEnabled={false}
        staticHeader={false}
      />

      {/* New Booking Button */}
      <View style={styles.fabContainer}>
        <LargeTextButton
          title="+ Nueva Reserva"
          onPress={() => setShowNewBookingModal(true)}
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nueva Reserva</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre del Huésped</Text>
              <TextInput
                style={styles.input}
                value={newBooking.guestName}
                onChangeText={(text) => setNewBooking({ ...newBooking, guestName: text })}
                placeholder="Nombre completo"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fecha Entrada (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={newBooking.startDate}
                onChangeText={(text) => setNewBooking({ ...newBooking, startDate: text })}
                placeholder="2025-01-15"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fecha Salida (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={newBooking.endDate}
                onChangeText={(text) => setNewBooking({ ...newBooking, endDate: text })}
                placeholder="2025-01-20"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Precio Total (€)</Text>
              <TextInput
                style={styles.input}
                value={newBooking.totalPrice}
                onChangeText={(text) => setNewBooking({ ...newBooking, totalPrice: text })}
                placeholder="500"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtons}>
              <LargeTextButton
                title="Guardar"
                onPress={handleCreateBooking}
              />
              <View style={{ height: spacing.md }} />
              <LargeTextButton
                title="Cancelar"
                onPress={() => setShowNewBookingModal(false)}
                variant="secondary"
              />
            </View>
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
  fabContainer: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: typography.fontSize.title,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.md,
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
  },
  modalButtons: {
    marginTop: spacing.lg,
  },
});
