/**
 * Editor Test Screen - Phase 1
 * Testing the rich text editor functionality
 */
import * as Print from 'expo-print';
import { Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, colors, spacing } from '@/src/core/theme';

export default function EditorTestScreen() {
    const richTextRef = useRef<RichEditor>(null);
    const [htmlContent, setHtmlContent] = useState('');

    // Sample content to test
    const sampleContent = `
        <h2 style="text-align: center;">CONTRATO DE ALQUILER</h2>
        <p style="text-align: justify;">
            En la ciudad de <b>Madrid</b>, a fecha de hoy, se celebra el presente contrato entre:
        </p>
        <p><b>ARRENDADOR:</b> {nombre_propietario}</p>
        <p><b>ARRENDATARIO:</b> {nombre_huesped}</p>
        <p style="text-align: justify;">
            Las partes acuerdan los siguientes términos y condiciones para el alquiler temporal 
            del inmueble situado en la dirección indicada.
        </p>
        <p><b>Período:</b> Del {fecha_entrada} al {fecha_salida}</p>
        <p><b>Precio total:</b> {precio_total} €</p>
    `;

    const loadSampleContent = () => {
        richTextRef.current?.setContentHTML(sampleContent);
        setHtmlContent(sampleContent);
    };

    const handleGeneratePDF = async () => {
        if (!htmlContent.trim()) {
            Alert.alert('Aviso', 'Escribe algo primero');
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
                        h1, h2, h3 { margin: 0.5em 0; }
                        p { margin: 0.5em 0; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html: fullHtml });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Guardar PDF',
                });
            }

            Alert.alert('✅ PDF Generado', 'El documento se ha creado correctamente');
        } catch (error) {
            Alert.alert('Error', 'No se pudo generar el PDF: ' + error);
        }
    };

    const handleShowHTML = () => {
        Alert.alert('HTML Actual', htmlContent.substring(0, 500) + '...');
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: '🧪 Editor de Texto' }} />

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header with instructions */}
                <View style={styles.header}>
                    <Text style={styles.headerText}>
                        Fase 1: Prueba del Editor
                    </Text>
                    <Text style={styles.subheaderText}>
                        Escribe, selecciona texto y usa la barra de herramientas
                    </Text>
                </View>

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
                        placeholder="Escribe aquí tu documento..."
                        initialContentHTML="<p>Empieza a escribir o carga el contenido de ejemplo...</p>"
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

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={loadSampleContent}
                    >
                        <Text style={styles.secondaryButtonText}>📄 Cargar Ejemplo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={handleShowHTML}
                    >
                        <Text style={styles.secondaryButtonText}>👁️ Ver HTML</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={handleGeneratePDF}
                    >
                        <Text style={styles.primaryButtonText}>📥 Generar PDF</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    header: {
        padding: spacing.md,
        backgroundColor: colors.primary,
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    subheaderText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
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
    actions: {
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.sm,
    },
    button: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: colors.primary,
    },
    primaryButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    secondaryButton: {
        backgroundColor: '#E3F2FD',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    secondaryButtonText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 12,
    },
});
