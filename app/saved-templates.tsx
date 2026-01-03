/**
 * Saved Templates Screen
 * List and manage user's saved document templates
 */
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LargeTextButton } from '@/src/components/accessible';
import { borderRadius, colors, spacing, typography } from '@/src/core/theme';
import {
    DocumentTemplate,
    deleteTemplate,
    getMyTemplates,
    setDefaultTemplate,
} from '@/src/features/documents/services/templateDbService';

export default function SavedTemplatesScreen() {
    const router = useRouter();
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadTemplates = useCallback(async () => {
        const result = await getMyTemplates();
        if (result.success && Array.isArray(result.data)) {
            setTemplates(result.data);
        }
        setIsLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadTemplates();
    }, [loadTemplates]);

    const handleDelete = (template: DocumentTemplate) => {
        Alert.alert(
            'Eliminar plantilla',
            `¿Seguro que quieres eliminar "${template.name}"?\n\nEsto también eliminará todas las versiones.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await deleteTemplate(template.id);
                        if (result.success) {
                            setTemplates(prev => prev.filter(t => t.id !== template.id));
                            Alert.alert('Eliminado', 'Plantilla eliminada correctamente');
                        } else {
                            Alert.alert('Error', result.error || 'No se pudo eliminar');
                        }
                    },
                },
            ]
        );
    };

    const handleSetDefault = async (template: DocumentTemplate) => {
        const result = await setDefaultTemplate(template.id);
        if (result.success) {
            loadTemplates(); // Refresh to update UI
            Alert.alert('✅ Plantilla por defecto', `"${template.name}" es ahora la plantilla por defecto para ${getTypeName(template.type)}`);
        } else {
            Alert.alert('Error', result.error || 'No se pudo establecer como defecto');
        }
    };

    const getTypeIcon = (type: string | null) => {
        switch (type) {
            case 'contract': return '📝';
            case 'invoice': return '🧾';
            case 'checkin': return '🏨';
            default: return '📄';
        }
    };

    const getTypeName = (type: string | null) => {
        switch (type) {
            case 'contract': return 'Contratos';
            case 'invoice': return 'Facturas';
            case 'checkin': return 'Check-in';
            default: return 'Otros';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const renderTemplate = ({ item }: { item: DocumentTemplate }) => (
        <TouchableOpacity
            style={styles.templateCard}
            onPress={() => router.push(`/template-editor?id=${item.id}`)}
            onLongPress={() => handleDelete(item)}
            accessibilityLabel={`Plantilla ${item.name}`}
            accessibilityHint="Pulsa para editar, mantén pulsado para eliminar"
        >
            <View style={styles.templateHeader}>
                <Text style={styles.templateIcon}>{getTypeIcon(item.type)}</Text>
                <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>{item.name}</Text>
                    <Text style={styles.templateType}>{getTypeName(item.type)}</Text>
                </View>
                {item.is_default && (
                    <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>⭐ Defecto</Text>
                    </View>
                )}
            </View>

            <View style={styles.templateMeta}>
                <Text style={styles.templateDate}>
                    Actualizada: {formatDate(item.updated_at)}
                </Text>
                {item.variables && item.variables.length > 0 && (
                    <Text style={styles.templateVariables}>
                        {item.variables.length} variables
                    </Text>
                )}
            </View>

            <View style={styles.templateActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push(`/template-versions?id=${item.id}`)}
                >
                    <Text style={styles.actionButtonText}>📜 Versiones</Text>
                </TouchableOpacity>

                {!item.is_default && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleSetDefault(item)}
                    >
                        <Text style={styles.actionButtonText}>⭐ Defecto</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ title: '📁 Mis Plantillas' }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Cargando plantillas...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: '📁 Mis Plantillas' }} />

            <FlatList
                data={templates}
                renderItem={renderTemplate}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📄</Text>
                        <Text style={styles.emptyText}>No tienes plantillas guardadas</Text>
                        <Text style={styles.emptyHint}>
                            Crea una plantilla desde la sección de Documentos
                        </Text>
                    </View>
                }
            />

            <View style={styles.footer}>
                <LargeTextButton
                    title="➕ Crear Nueva Plantilla"
                    onPress={() => router.push('/template-editor')}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
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
    list: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    templateCard: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 2,
        borderColor: colors.border,
    },
    templateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    templateIcon: {
        fontSize: 32,
        marginRight: spacing.md,
    },
    templateInfo: {
        flex: 1,
    },
    templateName: {
        fontSize: typography.fontSize.large,
        fontWeight: '700',
        color: colors.text,
    },
    templateType: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
    },
    defaultBadge: {
        backgroundColor: colors.warning + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    defaultBadgeText: {
        fontSize: typography.fontSize.small,
        color: colors.warning,
        fontWeight: '600',
    },
    templateMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    templateDate: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
    },
    templateVariables: {
        fontSize: typography.fontSize.small,
        color: colors.primary,
    },
    templateActions: {
        flexDirection: 'row',
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    actionButton: {
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    actionButtonText: {
        fontSize: typography.fontSize.small,
        color: colors.text,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyIcon: {
        fontSize: 60,
        marginBottom: spacing.md,
    },
    emptyText: {
        fontSize: typography.fontSize.large,
        fontWeight: '600',
        color: colors.text,
    },
    emptyHint: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.md,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
});
