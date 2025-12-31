/**
 * LargeTextButton - Accessible button for seniors
 * - Minimum 60dp touch target
 * - High contrast colors
 * - Multi-sensory feedback (visual + haptic)
 */
import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography, touchTarget, borderRadius, spacing } from '@/src/core/theme';

interface LargeTextButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    accessibilityLabel?: string;
    accessibilityHint?: string;
}

export function LargeTextButton({
    title,
    onPress,
    variant = 'primary',
    disabled = false,
    style,
    textStyle,
    accessibilityLabel,
    accessibilityHint,
}: LargeTextButtonProps) {

    const handlePress = async () => {
        // Haptic feedback on press
        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onPress();
    };

    const buttonStyles = [
        styles.button,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'danger' && styles.dangerButton,
        disabled && styles.disabledButton,
        style,
    ];

    const textStyles = [
        styles.text,
        variant === 'secondary' && styles.secondaryText,
        disabled && styles.disabledText,
        textStyle,
    ];

    return (
        <TouchableOpacity
            style={buttonStyles}
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || title}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled }}
        >
            <Text style={textStyles}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        minHeight: touchTarget.minimum,
        minWidth: touchTarget.minimum,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: colors.primary,
    },
    secondaryButton: {
        backgroundColor: colors.background,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    dangerButton: {
        backgroundColor: colors.error,
    },
    disabledButton: {
        backgroundColor: colors.border,
        opacity: 0.6,
    },
    text: {
        color: colors.background,
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        textAlign: 'center',
    },
    secondaryText: {
        color: colors.primary,
    },
    disabledText: {
        color: colors.textSecondary,
    },
});
