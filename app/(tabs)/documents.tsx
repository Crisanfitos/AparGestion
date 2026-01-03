/**
 * Documents Screen
 * Document management and generation (Invoices & Contracts)
 * Supports custom Word templates via docxtemplater
 */
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HighContrastCard, LargeTextButton } from '@/src/components/accessible';
import { borderRadius, colors, spacing, typography } from '@/src/core/theme';
import { generateContractFromFile } from '@/src/features/documents/generators/contractBuilder';
import { generateInvoicePDF as generateInvoice } from '@/src/features/documents/generators/pdfGenerator';

export default function DocumentsScreen() {
    const router = useRouter();

    // Invoice Form State
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({
        clientName: '',
        clientId: '',
        checkIn: '',
        checkOut: '',
        nights: '',
        pricePerNight: '',
    });

    // Contract Form State
    const [showContractModal, setShowContractModal] = useState(false);
    const [contractForm, setContractForm] = useState({
        guestName: '',
        guestId: '',
        guestNationality: '',
        checkInDate: '',
        checkOutDate: '',
        totalPrice: '',
    });

    // Template State
    const [templateUri, setTemplateUri] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState<string | null>(null);

    const handleInvoiceGenerate = async () => {
        if (!invoiceForm.clientName || !invoiceForm.clientId) {
            Alert.alert('Error', 'Por favor complete los datos del cliente');
            return;
        }

        try {
            const fileUri = await generateInvoice({
                invoiceNumber: `FAC-${Math.floor(Math.random() * 1000000)}`,
                date: new Date().toLocaleDateString('es-ES'),
                clientName: invoiceForm.clientName,
                clientId: invoiceForm.clientId,
                clientAddress: 'Dirección Cliente',
                propertyName: 'Apartamento',
                checkIn: invoiceForm.checkIn,
                checkOut: invoiceForm.checkOut,
                nights: parseInt(invoiceForm.nights) || 1,
                pricePerNight: parseFloat(invoiceForm.pricePerNight) || 0,
                totalPrice: (parseInt(invoiceForm.nights) || 1) * (parseFloat(invoiceForm.pricePerNight) || 0),
                ownerName: 'Propietario',
                ownerNif: '12345678Z'
            });

            if (fileUri) {
                setShowInvoiceModal(false);
                Alert.alert('✅ Éxito', 'Factura generada correctamente.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo generar la factura');
        }
    };

    const handlePickTemplate = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            setTemplateUri(result.assets[0].uri);
            setTemplateName(result.assets[0].name);
            Alert.alert('Plantilla Cargada', `Archivo seleccionado: ${result.assets[0].name}`);
        } catch (error) {
            console.error('Error picking template:', error);
            Alert.alert('Error', 'No se pudo cargar la plantilla');
        }
    };

    const handleContractGenerate = async () => {
        if (!templateUri) {
            Alert.alert(
                'Falta Plantilla',
                'Por favor, selecciona primero tu plantilla Word (.docx)',
                [
                    { text: 'Seleccionar ahora', onPress: handlePickTemplate },
                    { text: 'Cancelar', style: 'cancel' }
                ]
            );
            return;
        }

        if (!contractForm.guestName || !contractForm.guestId) {
            Alert.alert('Error', 'Por favor complete los datos del huésped');
            return;
        }

        try {
            const result = await generateContractFromFile(templateUri, {
                guestName: contractForm.guestName,
                guestId: contractForm.guestId,
                guestNationality: contractForm.guestNationality,
                checkInDate: contractForm.checkInDate,
                checkOutDate: contractForm.checkOutDate,
                totalPrice: parseFloat(contractForm.totalPrice) || 0,
            });

            if (result.success) {
                setShowContractModal(false);
                Alert.alert('✅ Éxito', 'Contrato generado correctamente.');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo generar el contrato. Verifica que la plantilla sea un .docx válido.');
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

                <View style={styles.header}>
                    <Text style={styles.title}>Gestión Documental</Text>

                    {/* Main Actions - Two columns */}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                        {/* Template Editor */}
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: colors.primary,
                                padding: 14,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                            onPress={() => router.push('/template-editor')}
                        >
                            <Text style={{ fontSize: 24 }}>📝</Text>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>
                                Editor de Plantillas
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }}>
                                Crear / Editar
                            </Text>
                        </TouchableOpacity>

                        {/* Fill Template */}
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: '#4CAF50',
                                padding: 14,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                            onPress={() => router.push('/template-fill')}
                        >
                            <Text style={{ fontSize: 24 }}>📄</Text>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>
                                Rellenar Plantilla
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }}>
                                Generar PDF
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Secondary Row - Saved Templates & History */}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        {/* Saved Templates (Local storage) */}
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: '#FF9800',
                                padding: 14,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                            onPress={() => router.push('/template-editor?showList=true')}
                        >
                            <Text style={{ fontSize: 24 }}>📁</Text>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>
                                Mis Plantillas
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }}>
                                Ver guardadas
                            </Text>
                        </TouchableOpacity>

                        {/* Document History */}
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: '#9C27B0',
                                padding: 14,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                            onPress={() => router.push('/document-history')}
                        >
                            <Text style={{ fontSize: 24 }}>📚</Text>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>
                                Historial
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }}>
                                Documentos generados
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Invoices Section */}
                <HighContrastCard title="📄 Facturas">
                    <Text style={styles.description}>
                        Genera facturas PDF profesionales para tus huéspedes.
                    </Text>
                    <LargeTextButton
                        title="Nueva Factura"
                        onPress={() => setShowInvoiceModal(true)}
                        accessibilityHint="Abrir formulario para generar nueva factura"
                    />
                </HighContrastCard >

                <View style={styles.spacer} />

                {/* Contracts Section */}
                <HighContrastCard title="📝 Contratos">
                    <Text style={styles.description}>
                        Genera contratos utilizando tu propia plantilla Word (.docx).
                    </Text>
                    {templateName ? (
                        <View style={styles.templateInfo}>
                            <Text style={styles.templateLabel}>Plantilla cargada:</Text>
                            <Text style={styles.templateName}>{templateName}</Text>
                            <TouchableOpacity onPress={() => setTemplateUri(null)}>
                                <Text style={styles.changeTemplate}>Cambiar</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    <LargeTextButton
                        title="Nuevo Contrato"
                        onPress={() => setShowContractModal(true)}
                        variant="secondary"
                        accessibilityHint="Abrir formulario para generar nuevo contrato"
                    />
                </HighContrastCard>

                <View style={styles.spacer} />

                {/* Link to Document History */}
                <TouchableOpacity
                    style={{
                        backgroundColor: colors.background,
                        borderRadius: borderRadius.lg,
                        padding: spacing.lg,
                        borderWidth: 2,
                        borderColor: colors.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}
                    onPress={() => router.push('/document-history')}
                >
                    <Text style={{ fontSize: 32, marginRight: spacing.md }}>📚</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                            Historial de Documentos
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                            Ver todos los documentos generados
                        </Text>
                    </View>
                    <Text style={{ fontSize: 20, color: colors.textSecondary }}>→</Text>
                </TouchableOpacity>
            </ScrollView >

            {/* Invoice Modal */}
            < Modal
                visible={showInvoiceModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowInvoiceModal(false)
                }
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Nueva Factura</Text>
                        <TouchableOpacity onPress={() => setShowInvoiceModal(false)}>
                            <Text style={styles.closeButton}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalForm}>
                        <HighContrastCard title="Datos del Cliente">
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nombre Cliente</Text>
                                <TextInput
                                    style={styles.input}
                                    value={invoiceForm.clientName}
                                    onChangeText={(text) => setInvoiceForm({ ...invoiceForm, clientName: text })}
                                    placeholder="Nombre completo"
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>DNI / CIF</Text>
                                <TextInput
                                    style={styles.input}
                                    value={invoiceForm.clientId}
                                    onChangeText={(text) => setInvoiceForm({ ...invoiceForm, clientId: text })}
                                    placeholder="12345678A"
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                                    <Text style={styles.label}>Fecha Entrada</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={invoiceForm.checkIn}
                                        onChangeText={(text) => setInvoiceForm({ ...invoiceForm, checkIn: text })}
                                        placeholder="2025-01-15"
                                        placeholderTextColor={colors.placeholder}
                                    />
                                </View>

                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Fecha Salida</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={invoiceForm.checkOut}
                                        onChangeText={(text) => setInvoiceForm({ ...invoiceForm, checkOut: text })}
                                        placeholder="2025-01-20"
                                        placeholderTextColor={colors.placeholder}
                                    />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                                    <Text style={styles.label}>Noches</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={invoiceForm.nights}
                                        onChangeText={(text) => setInvoiceForm({ ...invoiceForm, nights: text })}
                                        placeholder="5"
                                        keyboardType="numeric"
                                        placeholderTextColor={colors.placeholder}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Precio/Noche</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={invoiceForm.pricePerNight}
                                        onChangeText={(text) => setInvoiceForm({ ...invoiceForm, pricePerNight: text })}
                                        placeholder="100"
                                        keyboardType="numeric"
                                        placeholderTextColor={colors.placeholder}
                                    />
                                </View>
                            </View>
                        </HighContrastCard>

                        <View style={styles.modalActions}>
                            <LargeTextButton title="Generar Factura" onPress={handleInvoiceGenerate} />
                        </View>
                    </ScrollView>
                </View>
            </Modal >

            {/* Contract Modal */}
            < Modal
                visible={showContractModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowContractModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Nuevo Contrato</Text>
                        <TouchableOpacity onPress={() => setShowContractModal(false)}>
                            <Text style={styles.closeButton}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalForm}>
                        <HighContrastCard title="Configuración">
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Plantilla Word (.docx)</Text>
                                {templateName ? (
                                    <View style={styles.selectedFileContainer}>
                                        <Text style={styles.selectedFileText}>📄 {templateName}</Text>
                                        <TouchableOpacity onPress={handlePickTemplate} style={styles.changeFileButton}>
                                            <Text style={styles.changeFileText}>Cambiar</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.uploadButton}
                                        onPress={handlePickTemplate}
                                    >
                                        <Text style={styles.uploadButtonIcon}>📂</Text>
                                        <Text style={styles.uploadButtonText}>Seleccionar Archivo</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </HighContrastCard>

                        <HighContrastCard title="Datos del Huésped">
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nombre Huésped</Text>
                                <TextInput
                                    style={styles.input}
                                    value={contractForm.guestName}
                                    onChangeText={(text) => setContractForm({ ...contractForm, guestName: text })}
                                    placeholder="Nombre completo"
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>DNI / Pasaporte</Text>
                                <TextInput
                                    style={styles.input}
                                    value={contractForm.guestId}
                                    onChangeText={(text) => setContractForm({ ...contractForm, guestId: text })}
                                    placeholder="12345678A"
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nacionalidad</Text>
                                <TextInput
                                    style={styles.input}
                                    value={contractForm.guestNationality}
                                    onChangeText={(text) => setContractForm({ ...contractForm, guestNationality: text })}
                                    placeholder="Española"
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                                    <Text style={styles.label}>Fecha Entrada</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={contractForm.checkInDate}
                                        onChangeText={(text) => setContractForm({ ...contractForm, checkInDate: text })}
                                        placeholder="2025-01-15"
                                        placeholderTextColor={colors.placeholder}
                                    />
                                </View>

                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Fecha Salida</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={contractForm.checkOutDate}
                                        onChangeText={(text) => setContractForm({ ...contractForm, checkOutDate: text })}
                                        placeholder="2025-01-20"
                                        placeholderTextColor={colors.placeholder}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Precio Total (€)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={contractForm.totalPrice}
                                    onChangeText={(text) => setContractForm({ ...contractForm, totalPrice: text })}
                                    placeholder="500"
                                    keyboardType="numeric"
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>

                            <Text style={styles.hintText}>
                                Nota: Asegúrate de que tu plantilla Word tenga los marcadores: {'\n'}
                                {'{guestName}, {guestId}, {checkInDate}, {totalPrice}'}, etc.
                            </Text>
                        </HighContrastCard>

                        <View style={styles.modalActions}>
                            <LargeTextButton title="Generar Contrato" onPress={handleContractGenerate} />
                        </View>
                    </ScrollView>
                </View>
            </Modal >
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.lg,
    },
    header: {
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: typography.fontSize.header,
        fontWeight: '700',
        color: colors.text,
    },
    description: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    spacer: {
        height: spacing.lg,
    },
    docItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    docIconContainer: {
        width: 50,
        height: 50,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    docIcon: {
        fontSize: 24,
    },
    docInfo: {
        flex: 1,
    },
    docName: {
        fontSize: typography.fontSize.body,
        fontWeight: '700',
        color: colors.text,
    },
    docMeta: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
    },
    emptyText: {
        fontSize: typography.fontSize.body,
        color: colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        padding: spacing.lg,
    },
    // Modal Styles
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
        fontSize: typography.fontSize.title,
        fontWeight: '700',
        color: colors.text,
    },
    closeButton: {
        fontSize: typography.fontSize.body,
        color: colors.primary,
        fontWeight: '600',
    },
    modalForm: {
        padding: spacing.lg,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: colors.background,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: typography.fontSize.body,
        color: colors.text,
        minHeight: 50,
    },
    row: {
        flexDirection: 'row',
    },
    modalActions: {
        marginTop: spacing.lg,
        marginBottom: spacing.xxl,
    },
    // Upload Button
    uploadButton: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    uploadButtonIcon: {
        fontSize: 32,
        marginBottom: spacing.sm,
    },
    uploadButtonText: {
        fontSize: typography.fontSize.body,
        color: colors.text,
        fontWeight: '600',
    },
    selectedFileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    selectedFileText: {
        flex: 1,
        fontSize: typography.fontSize.body,
        color: colors.text,
        fontWeight: '600',
    },
    changeFileButton: {
        paddingLeft: spacing.md,
    },
    changeFileText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: typography.fontSize.small,
    },
    templateInfo: {
        backgroundColor: '#E3F2FD',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    templateLabel: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
    },
    templateName: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
        marginLeft: spacing.sm,
    },
    changeTemplate: {
        fontSize: typography.fontSize.small,
        fontWeight: '700',
        color: colors.primary,
    },
    hintText: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginTop: spacing.sm,
        lineHeight: 20,
    },
});
