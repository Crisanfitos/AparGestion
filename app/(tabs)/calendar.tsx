/**
 * Calendar Screen - DISABLED
 * Calendar functionality is temporarily disabled while iCal integration is being improved.
 * Shows a placeholder message to the user.
 */
import React from 'react';
import {
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, colors, spacing, typography } from '@/src/core/theme';

export default function CalendarScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.disabledOverlay}>
                <Text style={styles.disabledIcon}>📅</Text>
                <Text style={styles.disabledTitle}>Calendario no disponible</Text>
                <Text style={styles.disabledText}>
                    Esta funcionalidad se encuentra temporalmente deshabilitada mientras mejoramos la integración con los calendarios externos (iCal).
                </Text>
                <View style={styles.disabledBadge}>
                    <Text style={styles.disabledBadgeText}>Proximamente</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    disabledOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    disabledIcon: {
        fontSize: 80,
        marginBottom: spacing.lg,
        opacity: 0.5,
    },
    disabledTitle: {
        fontSize: typography.fontSize.title,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    disabledText: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: spacing.xl,
        maxWidth: 320,
    },
    disabledBadge: {
        backgroundColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    disabledBadgeText: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.textSecondary,
    },
});
