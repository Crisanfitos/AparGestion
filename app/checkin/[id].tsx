/**
 * Guest Check-in Page (Web)
 * Dynamic route: /checkin/[id]
 * Accessible via web browser for guests to complete check-in
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    Platform,
    Alert,
    TouchableOpacity,
    Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { colors, typography, spacing, borderRadius, touchTarget } from '@/src/core/theme';
import { LargeTextButton } from '@/src/components/accessible';
import { HighContrastCard } from '@/src/components/accessible';

export default function CheckInScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const [formData, setFormData] = useState({
        fullName: '',
        documentType: 'dni' as 'dni' | 'passport',
        documentNumber: '',
        nationality: '',
        phone: '',
        email: '',
    });
    const [documentPhoto, setDocumentPhoto] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.fullName.trim()) {
            newErrors.fullName = 'El nombre es obligatorio';
        }
        if (!formData.documentNumber.trim()) {
            newErrors.documentNumber = 'El número de documento es obligatorio';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePickDocument = async () => {
        try {
            // Request permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso Necesario', 'Necesitamos acceso a sus fotos para subir el documento');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setDocumentPhoto(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
        }
    };

    const handleTakePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso Necesario', 'Necesitamos acceso a la cámara');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setDocumentPhoto(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error taking photo:', error);
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            console.log('Check-in submitted:', {
                bookingId: id,
                ...formData,
                hasDocument: !!documentPhoto,
            });

            // Navigate to success
            router.replace('/checkin/success');
        } catch (error) {
            Alert.alert('Error', 'No se pudo completar el check-in. Por favor, inténtelo de nuevo.');
            console.error('Check-in error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>🏠</Text>
                    <Text style={styles.title}>Check-in Online</Text>
                    <Text style={styles.subtitle}>
                        Complete sus datos para el registro de entrada
                    </Text>
                    <View style={styles.bookingBadge}>
                        <Text style={styles.bookingId}>Reserva: {id || 'Prueba'}</Text>
                    </View>
                </View>

                {/* Guest Information */}
                <HighContrastCard title="👤 Datos del Huésped">
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Nombre Completo *</Text>
                        <TextInput
                            style={[styles.input, errors.fullName && styles.inputError]}
                            value={formData.fullName}
                            onChangeText={(text) => {
                                setFormData({ ...formData, fullName: text });
                                if (errors.fullName) setErrors({ ...errors, fullName: '' });
                            }}
                            placeholder="Ej: Juan García López"
                            placeholderTextColor={colors.placeholder}
                            accessibilityLabel="Nombre completo"
                        />
                        {errors.fullName && (
                            <Text style={styles.errorText}>⚠️ {errors.fullName}</Text>
                        )}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Tipo de Documento</Text>
                        <View style={styles.radioGroup}>
                            <TouchableOpacity
                                style={[
                                    styles.radioButton,
                                    formData.documentType === 'dni' && styles.radioButtonActive,
                                ]}
                                onPress={() => setFormData({ ...formData, documentType: 'dni' })}
                            >
                                <Text style={[
                                    styles.radioText,
                                    formData.documentType === 'dni' && styles.radioTextActive,
                                ]}>
                                    DNI
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.radioButton,
                                    formData.documentType === 'passport' && styles.radioButtonActive,
                                ]}
                                onPress={() => setFormData({ ...formData, documentType: 'passport' })}
                            >
                                <Text style={[
                                    styles.radioText,
                                    formData.documentType === 'passport' && styles.radioTextActive,
                                ]}>
                                    Pasaporte
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Número de Documento *</Text>
                        <TextInput
                            style={[styles.input, errors.documentNumber && styles.inputError]}
                            value={formData.documentNumber}
                            onChangeText={(text) => {
                                setFormData({ ...formData, documentNumber: text });
                                if (errors.documentNumber) setErrors({ ...errors, documentNumber: '' });
                            }}
                            placeholder="Ej: 12345678A"
                            placeholderTextColor={colors.placeholder}
                            autoCapitalize="characters"
                        />
                        {errors.documentNumber && (
                            <Text style={styles.errorText}>⚠️ {errors.documentNumber}</Text>
                        )}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Nacionalidad</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.nationality}
                            onChangeText={(text) => setFormData({ ...formData, nationality: text })}
                            placeholder="Ej: Española"
                            placeholderTextColor={colors.placeholder}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Teléfono de Contacto</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.phone}
                            onChangeText={(text) => setFormData({ ...formData, phone: text })}
                            placeholder="Ej: +34 600 123 456"
                            placeholderTextColor={colors.placeholder}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            placeholder="Ej: su.email@ejemplo.com"
                            placeholderTextColor={colors.placeholder}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </HighContrastCard>

                {/* Document Photo */}
                <HighContrastCard title="📷 Foto del Documento">
                    <Text style={styles.infoText}>
                        Por favor, suba una foto clara de su documento de identidad (anverso).
                    </Text>

                    {documentPhoto ? (
                        <View style={styles.photoPreview}>
                            <Image
                                source={{ uri: documentPhoto }}
                                style={styles.previewImage}
                                resizeMode="cover"
                            />
                            <TouchableOpacity
                                style={styles.removePhotoButton}
                                onPress={() => setDocumentPhoto(null)}
                            >
                                <Text style={styles.removePhotoText}>✕ Quitar foto</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.uploadButtons}>
                            <TouchableOpacity
                                style={styles.uploadButton}
                                onPress={handleTakePhoto}
                            >
                                <Text style={styles.uploadIcon}>📸</Text>
                                <Text style={styles.uploadText}>Usar Cámara</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.uploadButton}
                                onPress={handlePickDocument}
                            >
                                <Text style={styles.uploadIcon}>📁</Text>
                                <Text style={styles.uploadText}>Subir Archivo</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </HighContrastCard>

                {/* Submit */}
                <View style={styles.submitContainer}>
                    <LargeTextButton
                        title={isSubmitting ? "Enviando..." : "✓ Completar Check-in"}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                        accessibilityHint="Enviar el formulario de check-in"
                    />

                    <Text style={styles.privacyText}>
                        Al completar el check-in, acepta el tratamiento de sus datos según la normativa vigente.
                    </Text>
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
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
        paddingTop: spacing.lg,
    },
    logo: {
        fontSize: 60,
        marginBottom: spacing.md,
    },
    title: {
        fontSize: typography.fontSize.header,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    bookingBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    bookingId: {
        color: colors.background,
        fontSize: typography.fontSize.small,
        fontWeight: '600',
    },
    formGroup: {
        marginBottom: spacing.lg,
    },
    label: {
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
    inputError: {
        borderColor: colors.error,
    },
    errorText: {
        color: colors.error,
        fontSize: typography.fontSize.small,
        marginTop: spacing.xs,
    },
    radioGroup: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    radioButton: {
        flex: 1,
        height: touchTarget.minimum,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    radioButtonActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },
    radioText: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
    },
    radioTextActive: {
        color: colors.background,
    },
    infoText: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    uploadButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    uploadButton: {
        flex: 1,
        height: 100,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.primary,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    uploadIcon: {
        fontSize: 32,
        marginBottom: spacing.sm,
    },
    uploadText: {
        fontSize: typography.fontSize.body,
        color: colors.primary,
        fontWeight: '600',
    },
    photoPreview: {
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
    },
    removePhotoButton: {
        padding: spacing.sm,
    },
    removePhotoText: {
        color: colors.error,
        fontSize: typography.fontSize.body,
        fontWeight: '600',
    },
    submitContainer: {
        marginTop: spacing.lg,
        marginBottom: spacing.xxl,
    },
    privacyText: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.md,
    },
});
