/**
 * Profile Screen
 * Shows user profile with edit capability
 * Data persists to Supabase
 */
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HighContrastCard, LargeTextButton } from '@/src/components/accessible';
import {
    getMyProfile,
    Profile,
    updateMyProfile,
    uploadAvatar
} from '@/src/core/services/profileService';
import { useAuthStore } from '@/src/core/stores';
import { borderRadius, colors, spacing, touchTarget, typography } from '@/src/core/theme';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();

    // Profile state
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');

    // Load profile on mount
    const loadProfile = useCallback(async () => {
        const result = await getMyProfile();
        if (result.success && result.data) {
            setProfile(result.data);
            setEditName(result.data.full_name || '');
            setEditPhone(result.data.phone || '');
        }
        setIsLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadProfile();
    }, [loadProfile]);

    // Handle save profile
    const handleSaveProfile = async () => {
        setIsSaving(true);

        const result = await updateMyProfile({
            full_name: editName.trim(),
            phone: editPhone.trim() || null,
        });

        setIsSaving(false);

        if (result.success) {
            setProfile(result.data || null);
            setIsEditing(false);
            Alert.alert('✅ Guardado', 'Perfil actualizado correctamente');
        } else {
            Alert.alert('Error', result.error || 'No se pudo guardar');
        }
    };

    // Handle avatar pick
    const handlePickAvatar = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para cambiar la foto');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setIsUploadingAvatar(true);

            const uploadResult = await uploadAvatar(result.assets[0].uri);

            setIsUploadingAvatar(false);

            if (uploadResult.success && uploadResult.url) {
                setProfile(prev => prev ? { ...prev, avatar_url: uploadResult.url! } : null);
                Alert.alert('✅ Foto actualizada', 'Tu foto de perfil se ha guardado');
            } else {
                Alert.alert('Error', uploadResult.error || 'No se pudo subir la foto');
            }
        }
    };

    // Display name
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario';

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Cargando perfil...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Profile Header with Avatar */}
                <View style={styles.profileHeader}>
                    <TouchableOpacity
                        style={styles.avatarContainer}
                        onPress={handlePickAvatar}
                        disabled={isUploadingAvatar}
                    >
                        {isUploadingAvatar ? (
                            <View style={styles.avatar}>
                                <ActivityIndicator color={colors.background} />
                            </View>
                        ) : profile?.avatar_url ? (
                            <Image
                                source={{ uri: profile.avatar_url }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {displayName[0]?.toUpperCase() || '👤'}
                                </Text>
                            </View>
                        )}
                        <View style={styles.avatarEditBadge}>
                            <Text style={styles.avatarEditIcon}>📷</Text>
                        </View>
                    </TouchableOpacity>

                    {isEditing ? (
                        <View style={styles.editNameContainer}>
                            <TextInput
                                style={styles.nameInput}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Tu nombre"
                                placeholderTextColor={colors.placeholder}
                            />
                        </View>
                    ) : (
                        <Text style={styles.userName}>{displayName}</Text>
                    )}
                    <Text style={styles.userEmail}>{profile?.email || user?.email || 'No conectado'}</Text>
                </View>

                {/* Edit Profile Card */}
                {isEditing ? (
                    <HighContrastCard title="✏️ Editar Perfil">
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Teléfono</Text>
                            <TextInput
                                style={styles.input}
                                value={editPhone}
                                onChangeText={setEditPhone}
                                placeholder="+34 612 345 678"
                                placeholderTextColor={colors.placeholder}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.editButtons}>
                            <LargeTextButton
                                title={isSaving ? "Guardando..." : "Guardar"}
                                onPress={handleSaveProfile}
                                disabled={isSaving}
                            />
                            <View style={{ height: spacing.sm }} />
                            <LargeTextButton
                                title="Cancelar"
                                onPress={() => {
                                    setIsEditing(false);
                                    setEditName(profile?.full_name || '');
                                    setEditPhone(profile?.phone || '');
                                }}
                                variant="secondary"
                            />
                        </View>
                    </HighContrastCard>
                ) : (
                    <HighContrastCard title="👤 Datos Personales">
                        <View style={styles.dataRow}>
                            <Text style={styles.dataLabel}>Nombre</Text>
                            <Text style={styles.dataValue}>{profile?.full_name || '-'}</Text>
                        </View>
                        <View style={styles.dataRow}>
                            <Text style={styles.dataLabel}>Teléfono</Text>
                            <Text style={styles.dataValue}>{profile?.phone || '-'}</Text>
                        </View>
                        <View style={styles.dataRow}>
                            <Text style={styles.dataLabel}>Cuenta creada</Text>
                            <Text style={styles.dataValue}>
                                {profile?.created_at
                                    ? new Date(profile.created_at).toLocaleDateString('es-ES')
                                    : '-'}
                            </Text>
                        </View>
                        <View style={styles.editButtonContainer}>
                            <LargeTextButton
                                title="✏️ Editar Perfil"
                                onPress={() => setIsEditing(true)}
                                variant="secondary"
                            />
                        </View>
                    </HighContrastCard>
                )}

                {/* Settings Card */}
                <HighContrastCard title="⚙️ Configuración">
                    <Text style={styles.emptyText}>
                        Notificaciones, biometría y más
                    </Text>
                    <View style={styles.buttonRow}>
                        <LargeTextButton
                            title="⚙️ Abrir Configuración"
                            onPress={() => router.push('/settings')}
                            variant="secondary"
                        />
                    </View>
                </HighContrastCard>

                {/* Properties Card */}
                <HighContrastCard title="🏠 Mis Alojamientos">
                    <Text style={styles.emptyText}>
                        Gestiona tus propiedades de alquiler
                    </Text>
                    <View style={styles.buttonRow}>
                        <LargeTextButton
                            title="🏠 Ver Alojamientos"
                            onPress={() => router.push('/properties')}
                            accessibilityHint="Ver y gestionar tus alojamientos"
                        />
                    </View>
                </HighContrastCard>

                {/* Logout */}
                <View style={styles.logoutContainer}>
                    <LargeTextButton
                        title="Cerrar Sesión"
                        onPress={() => {
                            Alert.alert(
                                'Cerrar Sesión',
                                '¿Seguro que quieres salir?',
                                [
                                    { text: 'Cancelar', style: 'cancel' },
                                    { text: 'Salir', style: 'destructive', onPress: logout }
                                ]
                            );
                        }}
                        variant="danger"
                        accessibilityHint="Cerrar sesión de la aplicación"
                    />
                </View>

                <Text style={styles.versionText}>
                    AparGestión v1.0.0
                </Text>
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
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: 16,
        color: colors.textSecondary,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: spacing.md,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarText: {
        fontSize: 40,
        color: colors.background,
        fontWeight: '700',
    },
    avatarEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.background,
        borderRadius: 15,
        padding: 6,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    avatarEditIcon: {
        fontSize: 16,
    },
    userName: {
        fontSize: typography.fontSize.title,
        fontWeight: '700',
        color: colors.text,
    },
    editNameContainer: {
        width: '80%',
    },
    nameInput: {
        height: touchTarget.minimum,
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        fontSize: typography.fontSize.large,
        color: colors.text,
        textAlign: 'center',
        backgroundColor: colors.background,
    },
    userEmail: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    // Data display
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dataLabel: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
    },
    dataValue: {
        fontSize: typography.fontSize.body,
        color: colors.text,
        fontWeight: '600',
    },
    editButtonContainer: {
        marginTop: spacing.lg,
    },
    // Edit form
    inputGroup: {
        marginBottom: spacing.md,
    },
    inputLabel: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
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
    editButtons: {
        marginTop: spacing.md,
    },
    // Settings
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    settingLabel: {
        fontSize: typography.fontSize.body,
        color: colors.text,
    },
    settingValue: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
    },
    emptyText: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    buttonRow: {
        marginTop: spacing.sm,
    },
    logoutContainer: {
        marginTop: spacing.xl,
    },
    versionText: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.xl,
    },
});
