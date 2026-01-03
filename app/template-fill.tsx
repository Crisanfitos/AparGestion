/**
 * Template Fill Screen
 * - Load a saved template
 * - Fill in variable values
 * - Generate PDF with replaced values
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, colors, spacing } from '@/src/core/theme';
import { uploadAndRecordDocument } from '@/src/features/documents/services/documentHistoryService';
import {
    generatePdfFromTemplate,
    listTemplates,
    loadTemplate,
    SavedTemplate
} from '@/src/features/documents/services/templateService';

export default function TemplateFillScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string }>();

    // Template state
    const [template, setTemplate] = useState<SavedTemplate | null>(null);
    const [values, setValues] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // Available templates for selection
    const [templates, setTemplates] = useState<SavedTemplate[]>([]);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);

    // Load template on mount
    useEffect(() => {
        loadInitialData();
    }, [params.id]);

    const loadInitialData = async () => {
        setIsLoading(true);

        // Load all templates
        const allTemplates = await listTemplates();
        setTemplates(allTemplates);

        // If ID provided, load that template
        if (params.id) {
            const loaded = await loadTemplate(params.id);
            if (loaded) {
                setTemplate(loaded);
                initializeValues(loaded.variables);
            }
        }

        setIsLoading(false);
    };

    const initializeValues = (variables: string[]) => {
        const initialValues: Record<string, string> = {};
        variables.forEach(v => {
            initialValues[v] = '';
        });
        setValues(initialValues);
    };

    const handleSelectTemplate = (selected: SavedTemplate) => {
        setTemplate(selected);
        initializeValues(selected.variables);
        setShowTemplateSelector(false);
    };

    const handleValueChange = (key: string, value: string) => {
        setValues(prev => ({ ...prev, [key]: value }));
    };

    const handleGenerate = async () => {
        if (!template) return;

        // Check if all values are filled
        const emptyFields = template.variables.filter(v => !values[v]?.trim());

        if (emptyFields.length > 0) {
            Alert.alert(
                'Campos Vacíos',
                `Los siguientes campos están vacíos:\n\n${emptyFields.map(f => `• {${f}}`).join('\n')}\n\n¿Generar de todos modos?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Generar', onPress: doGenerate }
                ]
            );
        } else {
            doGenerate();
        }
    };

    const doGenerate = async () => {
        if (!template) return;

        setIsGenerating(true);
        try {
            const result = await generatePdfFromTemplate(template.html, values, template.name);

            // Determine document type from template name
            let docType: 'contract' | 'invoice' | 'checkin' | 'other' = 'other';
            const nameLower = template.name.toLowerCase();
            if (nameLower.includes('contrato') || nameLower.includes('contract')) {
                docType = 'contract';
            } else if (nameLower.includes('factura') || nameLower.includes('invoice')) {
                docType = 'invoice';
            } else if (nameLower.includes('checkin') || nameLower.includes('check-in') || nameLower.includes('entrada')) {
                docType = 'checkin';
            }

            // Check if template_id is a valid UUID (Supabase format)
            // Local templates use format like "template_1767445623719" which is not valid
            const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(template.id);

            // Record in document history
            // Upload and record in document history
            const recordResult = await uploadAndRecordDocument(result.filepath, {
                title: result.filename,
                document_type: docType,
                template_id: isValidUuid ? template.id : undefined,
                variables_used: values,
            });

            console.log('Record document result:', recordResult);

            if (!recordResult.success) {
                console.error('Failed to record document:', recordResult.error);
            }

            Alert.alert(
                '✅ PDF Generado',
                `El documento se ha creado y guardado en el historial.\n\n${result.filename}`,
                [{
                    text: 'OK',
                    onPress: () => router.replace('/(tabs)/documents')
                }]
            );
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo generar el PDF: ' + error);
        }
        setIsGenerating(false);
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ title: '📄 Rellenar Documento' }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Cargando...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: '📄 Rellenar Documento' }} />

            <ScrollView style={styles.content}>
                {/* Template Selector */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 Plantilla</Text>

                    {template ? (
                        <View style={styles.selectedTemplate}>
                            <View style={styles.selectedTemplateInfo}>
                                <Text style={styles.selectedTemplateName}>{template.name}</Text>
                                <Text style={styles.selectedTemplateMeta}>
                                    {template.variables.length} campos a rellenar
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.changeButton}
                                onPress={() => setShowTemplateSelector(!showTemplateSelector)}
                            >
                                <Text style={styles.changeButtonText}>Cambiar</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.selectTemplateButton}
                            onPress={() => setShowTemplateSelector(true)}
                        >
                            <Text style={styles.selectTemplateText}>Seleccionar Plantilla</Text>
                        </TouchableOpacity>
                    )}

                    {showTemplateSelector && (
                        <View style={styles.templateList}>
                            {templates.length === 0 ? (
                                <Text style={styles.noTemplatesText}>
                                    No hay plantillas. Ve al Editor para crear una.
                                </Text>
                            ) : (
                                templates.map((t) => (
                                    <TouchableOpacity
                                        key={t.id}
                                        style={[
                                            styles.templateOption,
                                            template?.id === t.id && styles.templateOptionSelected
                                        ]}
                                        onPress={() => handleSelectTemplate(t)}
                                    >
                                        <Text style={styles.templateOptionName}>{t.name}</Text>
                                        <Text style={styles.templateOptionMeta}>
                                            {t.variables.length} variables
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    )}
                </View>

                {/* Variables Form */}
                {template && template.variables.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>✏️ Datos a Rellenar</Text>

                        {template.variables.map((variable) => (
                            <View key={variable} style={styles.fieldRow}>
                                <Text style={styles.fieldLabel}>{'{' + variable + '}'}</Text>
                                <TextInput
                                    style={styles.fieldInput}
                                    value={values[variable] || ''}
                                    onChangeText={(text) => handleValueChange(variable, text)}
                                    placeholder={`Escribe el valor para ${variable}...`}
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>
                        ))}
                    </View>
                )}

                {/* Preview hint */}
                {template && (
                    <View style={styles.hintBox}>
                        <Text style={styles.hintText}>
                            💡 Al generar, todos los {'{campos}'} se reemplazarán con los valores que has introducido.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Generate Button */}
            {template && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.generateButton, isGenerating && styles.disabledButton]}
                        onPress={handleGenerate}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.generateButtonText}>📥 Generar PDF</Text>
                        )}
                    </TouchableOpacity>
                </View>
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
        color: colors.text,
        fontSize: 16,
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    section: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.md,
    },
    selectedTemplate: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: '#A5D6A7',
    },
    selectedTemplateInfo: {
        flex: 1,
    },
    selectedTemplateName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2E7D32',
    },
    selectedTemplateMeta: {
        fontSize: 12,
        color: '#558B2F',
        marginTop: 2,
    },
    changeButton: {
        padding: spacing.sm,
    },
    changeButtonText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    selectTemplateButton: {
        backgroundColor: '#E3F2FD',
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    selectTemplateText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    templateList: {
        marginTop: spacing.md,
    },
    noTemplatesText: {
        color: colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        padding: spacing.md,
    },
    templateOption: {
        padding: spacing.md,
        backgroundColor: '#FAFAFA',
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    templateOptionSelected: {
        backgroundColor: '#E3F2FD',
        borderColor: colors.primary,
    },
    templateOptionName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    templateOptionMeta: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    fieldRow: {
        marginBottom: spacing.md,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    fieldInput: {
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: 16,
        color: colors.text,
    },
    hintBox: {
        backgroundColor: '#FFF8E1',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    hintText: {
        color: '#F57C00',
        fontSize: 14,
        lineHeight: 20,
    },
    footer: {
        padding: spacing.md,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    generateButton: {
        backgroundColor: '#4CAF50',
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    generateButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    disabledButton: {
        opacity: 0.6,
    },
});
