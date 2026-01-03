/**
 * Properties Management Screen
 * List, add, edit, and delete rental properties
 */
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LargeTextButton } from '@/src/components/accessible';
import { borderRadius, colors, spacing } from '@/src/core/theme';
import { deleteProperty, getMyProperties, Property } from '@/src/features/properties/propertyService';

export default function PropertiesScreen() {
    const router = useRouter();
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadProperties = useCallback(async () => {
        const result = await getMyProperties();
        if (result.success && Array.isArray(result.data)) {
            setProperties(result.data);
        } else {
            Alert.alert('Error', result.error || 'No se pudieron cargar los alojamientos');
        }
        setIsLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => {
        loadProperties();
    }, [loadProperties]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadProperties();
    }, [loadProperties]);

    const handleDelete = (property: Property) => {
        Alert.alert(
            'Eliminar Alojamiento',
            `¿Seguro que quieres eliminar "${property.name}"?\n\nEsta acción no se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await deleteProperty(property.id);
                        if (result.success) {
                            setProperties(prev => prev.filter(p => p.id !== property.id));
                        } else {
                            Alert.alert('Error', result.error || 'No se pudo eliminar');
                        }
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ title: '🏠 Mis Alojamientos' }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Cargando alojamientos...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: '🏠 Mis Alojamientos' }} />

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Add Button */}
                <View style={styles.addButtonContainer}>
                    <LargeTextButton
                        title="➕ Añadir Alojamiento"
                        onPress={() => router.push('/property-form')}
                    />
                </View>

                {/* Properties List */}
                {properties.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🏠</Text>
                        <Text style={styles.emptyTitle}>No hay alojamientos</Text>
                        <Text style={styles.emptyText}>
                            Añade tu primer alojamiento para empezar a gestionar reservas
                        </Text>
                    </View>
                ) : (
                    properties.map((property) => (
                        <TouchableOpacity
                            key={property.id}
                            style={styles.propertyCard}
                            onPress={() => router.push(`/property-form?id=${property.id}`)}
                            accessibilityLabel={`Editar ${property.name}`}
                        >
                            <View style={styles.propertyHeader}>
                                <View style={styles.propertyInfo}>
                                    <Text style={styles.propertyName}>{property.name}</Text>
                                    <Text style={styles.propertyLocation}>
                                        📍 {property.city || 'Sin ciudad'}
                                    </Text>
                                </View>
                                <View style={[
                                    styles.statusBadge,
                                    property.is_active ? styles.activeBadge : styles.inactiveBadge
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        property.is_active ? styles.activeText : styles.inactiveText
                                    ]}>
                                        {property.is_active ? 'Activo' : 'Pausado'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.propertyDetails}>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailIcon}>🛏️</Text>
                                    <Text style={styles.detailText}>{property.bedrooms} hab</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailIcon}>🚿</Text>
                                    <Text style={styles.detailText}>{property.bathrooms} baño</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailIcon}>👥</Text>
                                    <Text style={styles.detailText}>{property.max_guests} huésp.</Text>
                                </View>
                                {property.price_per_night && (
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailIcon}>💰</Text>
                                        <Text style={styles.detailText}>{property.price_per_night}€/noche</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.propertyActions}>
                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => router.push(`/property-form?id=${property.id}`)}
                                >
                                    <Text style={styles.editButtonText}>✏️ Editar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDelete(property)}
                                >
                                    <Text style={styles.deleteButtonText}>🗑️ Eliminar</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
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
        padding: spacing.md,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: 16,
        color: colors.text,
    },
    addButtonContainer: {
        marginBottom: spacing.lg,
    },
    emptyState: {
        alignItems: 'center',
        padding: spacing.xxl,
        marginTop: spacing.xl,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    propertyCard: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    propertyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    propertyInfo: {
        flex: 1,
    },
    propertyName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    propertyLocation: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    activeBadge: {
        backgroundColor: '#E8F5E9',
    },
    inactiveBadge: {
        backgroundColor: '#FFF3E0',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    activeText: {
        color: '#2E7D32',
    },
    inactiveText: {
        color: '#E65100',
    },
    propertyDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailIcon: {
        fontSize: 16,
        marginRight: 4,
    },
    detailText: {
        fontSize: 14,
        color: colors.text,
    },
    propertyActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    editButton: {
        flex: 1,
        backgroundColor: '#E3F2FD',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    editButtonText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    deleteButton: {
        flex: 1,
        backgroundColor: '#FFEBEE',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: colors.error,
        fontWeight: '600',
        fontSize: 14,
    },
});
