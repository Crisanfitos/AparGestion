/**
 * Password Input Component
 * Text input with show/hide toggle for passwords
 */
import { borderRadius, colors, spacing, touchTarget, typography } from '@/src/core/theme';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
} from 'react-native';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    label?: string;
    error?: string;
}

export function PasswordInput({
    value,
    onChangeText,
    placeholder = 'Contraseña',
    label,
    error,
    ...props
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}

            <View style={[
                styles.inputContainer,
                error && styles.inputContainerError,
            ]}>
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.placeholder}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    {...props}
                />

                <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                    <Text style={styles.toggleIcon}>
                        {showPassword ? '🙈' : '👁️'}
                    </Text>
                </TouchableOpacity>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        backgroundColor: colors.background,
    },
    inputContainerError: {
        borderColor: colors.error,
    },
    input: {
        flex: 1,
        height: touchTarget.minimum,
        paddingHorizontal: spacing.md,
        fontSize: typography.fontSize.body,
        color: colors.text,
    },
    toggleButton: {
        width: touchTarget.minimum,
        height: touchTarget.minimum,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleIcon: {
        fontSize: 20,
    },
    errorText: {
        fontSize: typography.fontSize.small,
        color: colors.error,
        marginTop: spacing.xs,
    },
});

export default PasswordInput;
