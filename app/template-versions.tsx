/**
 * Template Versions Screen
 * View version history and restore previous versions
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, colors, spacing, typography } from '@/src/core/theme';
import {
    DocumentTemplate,
    TemplateVersion,
    getTemplate,
    getTemplateVersions,
    restoreVersion,
} from '@/src/features/documents/services/templateDbService';

export default function TemplateVersionsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id: string }>();

    const [template, setTemplate] = useState<DocumentTemplate | null>(null);
    const [versions, setVersions] = useState<TemplateVersion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRestoring, setIsRestoring] = useState(false);

    const loadData = useCallback(async () => {
        if (!params.id) return;

        // Load template info
        const templateResult = await getTemplate(params.id);
        if (templateResult.success && templateResult.data && !Array.isArray(templateResult.data)) {
            setTemplate(templateResult.data);
        }

        // Load versions
        const versionsResult = await getTemplateVersions(params.id);
        if (versionsResult.success && Array.isArray(versionsResult.data)) {
            setVersions(versionsResult.data);
        }

        setIsLoading(false);
    }, [params.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRestore = (version: TemplateVersion) => {
        Alert.alert(
            'Restaurar versión',
            `¿Restaurar la versión ${version.version_number}?\n\nSe creará una copia de seguridad de la versión actual antes de restaurar.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Restaurar',
                    onPress: async () => {
                        setIsRestoring(true);

                        const result = await restoreVersion(params.id!, version.id);

                        setIsRestoring(false);

                        if (result.success) {
                            Alert.alert(
                                '✅ Restaurado',
                                `Versión ${version.version_number} restaurada correctamente`,
                                [{ text: 'OK', onPress: () => router.back() }]
                            );
                        } else {
                            Alert.alert('Error', result.error || 'No se pudo restaurar');
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderVersion = ({ item, index }: { item: TemplateVersion; index: number }) => {
        const isLatest = index === 0;

        return (
            <View style={[styles.versionCard, isLatest && styles.latestVersion]}>
                <View style={styles.versionHeader}>
                    <View style={styles.versionBadge}>
                        <Text style={styles.versionNumber}>v{item.version_number}</Text>
                    </View>
                    <Text style={styles.versionDate}>{formatDate(item.created_at)}</Text>
                    {isLatest && (
                        <View style={styles.latestBadge}>
                            <Text style={styles.latestBadgeText}>Actual</Text>
                        </View>
                    )}
                </View>

                {item.change_summary && (
                    <Text style={styles.changeSummary}>{item.change_summary}</Text>
                )}

                <View style={styles.versionMeta}>
                    <Text style={styles.variablesCount}>
                        {item.variables?.length || 0} variables
                    </Text>
                    <Text style={styles.contentSize}>
                        {(item.html_content?.length || 0).toLocaleString()} caracteres
                    </Text>
                </View>

                {!isLatest && (
                    <TouchableOpacity
                        style={styles.restoreButton}
                        onPress={() => handleRestore(item)}
                        disabled={isRestoring}
                    >
                        <Text style={styles.restoreButtonText}>
                            {isRestoring ? 'Restaurando...' : '🔄 Restaurar esta versión'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ title: '📜 Historial de Versiones' }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: `📜 Versiones: ${template?.name || ''}` }} />

            {template && (
                <View style={styles.header}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <Text style={styles.totalVersions}>
                        {versions.length} {versions.length === 1 ? 'versión' : 'versiones'}
                    </Text>
                </View>
            )}

            <FlatList
                data={versions}
                renderItem={renderVersion}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No hay versiones guardadas</Text>
                        <Text style={styles.emptyHint}>
                            Las versiones se crean automáticamente al editar la plantilla
                        </Text>
                    </View>
                }
            />
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
    header: {
        backgroundColor: colors.background,
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    templateName: {
        fontSize: typography.fontSize.large,
        fontWeight: '700',
        color: colors.text,
    },
    totalVersions: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    list: {
        padding: spacing.md,
    },
    versionCard: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 2,
        borderColor: colors.border,
    },
    latestVersion: {
        borderColor: colors.primary,
    },
    versionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    versionBadge: {
        backgroundColor: colors.primary + '20',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    versionNumber: {
        fontSize: typography.fontSize.body,
        fontWeight: '700',
        color: colors.primary,
    },
    versionDate: {
        flex: 1,
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
        marginLeft: spacing.md,
    },
    latestBadge: {
        backgroundColor: colors.success + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    latestBadgeText: {
        fontSize: typography.fontSize.small,
        color: colors.success,
        fontWeight: '600',
    },
    changeSummary: {
        fontSize: typography.fontSize.body,
        color: colors.text,
        marginTop: spacing.sm,
    },
    versionMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    variablesCount: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
    },
    contentSize: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
    },
    restoreButton: {
        marginTop: spacing.md,
        backgroundColor: colors.backgroundSecondary,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    restoreButtonText: {
        fontSize: typography.fontSize.body,
        color: colors.primary,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
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
});
