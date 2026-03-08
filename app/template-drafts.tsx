/**
 * Template Drafts Screen
 * Lists and manages saved drafts for templates
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, colors, spacing } from '@/src/core/theme';
import { deleteDraft, getDraftsByType, getMyDrafts, TemplateDraft } from '@/src/features/documents/services/templateDraftService';

export default function TemplateDraftsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ filterType?: string }>();

    const [drafts, setDrafts] = useState<TemplateDraft[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const lockedFilterType = params.filterType || null;

    useEffect(() => {
        loadDrafts();
    }, [params.filterType]);

    const loadDrafts = async () => {
        setIsLoading(true);

        let result;
        if (lockedFilterType) {
            result = await getDraftsByType(lockedFilterType);
        } else {
            result = await getMyDrafts();
        }

        if (result.success && Array.isArray(result.data)) {
            setDrafts(result.data);
        }

        setIsLoading(false);
    };

    const handleContinueDraft = (draft: TemplateDraft) => {
        router.push(`/template-fill?id=${draft.template_id}&draftId=${draft.id}`);
    };

    const handleDeleteDraft = (draft: TemplateDraft) => {
        Alert.alert(
            'Eliminar Borrador',
            `¿Seguro que quieres eliminar "${draft.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await deleteDraft(draft.id);
                        if (result.success) {
                            loadDrafts();
                        } else {
                            Alert.alert('Error', result.error || 'No se pudo eliminar');
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTitle = () => {
        if (lockedFilterType === 'contract') return '📋 Borradores de Contratos';
        if (lockedFilterType === 'invoice') return '📋 Borradores de Facturas';
        return '📋 Mis Borradores';
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: getTitle() }} />

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Cargando borradores...</Text>
                </View>
            ) : drafts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📄</Text>
                    <Text style={styles.emptyText}>No hay borradores guardados</Text>
                    <Text style={styles.emptyHint}>
                        Los borradores se crean al guardar progreso mientras rellenas una plantilla.
                    </Text>
                </View>
            ) : (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                    {drafts.map((draft) => (
                        <View key={draft.id} style={styles.draftCard}>
                            <TouchableOpacity
                                style={styles.draftContent}
                                onPress={() => handleContinueDraft(draft)}
                            >
                                <View style={styles.draftHeader}>
                                    <Text style={styles.draftName}>{draft.name}</Text>
                                    <Text style={styles.draftBadge}>Borrador</Text>
                                </View>
                                <Text style={styles.draftTemplate}>
                                    📝 {draft.template_name || 'Plantilla'}
                                </Text>
                                <Text style={styles.draftDate}>
                                    Última edición: {formatDate(draft.updated_at)}
                                </Text>

                                <View style={styles.draftStats}>
                                    <Text style={styles.statText}>
                                        {Object.keys(draft.values || {}).length} campos rellenados
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.draftActions}>
                                <TouchableOpacity
                                    style={styles.continueButton}
                                    onPress={() => handleContinueDraft(draft)}
                                >
                                    <Text style={styles.continueButtonText}>Continuar ▶</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDeleteDraft(draft)}
                                >
                                    <Text style={styles.deleteButtonText}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}
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
        color: colors.textSecondary,
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    emptyHint: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.lg,
    },
    draftCard: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    draftContent: {
        padding: spacing.lg,
    },
    draftHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    draftName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        flex: 1,
    },
    draftBadge: {
        backgroundColor: '#FFF3E0',
        color: '#E65100',
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    draftTemplate: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    draftDate: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    draftStats: {
        flexDirection: 'row',
        marginTop: spacing.sm,
        gap: spacing.md,
    },
    statText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '500',
    },
    draftActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    continueButton: {
        flex: 1,
        backgroundColor: colors.primary,
        padding: spacing.md,
        alignItems: 'center',
    },
    continueButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    deleteButton: {
        backgroundColor: '#FFEBEE',
        padding: spacing.md,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButtonText: {
        fontSize: 18,
    },
});
