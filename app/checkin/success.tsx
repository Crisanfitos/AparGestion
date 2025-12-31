/**
 * Check-in Success Page
 * Shown after successful guest check-in
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, typography, spacing } from '@/src/core/theme';

export default function CheckInSuccessScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.emoji}>✅</Text>
                <Text style={styles.title}>¡Check-in Completado!</Text>
                <Text style={styles.message}>
                    Sus datos han sido registrados correctamente.
                </Text>
                <Text style={styles.info}>
                    El propietario ha sido notificado de su llegada.
                </Text>
                <View style={styles.divider} />
                <Text style={styles.footer}>
                    Gracias por usar AparGestión
                </Text>
            </View>
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
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emoji: {
        fontSize: 80,
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: typography.fontSize.header,
        fontWeight: '700',
        color: colors.success,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    message: {
        fontSize: typography.fontSize.large,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    info: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    divider: {
        width: 100,
        height: 2,
        backgroundColor: colors.border,
        marginVertical: spacing.xl,
    },
    footer: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
    },
});
