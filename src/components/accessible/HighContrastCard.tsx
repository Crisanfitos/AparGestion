/**
 * HighContrastCard - Accessible container for seniors
 * - High contrast borders
 * - Clear visual hierarchy
 * - Large text support
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/src/core/theme';

interface HighContrastCardProps {
    title?: string;
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error';
    style?: ViewStyle;
}

export function HighContrastCard({
    title,
    children,
    variant = 'default',
    style,
}: HighContrastCardProps) {
    const cardStyles = [
        styles.card,
        variant === 'success' && styles.successCard,
        variant === 'warning' && styles.warningCard,
        variant === 'error' && styles.errorCard,
        style,
    ];

    return (
        <View style={cardStyles} accessibilityRole="summary">
            {title && (
                <Text style={styles.title} accessibilityRole="header">
                    {title}
                </Text>
            )}
            <View style={styles.content}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.background,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginVertical: spacing.sm,
    },
    successCard: {
        borderColor: colors.success,
        borderLeftWidth: 6,
    },
    warningCard: {
        borderColor: colors.warning,
        borderLeftWidth: 6,
    },
    errorCard: {
        borderColor: colors.error,
        borderLeftWidth: 6,
    },
    title: {
        fontSize: typography.fontSize.large,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
    },
    content: {
        // Content wrapper
    },
});
