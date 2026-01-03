/**
 * Document History Screen
 * Shows all generated documents with filtering and actions
 */
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, colors, spacing, touchTarget, typography } from '@/src/core/theme';
import {
    GeneratedDocument,
    deleteDocument,
    getDocumentStats,
    getMyDocuments,
} from '@/src/features/documents/services/documentHistoryService';

type FilterType = 'all' | 'contract' | 'invoice' | 'checkin' | 'other';

export default function DocumentHistoryScreen() {
    const router = useRouter();
    const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
    const [filteredDocs, setFilteredDocs] = useState<GeneratedDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');
    const [stats, setStats] = useState({ total: 0, byType: {} as Record<string, number> });

    const loadDocuments = useCallback(async () => {
        const result = await getMyDocuments();
        if (result.success && Array.isArray(result.data)) {
            setDocuments(result.data);
        }

        const statsResult = await getDocumentStats();
        setStats(statsResult);

        setIsLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    // Apply filter
    useEffect(() => {
        if (filter === 'all') {
            setFilteredDocs(documents);
        } else {
            setFilteredDocs(documents.filter(d => d.document_type === filter));
        }
    }, [documents, filter]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadDocuments();
    }, [loadDocuments]);

    const handleDelete = (doc: GeneratedDocument) => {
        Alert.alert(
            'Eliminar documento',
            `¿Seguro que quieres eliminar "${doc.title}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await deleteDocument(doc.id);
                        if (result.success) {
                            setDocuments(prev => prev.filter(d => d.id !== doc.id));
                        } else {
                            Alert.alert('Error', result.error || 'No se pudo eliminar');
                        }
                    },
                },
            ]
        );
    };

    const handleOpen = async (doc: GeneratedDocument) => {
        if (doc.file_url) {
            try {
                // If remote URL (http/https), download first then open with system intent
                if (doc.file_url.startsWith('http')) {
                    setIsLoading(true);

                    const fileExt = doc.file_name?.split('.').pop() || 'pdf';
                    // Clean filename for local cache
                    const cleanTitle = doc.title.replace(/[^a-zA-Z0-9]/g, '_');
                    const filename = `${cleanTitle}_${Date.now()}.${fileExt}`;
                    const localUri = `${FileSystem.cacheDirectory}${filename}`;

                    try {
                        const { uri } = await FileSystem.downloadAsync(doc.file_url, localUri);
                        setIsLoading(false);

                        // Open with system chooser (allows "Open with..." or "Share")
                        if (await Sharing.isAvailableAsync()) {
                            await Sharing.shareAsync(uri, {
                                dialogTitle: doc.title,
                                mimeType: 'application/pdf',
                                UTI: 'com.adobe.pdf'
                            });
                        } else {
                            Alert.alert('Error', 'No se puede abrir el archivo en este dispositivo');
                        }
                    } catch (downloadError) {
                        setIsLoading(false);
                        console.error('Download error:', downloadError);
                        Alert.alert('Error de Descarga', 'No se pudo descargar el archivo. Verifique que el archivo existe y tiene permisos públicos.');
                    }
                } else {
                    // Local file - use Sharing
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(doc.file_url, { dialogTitle: doc.title });
                    } else {
                        Alert.alert('Error', 'No se puede abrir el archivo local');
                    }
                }
            } catch (err) {
                setIsLoading(false);
                console.error(err);
                Alert.alert('Error', 'Error al abrir el documento');
            }
        } else {
            Alert.alert('Sin archivo', 'Este documento no tiene un archivo asociado');
        }
    };

    const handleShare = async (doc: GeneratedDocument) => {
        if (doc.file_url) {
            try {
                const canShare = await Sharing.isAvailableAsync();
                if (!canShare) {
                    Alert.alert('No disponible', 'Compartir no está disponible');
                    return;
                }

                if (doc.file_url.startsWith('http')) {
                    // Download remote file to temp location first
                    setIsLoading(true);
                    const fileExt = doc.file_name?.split('.').pop() || 'pdf';
                    const filename = `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;
                    const localUri = `${FileSystem.cacheDirectory}${filename}`;

                    const { uri } = await FileSystem.downloadAsync(doc.file_url, localUri);
                    setIsLoading(false);
                    await Sharing.shareAsync(uri);
                } else {
                    // Local file
                    await Sharing.shareAsync(doc.file_url);
                }
            } catch (err) {
                setIsLoading(false);
                console.error(err);
                Alert.alert('Error', 'Error al compartir el documento');
            }
        } else {
            Alert.alert('Sin archivo', 'Este documento no tiene un archivo para compartir');
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'contract': return '📝';
            case 'invoice': return '🧾';
            case 'checkin': return '🏨';
            default: return '📄';
        }
    };

    const getTypeName = (type: string) => {
        switch (type) {
            case 'contract': return 'Contrato';
            case 'invoice': return 'Factura';
            case 'checkin': return 'Check-in';
            default: return 'Otro';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderFilterButton = (filterType: FilterType, label: string) => (
        <TouchableOpacity
            style={[
                styles.filterButton,
                filter === filterType && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(filterType)}
        >
            <Text style={[
                styles.filterButtonText,
                filter === filterType && styles.filterButtonTextActive,
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const renderDocument = ({ item }: { item: GeneratedDocument }) => (
        <TouchableOpacity
            style={styles.docCard}
            onPress={() => handleOpen(item)}
            onLongPress={() => handleDelete(item)}
        >
            <View style={styles.docHeader}>
                <Text style={styles.docIcon}>{getTypeIcon(item.document_type)}</Text>
                <View style={styles.docInfo}>
                    <Text style={styles.docTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.docType}>{getTypeName(item.document_type)}</Text>
                </View>
                {item.file_url && (
                    <View style={styles.hasFileBadge}>
                        <Text style={styles.hasFileBadgeText}>📎</Text>
                    </View>
                )}
            </View>

            <Text style={styles.docDate}>{formatDate(item.created_at)}</Text>

            <View style={styles.docActions}>
                {item.file_url && (
                    <>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleOpen(item)}
                        >
                            <Text style={styles.actionBtnText}>📂 Abrir</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleShare(item)}
                        >
                            <Text style={styles.actionBtnText}>📤 Compartir</Text>
                        </TouchableOpacity>
                    </>
                )}
                <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item)}
                >
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ title: '📚 Historial de Documentos' }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Cargando documentos...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: '📚 Historial de Documentos' }} />

            {/* Stats */}
            <View style={styles.statsBar}>
                <Text style={styles.statsText}>
                    📊 Total: {stats.total} documentos
                </Text>
            </View>

            {/* Filter Bar */}
            <View style={styles.filterBar}>
                {renderFilterButton('all', `Todos (${stats.total})`)}
                {renderFilterButton('contract', `📝 (${stats.byType['contract'] || 0})`)}
                {renderFilterButton('invoice', `🧾 (${stats.byType['invoice'] || 0})`)}
                {renderFilterButton('checkin', `🏨 (${stats.byType['checkin'] || 0})`)}
            </View>

            <FlatList
                data={filteredDocs}
                renderItem={renderDocument}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📭</Text>
                        <Text style={styles.emptyText}>
                            {filter === 'all'
                                ? 'No hay documentos generados'
                                : `No hay ${getTypeName(filter).toLowerCase()}s`}
                        </Text>
                        <Text style={styles.emptyHint}>
                            Los documentos aparecerán aquí cuando los generes
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
    loadingText: {
        marginTop: spacing.md,
        fontSize: 16,
        color: colors.textSecondary,
    },
    statsBar: {
        backgroundColor: colors.background,
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statsText: {
        fontSize: typography.fontSize.body,
        color: colors.text,
        textAlign: 'center',
    },
    filterBar: {
        flexDirection: 'row',
        padding: spacing.sm,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.xs,
    },
    filterButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        borderRadius: borderRadius.md,
        backgroundColor: colors.backgroundSecondary,
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: colors.primary,
    },
    filterButtonText: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
    },
    filterButtonTextActive: {
        color: colors.background,
        fontWeight: '600',
    },
    list: {
        padding: spacing.md,
    },
    docCard: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 2,
        borderColor: colors.border,
    },
    docHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    docIcon: {
        fontSize: 28,
        marginRight: spacing.md,
    },
    docInfo: {
        flex: 1,
    },
    docTitle: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
    },
    docType: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
    },
    hasFileBadge: {
        padding: spacing.xs,
    },
    hasFileBadgeText: {
        fontSize: 18,
    },
    docDate: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    docActions: {
        flexDirection: 'row',
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    actionBtn: {
        flex: 1,
        height: touchTarget.minimum - 10,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtnText: {
        fontSize: typography.fontSize.small,
        color: colors.text,
    },
    deleteBtn: {
        flex: 0,
        width: 50,
        backgroundColor: colors.error + '20',
    },
    deleteBtnText: {
        fontSize: 16,
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
});
