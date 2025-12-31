import * as DocumentPicker from 'expo-document-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HighContrastCard, LargeTextButton } from '@/src/components/accessible';
import { borderRadius, colors, spacing } from '@/src/core/theme';
import { extractPlaceholdersFromTemplate, generateContractFromFile } from '@/src/features/documents/generators/contractBuilder';

export default function TemplateDebuggerScreen() {
    const router = useRouter();

    // Template state
    const [templateUri, setTemplateUri] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    // Unified fields state - fully editable
    const [fields, setFields] = useState<{ id: string; key: string; value: string }[]>([]);

    const handleScanTemplate = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            setIsScanning(true);
            setTemplateUri(result.assets[0].uri);
            setTemplateName(result.assets[0].name);

            // Extract placeholders
            const placeholders = await extractPlaceholdersFromTemplate(result.assets[0].uri);

            if (placeholders.length === 0) {
                Alert.alert('Sin variables', 'No se encontraron variables {nombre} en el documento. Asegúrate de usar el formato {variable} en tu Word.');
                setIsScanning(false);
                return;
            }

            // Convert to fields array
            const newFields = placeholders.map((key, index) => ({
                id: `scanned_${index}_${Date.now()}`,
                key: key,
                value: '', // Empty, user fills in
            }));

            setFields(newFields);
            setIsScanning(false);

            Alert.alert(
                '✅ Variables Detectadas',
                `Se encontraron ${placeholders.length} variables:\n\n${placeholders.join(', ')}\n\nAhora rellena los valores.`
            );

        } catch (error) {
            setIsScanning(false);
            console.error(error);
            Alert.alert('Error', 'No se pudo escanear la plantilla: ' + error);
        }
    };

    const handleAddField = () => {
        const newId = Date.now().toString();
        setFields([...fields, { id: newId, key: '', value: '' }]);
    };

    const handleRemoveField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const handleUpdateField = (id: string, field: 'key' | 'value', text: string) => {
        setFields(fields.map(f =>
            f.id === id ? { ...f, [field]: text } : f
        ));
    };

    const handleGenerateDocument = async () => {
        if (!templateUri) {
            Alert.alert('Falta Plantilla', 'Primero escanea una plantilla con el botón de arriba.');
            return;
        }

        // Convert array to object
        const data: any = {};
        fields.forEach(f => {
            if (f.key.trim()) {
                data[f.key.trim()] = f.value;
            }
        });

        if (Object.keys(data).length === 0) {
            Alert.alert('Aviso', 'No has definido ninguna variable válida.');
            return;
        }

        try {
            const res = await generateContractFromFile(templateUri, data);
            if (res.success) {
                Alert.alert('✅ Documento Generado', 'El documento se ha creado y debería abrirse para compartir/guardar.');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Fallo al generar: ' + e);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: 'Probador de Plantillas' }} />
            <ScrollView style={styles.content}>

                {/* Scan Template Section */}
                <HighContrastCard title="📂 1. Escanear Plantilla">
                    <Text style={styles.description}>
                        Selecciona tu archivo Word (.docx) y la app detectará automáticamente todas las variables {'{...}'} que contenga.
                    </Text>

                    {templateName ? (
                        <View style={styles.templateLoaded}>
                            <Text style={styles.templateLoadedIcon}>📄</Text>
                            <Text style={styles.templateLoadedText}>{templateName}</Text>
                            <TouchableOpacity onPress={handleScanTemplate}>
                                <Text style={styles.rescanText}>Cambiar</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        style={styles.scanButton}
                        onPress={handleScanTemplate}
                        disabled={isScanning}
                    >
                        {isScanning ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text style={styles.scanButtonIcon}>🔍</Text>
                                <Text style={styles.scanButtonText}>
                                    {templateName ? 'Volver a Escanear' : 'Escanear Plantilla Word'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </HighContrastCard>

                <View style={styles.spacer} />

                {/* Variables Section */}
                <HighContrastCard title="✏️ 2. Rellenar Variables">
                    {fields.length === 0 ? (
                        <Text style={styles.emptyText}>
                            Escanea una plantilla primero para ver las variables detectadas, o añade manualmente.
                        </Text>
                    ) : (
                        fields.map((field) => (
                            <View key={field.id} style={styles.fieldRow}>
                                <View style={styles.fieldKeyContainer}>
                                    <Text style={styles.fieldKeyLabel}>{'{' + field.key + '}'}</Text>
                                </View>

                                <TextInput
                                    style={styles.valueInput}
                                    value={field.value}
                                    placeholder="Escribe el valor aquí..."
                                    placeholderTextColor={colors.placeholder}
                                    onChangeText={(text) => handleUpdateField(field.id, 'value', text)}
                                />

                                <TouchableOpacity
                                    onPress={() => handleRemoveField(field.id)}
                                    style={styles.deleteButton}
                                >
                                    <Text style={styles.deleteText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}

                    <TouchableOpacity style={styles.addButton} onPress={handleAddField}>
                        <Text style={styles.addButtonText}>+ Añadir Variable Manual</Text>
                    </TouchableOpacity>
                </HighContrastCard>

                <View style={styles.spacer} />

                {/* Generate Section */}
                <HighContrastCard title="🚀 3. Generar Documento">
                    <Text style={styles.description}>
                        Una vez rellenas las variables, genera el documento final.
                    </Text>
                    <LargeTextButton
                        title="Generar Documento Rellenado"
                        onPress={handleGenerateDocument}
                        disabled={!templateUri || fields.length === 0}
                    />
                </HighContrastCard>

                <View style={{ height: 100 }} />
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
        padding: spacing.md,
    },
    description: {
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: spacing.md,
        lineHeight: 22,
    },
    spacer: {
        height: spacing.lg,
    },
    emptyText: {
        fontSize: 15,
        color: colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        padding: spacing.lg,
    },
    // Scan Button
    scanButton: {
        backgroundColor: colors.primary,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanButtonIcon: {
        fontSize: 24,
        marginRight: spacing.sm,
    },
    scanButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Template Loaded
    templateLoaded: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: '#A5D6A7',
    },
    templateLoadedIcon: {
        fontSize: 24,
        marginRight: spacing.sm,
    },
    templateLoadedText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    rescanText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    // Field Row
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        backgroundColor: '#FAFAFA',
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    fieldKeyContainer: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.sm,
        marginRight: spacing.sm,
        minWidth: 100,
    },
    fieldKeyLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primary,
        textAlign: 'center',
    },
    valueInput: {
        flex: 1,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        padding: spacing.sm,
        fontSize: 15,
        color: colors.text,
        height: 44,
    },
    deleteButton: {
        backgroundColor: '#FFEBEE',
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.sm,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    deleteText: {
        color: '#D32F2F',
        fontSize: 18,
        fontWeight: 'bold',
    },
    addButton: {
        backgroundColor: colors.background,
        borderWidth: 2,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    addButtonText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
