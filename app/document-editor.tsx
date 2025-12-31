/**
 * Document Editor Screen - Phase 2
 * Full integration: Scan Word template → Edit in rich editor → Replace variables → Generate PDF
 */
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { Stack, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, colors, spacing } from '@/src/core/theme';
import { extractPlaceholdersFromTemplate } from '@/src/features/documents/generators/contractBuilder';

export default function DocumentEditorScreen() {
    const router = useRouter();
    const richTextRef = useRef<RichEditor>(null);

    // Template state
    const [templateName, setTemplateName] = useState<string | null>(null);
    const [htmlContent, setHtmlContent] = useState('');

    // Variables state
    const [variables, setVariables] = useState<{ key: string; value: string }[]>([]);
    const [showVariablesModal, setShowVariablesModal] = useState(false);

    // Scan Word template and extract content
    const handleScanTemplate = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            setTemplateName(result.assets[0].name);

            // Extract placeholders
            const placeholders = await extractPlaceholdersFromTemplate(result.assets[0].uri);

            // Set variables with empty values
            const newVariables = placeholders.map(key => ({ key, value: '' }));
            setVariables(newVariables);

            // Create initial HTML from placeholders (simple structure)
            // In a real scenario, you'd parse the Word content structure
            const initialHtml = `
                <h2 style="text-align: center;">DOCUMENTO</h2>
                <p>Contenido extraído del archivo: <b>${result.assets[0].name}</b></p>
                <hr/>
                <p>Variables detectadas:</p>
                <ul>
                    ${placeholders.map(p => `<li>{${p}}</li>`).join('')}
                </ul>
                <hr/>
                <p style="text-align: justify;">
                    Edita este documento como desees. Usa los botones de la barra de herramientas 
                    para dar formato. Cuando termines, pulsa "Rellenar Variables" para sustituir 
                    los valores y luego "Generar PDF".
                </p>
            `;

            richTextRef.current?.setContentHTML(initialHtml);
            setHtmlContent(initialHtml);

            if (placeholders.length > 0) {
                Alert.alert(
                    '✅ Plantilla Escaneada',
                    `Se detectaron ${placeholders.length} variables.\n\nAhora puedes:\n1. Editar el documento\n2. Pulsar "Rellenar Variables" para dar valores\n3. Generar el PDF`
                );
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo escanear la plantilla: ' + error);
        }
    };

    // Open variables modal
    const handleOpenVariables = () => {
        if (variables.length === 0) {
            Alert.alert('Sin Variables', 'Primero escanea una plantilla Word para detectar variables.');
            return;
        }
        setShowVariablesModal(true);
    };

    // Update variable value
    const handleUpdateVariable = (index: number, value: string) => {
        const updated = [...variables];
        updated[index].value = value;
        setVariables(updated);
    };

    // Replace variables in HTML content
    const handleApplyVariables = () => {
        let newHtml = htmlContent;

        variables.forEach(v => {
            const regex = new RegExp(`\\{${v.key}\\}`, 'g');
            newHtml = newHtml.replace(regex, v.value || `[${v.key}]`);
        });

        richTextRef.current?.setContentHTML(newHtml);
        setHtmlContent(newHtml);
        setShowVariablesModal(false);

        Alert.alert('✅ Variables Aplicadas', 'Los valores se han insertado en el documento.');
    };

    // Generate PDF
    const handleGeneratePDF = async () => {
        if (!htmlContent.trim()) {
            Alert.alert('Aviso', 'El documento está vacío');
            return;
        }

        try {
            const fullHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        @page { margin: 2cm; }
                        body {
                            font-family: Arial, sans-serif;
                            font-size: 12pt;
                            line-height: 1.6;
                            color: #000;
                        }
                        h1 { font-size: 18pt; margin: 0.5em 0; }
                        h2 { font-size: 16pt; margin: 0.5em 0; }
                        h3 { font-size: 14pt; margin: 0.5em 0; }
                        p { margin: 0.5em 0; }
                        ul, ol { margin: 0.5em 0; padding-left: 2em; }
                        hr { border: none; border-top: 1px solid #ccc; margin: 1em 0; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html: fullHtml });

            // Save locally
            const safeName = (templateName || 'Documento').replace(/\.docx$/i, '').replace(/\s+/g, '_');
            const filename = `${safeName}_${Date.now()}.pdf`;
            const localPath = `${FileSystem.documentDirectory}${filename}`;

            await FileSystem.moveAsync({ from: uri, to: localPath });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(localPath, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Guardar o Compartir Documento',
                });
            }

            Alert.alert('✅ PDF Generado', `Documento guardado como:\n${filename}`);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo generar el PDF: ' + error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: '📝 Editor de Documentos' }} />

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header Actions */}
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.scanButton} onPress={handleScanTemplate}>
                        <Text style={styles.scanButtonText}>📂 Escanear Word</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.variablesButton, variables.length === 0 && styles.disabledButton]}
                        onPress={handleOpenVariables}
                    >
                        <Text style={styles.variablesButtonText}>
                            🔤 Variables ({variables.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {templateName && (
                    <View style={styles.templateBadge}>
                        <Text style={styles.templateBadgeText}>📄 {templateName}</Text>
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
                        actions.insertOrderedList,
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
                        placeholder="Escanea una plantilla Word o empieza a escribir..."
                        initialContentHTML="<p>Escanea una plantilla Word usando el botón de arriba, o empieza a escribir tu documento aquí.</p>"
                        onChange={(html) => setHtmlContent(html)}
                        editorStyle={{
                            backgroundColor: '#FFFFFF',
                            contentCSSText: `
                                font-family: Arial, sans-serif;
                                font-size: 16px;
                                padding: 12px;
                                min-height: 300px;
                            `,
                        }}
                    />
                </ScrollView>

                {/* Generate Button */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.generateButton} onPress={handleGeneratePDF}>
                        <Text style={styles.generateButtonText}>📥 Generar PDF</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Variables Modal */}
            <Modal
                visible={showVariablesModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowVariablesModal(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>🔤 Rellenar Variables</Text>
                        <TouchableOpacity onPress={() => setShowVariablesModal(false)}>
                            <Text style={styles.modalClose}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <Text style={styles.modalDescription}>
                            Rellena los valores para cada variable. Estos reemplazarán los {'{placeholders}'} en el documento.
                        </Text>

                        {variables.map((v, index) => (
                            <View key={v.key} style={styles.variableRow}>
                                <Text style={styles.variableKey}>{'{' + v.key + '}'}</Text>
                                <TextInput
                                    style={styles.variableInput}
                                    value={v.value}
                                    onChangeText={(text) => handleUpdateVariable(index, text)}
                                    placeholder="Escribe el valor..."
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.applyButton} onPress={handleApplyVariables}>
                            <Text style={styles.applyButtonText}>✅ Aplicar Variables</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
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
    scanButton: {
        flex: 1,
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    scanButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    variablesButton: {
        flex: 1,
        backgroundColor: '#FFF3E0',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FF9800',
    },
    variablesButtonText: {
        color: '#E65100',
        fontWeight: 'bold',
        fontSize: 14,
    },
    disabledButton: {
        opacity: 0.5,
    },
    templateBadge: {
        backgroundColor: '#E8F5E9',
        padding: spacing.sm,
        marginHorizontal: spacing.sm,
        marginTop: spacing.sm,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: '#A5D6A7',
    },
    templateBadgeText: {
        color: '#2E7D32',
        fontWeight: '600',
        fontSize: 13,
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
        minHeight: 300,
        borderWidth: 0,
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
    modalDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    variableRow: {
        marginBottom: spacing.md,
    },
    variableKey: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 4,
    },
    variableInput: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: 16,
        color: colors.text,
    },
    modalFooter: {
        padding: spacing.lg,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    applyButton: {
        backgroundColor: colors.primary,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    applyButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
