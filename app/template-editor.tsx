/**
 * Template Editor Screen
 * - Scan Word document and extract ACTUAL content
 * - Edit visually with rich text editor
 * - Save as reusable template
 * - Load saved templates
 */
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { actions, RichEditor, RichToolbar } from 'react-native-pell-rich-editor';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, colors, spacing } from '@/src/core/theme';
import {
    deleteTemplate,
    extractWordContentAsHtml,
    listTemplates,
    SavedTemplate,
    saveTemplate,
    updateTemplate
} from '@/src/features/documents/services/templateService';

export default function TemplateEditorScreen() {
    const router = useRouter();
    const richTextRef = useRef<RichEditor>(null);

    // Template state
    const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [variables, setVariables] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Saved templates
    const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');

    // Load saved templates on mount
    useEffect(() => {
        loadSavedTemplates();
    }, []);

    const loadSavedTemplates = async () => {
        const templates = await listTemplates();
        setSavedTemplates(templates);
    };

    // Scan Word document
    const handleScanWord = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            setIsLoading(true);

            const { html, variables, originalName } = await extractWordContentAsHtml(result.assets[0].uri);

            // Set content in editor
            richTextRef.current?.setContentHTML(html);
            setHtmlContent(html);
            setVariables(variables);
            setTemplateName(originalName.replace('.docx', ''));
            setCurrentTemplateId(null); // New template, not saved yet
            setHasChanges(true);

            setIsLoading(false);

            Alert.alert(
                '✅ Documento Escaneado',
                `Se ha extraído el contenido del Word.\n\nVariables detectadas: ${variables.length}\n\nAhora puedes editar el documento y guardarlo como plantilla.`
            );
        } catch (error) {
            setIsLoading(false);
            console.error(error);
            Alert.alert('Error', 'No se pudo escanear el documento: ' + error);
        }
    };

    // Load saved template
    const handleLoadTemplate = async (template: SavedTemplate) => {
        richTextRef.current?.setContentHTML(template.html);
        setHtmlContent(template.html);
        setVariables(template.variables);
        setTemplateName(template.name);
        setCurrentTemplateId(template.id);
        setHasChanges(false);
        setShowTemplatesModal(false);

        Alert.alert('✅ Plantilla Cargada', `"${template.name}" se ha cargado correctamente.`);
    };

    // Delete template
    const handleDeleteTemplate = async (template: SavedTemplate) => {
        Alert.alert(
            'Eliminar Plantilla',
            `¿Seguro que quieres eliminar "${template.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteTemplate(template.id);
                        loadSavedTemplates();
                        if (currentTemplateId === template.id) {
                            setCurrentTemplateId(null);
                            setTemplateName('');
                            setHtmlContent('');
                            richTextRef.current?.setContentHTML('');
                        }
                    }
                }
            ]
        );
    };

    // Save current work
    const handleSave = async () => {
        if (!htmlContent.trim()) {
            Alert.alert('Aviso', 'No hay contenido para guardar.');
            return;
        }

        if (currentTemplateId) {
            // Update existing
            await updateTemplate(currentTemplateId, htmlContent, variables);
            setHasChanges(false);
            Alert.alert('✅ Guardado', 'La plantilla se ha actualizado.');
            loadSavedTemplates();
        } else {
            // New template - show name modal
            setNewTemplateName(templateName || 'Mi Plantilla');
            setShowSaveModal(true);
        }
    };

    // Create new template
    const handleCreateTemplate = async () => {
        if (!newTemplateName.trim()) {
            Alert.alert('Aviso', 'Introduce un nombre para la plantilla.');
            return;
        }

        const template = await saveTemplate(newTemplateName, htmlContent, variables);
        setCurrentTemplateId(template.id);
        setTemplateName(template.name);
        setHasChanges(false);
        setShowSaveModal(false);
        loadSavedTemplates();

        Alert.alert('✅ Plantilla Guardada', `"${template.name}" se ha guardado correctamente.`);
    };

    // Handle content change
    const handleContentChange = (html: string) => {
        setHtmlContent(html);
        setHasChanges(true);

        // Re-extract variables when content changes
        const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
        const newVars: string[] = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
            if (!newVars.includes(match[1])) {
                newVars.push(match[1]);
            }
        }
        setVariables(newVars);
    };

    // Navigate to fill screen
    const handleGoToFill = () => {
        if (!currentTemplateId) {
            Alert.alert(
                'Guardar Primero',
                'Debes guardar la plantilla antes de usarla para rellenar datos.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Guardar Ahora', onPress: handleSave }
                ]
            );
            return;
        }

        router.push(`/template-fill?id=${currentTemplateId}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: '📝 Editor de Plantillas' }} />

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header Actions */}
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleScanWord}>
                        <Text style={styles.actionButtonText}>📂 Escanear Word</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.loadButton]}
                        onPress={() => setShowTemplatesModal(true)}
                    >
                        <Text style={styles.loadButtonText}>📋 Mis Plantillas ({savedTemplates.length})</Text>
                    </TouchableOpacity>
                </View>

                {/* Template Info */}
                {templateName ? (
                    <View style={styles.templateInfo}>
                        <Text style={styles.templateInfoText}>
                            {currentTemplateId ? '✅' : '⚠️'} {templateName}
                            {hasChanges && ' *'}
                        </Text>
                        <Text style={styles.variablesCount}>
                            {variables.length} variables
                        </Text>
                    </View>
                ) : null}

                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Extrayendo contenido...</Text>
                    </View>
                )}

                {/* Toolbar */}
                <RichToolbar
                    editor={richTextRef}
                    style={styles.toolbar}
                    iconTint={colors.text}
                    selectedIconTint={colors.primary}
                    actions={[
                        actions.setBold,
                        actions.setItalic,
                        actions.setUnderline,
                        actions.heading1,
                        actions.heading2,
                        actions.alignLeft,
                        actions.alignCenter,
                        actions.alignRight,
                        actions.insertBulletsList,
                        actions.undo,
                        actions.redo,
                    ]}
                    iconMap={{
                        [actions.heading1]: ({ tintColor }: { tintColor: string }) => (
                            <Text style={{ color: tintColor, fontWeight: 'bold' }}>H1</Text>
                        ),
                        [actions.heading2]: ({ tintColor }: { tintColor: string }) => (
                            <Text style={{ color: tintColor, fontWeight: 'bold' }}>H2</Text>
                        ),
                    }}
                />

                {/* Editor */}
                <ScrollView style={styles.editorScroll}>
                    <RichEditor
                        ref={richTextRef}
                        style={styles.editor}
                        placeholder="Escanea un Word o empieza a escribir tu plantilla..."
                        initialContentHTML="<p>Escanea un documento Word para extraer su contenido, o escribe directamente tu plantilla aquí.</p><p>Usa {variables} para los campos que se rellenarán automáticamente.</p>"
                        onChange={handleContentChange}
                        editorStyle={{
                            backgroundColor: '#FFFFFF',
                            contentCSSText: `
                                font-family: Arial, sans-serif;
                                font-size: 16px;
                                padding: 16px;
                                min-height: 400px;
                            `,
                        }}
                    />
                </ScrollView>

                {/* Footer Actions */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.footerButton, styles.saveButton]}
                        onPress={handleSave}
                    >
                        <Text style={styles.saveButtonText}>💾 Guardar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.footerButton, styles.fillButton, !currentTemplateId && styles.disabledButton]}
                        onPress={handleGoToFill}
                    >
                        <Text style={styles.fillButtonText}>📝 Usar para Rellenar</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Saved Templates Modal */}
            <Modal
                visible={showTemplatesModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowTemplatesModal(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>📋 Mis Plantillas</Text>
                        <TouchableOpacity onPress={() => setShowTemplatesModal(false)}>
                            <Text style={styles.modalClose}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {savedTemplates.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateIcon}>📄</Text>
                                <Text style={styles.emptyStateText}>No hay plantillas guardadas</Text>
                                <Text style={styles.emptyStateHint}>
                                    Escanea un Word y guárdalo como plantilla
                                </Text>
                            </View>
                        ) : (
                            savedTemplates.map((template) => (
                                <View key={template.id} style={styles.templateCard}>
                                    <TouchableOpacity
                                        style={styles.templateCardContent}
                                        onPress={() => handleLoadTemplate(template)}
                                    >
                                        <Text style={styles.templateCardName}>{template.name}</Text>
                                        <Text style={styles.templateCardMeta}>
                                            {template.variables.length} variables •
                                            Editado: {new Date(template.updatedAt).toLocaleDateString()}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDeleteTemplate(template)}
                                    >
                                        <Text style={styles.deleteButtonText}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Save New Template Modal */}
            <Modal
                visible={showSaveModal}
                animationType="fade"
                transparent
                onRequestClose={() => setShowSaveModal(false)}
            >
                <View style={styles.saveModalOverlay}>
                    <View style={styles.saveModalContent}>
                        <Text style={styles.saveModalTitle}>💾 Guardar Plantilla</Text>

                        <Text style={styles.saveModalLabel}>Nombre de la plantilla:</Text>
                        <TextInput
                            style={styles.saveModalInput}
                            value={newTemplateName}
                            onChangeText={setNewTemplateName}
                            placeholder="Mi Plantilla de Contrato"
                            placeholderTextColor={colors.placeholder}
                        />

                        <View style={styles.saveModalActions}>
                            <TouchableOpacity
                                style={styles.saveModalCancel}
                                onPress={() => setShowSaveModal(false)}
                            >
                                <Text style={styles.saveModalCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveModalConfirm}
                                onPress={handleCreateTemplate}
                            >
                                <Text style={styles.saveModalConfirmText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    keyboardView: {
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        padding: spacing.sm,
        gap: spacing.sm,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    actionButton: {
        flex: 1,
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    actionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
    },
    loadButton: {
        backgroundColor: '#FFF3E0',
        borderWidth: 1,
        borderColor: '#FF9800',
    },
    loadButtonText: {
        color: '#E65100',
        fontWeight: 'bold',
        fontSize: 13,
    },
    templateInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        padding: spacing.sm,
        marginHorizontal: spacing.sm,
        marginTop: spacing.sm,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: '#A5D6A7',
    },
    templateInfoText: {
        color: '#2E7D32',
        fontWeight: '600',
        fontSize: 14,
    },
    variablesCount: {
        color: '#558B2F',
        fontSize: 12,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    loadingText: {
        marginTop: spacing.md,
        color: colors.text,
        fontSize: 16,
    },
    toolbar: {
        backgroundColor: '#F5F5F5',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    editorScroll: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    editor: {
        flex: 1,
        minHeight: 400,
        borderWidth: 0,
    },
    footer: {
        flexDirection: 'row',
        padding: spacing.md,
        gap: spacing.sm,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    footerButton: {
        flex: 1,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: colors.primary,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    fillButton: {
        backgroundColor: '#4CAF50',
    },
    fillButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    disabledButton: {
        opacity: 0.5,
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    modalClose: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 16,
    },
    modalContent: {
        flex: 1,
        padding: spacing.lg,
    },
    emptyState: {
        alignItems: 'center',
        padding: spacing.xxl,
    },
    emptyStateIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    emptyStateHint: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    templateCard: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    templateCardContent: {
        flex: 1,
        padding: spacing.md,
    },
    templateCardName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    templateCardMeta: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    deleteButton: {
        padding: spacing.md,
        justifyContent: 'center',
        backgroundColor: '#FFEBEE',
    },
    deleteButtonText: {
        fontSize: 20,
    },
    // Save Modal
    saveModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    saveModalContent: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        width: '100%',
        maxWidth: 400,
    },
    saveModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    saveModalLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    saveModalInput: {
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: 16,
        color: colors.text,
    },
    saveModalActions: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    saveModalCancel: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    saveModalCancelText: {
        color: colors.text,
        fontWeight: '600',
    },
    saveModalConfirm: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        backgroundColor: colors.primary,
    },
    saveModalConfirmText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
