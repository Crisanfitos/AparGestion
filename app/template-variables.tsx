/**
 * Template Variables Configuration Screen
 * Master-Detail UI for configuring variable types
 */
import { Picker } from '@react-native-picker/picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, colors, spacing, typography } from '@/src/core/theme';
import { getTemplate } from '@/src/features/documents/services/templateDbService';
import {
    assignVariableToGroup,
    deleteVariable,
    getGroupsForTemplate,
    getVariablesForTemplate,
    syncVariablesAndGroupsFromHtml,
    TemplateVariable,
    TemplateVariableGroup,
    TransformType,
    updateVariable,
    VariableType
} from '@/src/features/documents/services/templateVariableService';

const VARIABLE_TYPES: { value: VariableType; label: string; icon: string }[] = [
    { value: 'text', label: 'Texto', icon: '📝' },
    { value: 'uppercase', label: 'Mayúsculas', icon: '🔠' },
    { value: 'lowercase', label: 'Minúsculas', icon: '🔡' },
    { value: 'number', label: 'Número', icon: '🔢' },
    { value: 'currency', label: 'Moneda (€)', icon: '💶' },
    { value: 'date', label: 'Fecha', icon: '📅' },
    { value: 'dni', label: 'DNI Español', icon: '🪪' },
    { value: 'nie', label: 'NIE Español', icon: '🪪' },
    { value: 'passport', label: 'Pasaporte', icon: '🛂' },
    { value: 'email', label: 'Email', icon: '📧' },
    { value: 'phone', label: 'Teléfono', icon: '📱' },
    { value: 'select', label: 'Opciones', icon: '📋' },
];

const TRANSFORM_TYPES: { value: TransformType; label: string }[] = [
    { value: 'none', label: 'Sin transformar' },
    { value: 'uppercase', label: 'MAYÚSCULAS' },
    { value: 'lowercase', label: 'minúsculas' },
    { value: 'capitalize', label: 'Capitalizar' },
];

export default function TemplateVariablesScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id: string }>();
    const templateId = params.id;

    // State
    const [variables, setVariables] = useState<TemplateVariable[]>([]);
    const [groups, setGroups] = useState<TemplateVariableGroup[]>([]);
    const [selectedVariable, setSelectedVariable] = useState<TemplateVariable | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<TemplateVariableGroup | null>(null);

    // Edit form state
    const [editForm, setEditForm] = useState({
        display_name: '',
        variable_type: 'text' as VariableType,
        is_required: false,
        default_value: '',
        transform: 'none' as TransformType,
        placeholder: '',
        help_text: '',
        options: '', // Comma-separated for select type
        group_id: null as string | null
    });

    // Group edit form state
    const [groupForm, setGroupForm] = useState({
        name: '',
        display_name: '',
        separator: '; ',
        min_instances: 1,
        max_instances: 10
    });

    // Load data
    const loadData = useCallback(async () => {
        if (!templateId) return;

        setIsLoading(true);

        // Get template info
        const templateResult = await getTemplate(templateId);
        if (templateResult.success && templateResult.data && !Array.isArray(templateResult.data)) {
            setTemplateName(templateResult.data.name);
        }

        // Get variables
        const varsResult = await getVariablesForTemplate(templateId);
        if (varsResult.success && Array.isArray(varsResult.data)) {
            setVariables(varsResult.data);
        }

        // Get groups
        const groupsResult = await getGroupsForTemplate(templateId);
        if (groupsResult.success && Array.isArray(groupsResult.data)) {
            setGroups(groupsResult.data);
        }

        setIsLoading(false);
    }, [templateId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Sync variables from template HTML
    const handleSync = async () => {
        if (!templateId) return;

        setIsSyncing(true);

        const templateResult = await getTemplate(templateId);
        if (!templateResult.success || !templateResult.data || Array.isArray(templateResult.data)) {
            Alert.alert('Error', 'No se pudo cargar la plantilla');
            setIsSyncing(false);
            return;
        }

        const result = await syncVariablesAndGroupsFromHtml(templateId, templateResult.data.html_content);

        setIsSyncing(false);
        await loadData();

        const totalVars = result.variables.detected.length;
        const totalGroups = result.groups.detected.length;

        if (totalVars === 0 && totalGroups === 0) {
            Alert.alert(
                'Sin Variables',
                'No se encontraron variables en la plantilla.\n\nAsegúrate de que las variables tienen el formato {nombre_variable}\n\nPara grupos repetibles usa: {{#grupo}}...{{/grupo}}'
            );
        } else {
            let message = `Variables detectadas: ${totalVars}\n` +
                `• Nuevas: ${result.variables.created}\n` +
                `• Ya existían: ${result.variables.existing}`;

            if (totalGroups > 0) {
                message += `\n\nGrupos repetibles: ${totalGroups}\n` +
                    `• Nuevos: ${result.groups.created}\n` +
                    `• Ya existían: ${result.groups.existing}\n` +
                    `Grupos: ${result.groups.detected.join(', ')}`;
            }

            Alert.alert('Sincronización Completa', message);
        }
    };

    // Open edit modal
    const handleEditVariable = (variable: TemplateVariable) => {
        setSelectedVariable(variable);
        setEditForm({
            display_name: variable.display_name || '',
            variable_type: variable.variable_type,
            is_required: variable.is_required,
            default_value: variable.default_value || '',
            transform: variable.transform,
            placeholder: variable.placeholder || '',
            help_text: variable.help_text || '',
            options: (variable.options || []).join(', '),
            group_id: variable.group_id || null,
        });
        setShowEditModal(true);
    };

    // Save variable changes
    const handleSaveVariable = async () => {
        if (!selectedVariable) return;

        const result = await updateVariable(selectedVariable.id, {
            display_name: editForm.display_name || undefined,
            variable_type: editForm.variable_type,
            is_required: editForm.is_required,
            default_value: editForm.default_value || undefined,
            transform: editForm.transform,
            placeholder: editForm.placeholder || undefined,
            help_text: editForm.help_text || undefined,
            options: editForm.options ? editForm.options.split(',').map(o => o.trim()) : undefined,
        });

        // Update group assignment if changed
        if (selectedVariable.group_id !== editForm.group_id) {
            await assignVariableToGroup(selectedVariable.id, editForm.group_id);
        }

        if (result.success) {
            setShowEditModal(false);
            await loadData();
            Alert.alert('✅ Guardado', 'Variable actualizada correctamente');
        } else {
            Alert.alert('Error', result.error || 'No se pudo guardar');
        }
    };

    // Delete variable
    const handleDeleteVariable = (variable: TemplateVariable) => {
        Alert.alert(
            'Eliminar Variable',
            `¿Eliminar "${variable.display_name || variable.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await deleteVariable(variable.id);
                        if (result.success) {
                            await loadData();
                        } else {
                            Alert.alert('Error', result.error || 'No se pudo eliminar');
                        }
                    },
                },
            ]
        );
    };

    // Get type icon
    const getTypeInfo = (type: VariableType) => {
        return VARIABLE_TYPES.find(t => t.value === type) || VARIABLE_TYPES[0];
    };

    // Render variable item
    const renderVariable = ({ item }: { item: TemplateVariable }) => {
        const typeInfo = getTypeInfo(item.variable_type);

        return (
            <TouchableOpacity
                style={styles.variableCard}
                onPress={() => handleEditVariable(item)}
                onLongPress={() => handleDeleteVariable(item)}
            >
                <View style={styles.variableHeader}>
                    <Text style={styles.variableIcon}>{typeInfo.icon}</Text>
                    <View style={styles.variableInfo}>
                        <Text style={styles.variableName}>
                            {item.display_name || item.name}
                        </Text>
                        <Text style={styles.variableTechName}>
                            {'{{' + item.name + '}}'}
                        </Text>
                    </View>
                    {item.is_required && (
                        <View style={styles.requiredBadge}>
                            <Text style={styles.requiredText}>*</Text>
                        </View>
                    )}
                </View>
                <View style={styles.variableMeta}>
                    <Text style={styles.variableType}>{typeInfo.label}</Text>
                    {item.transform !== 'none' && (
                        <Text style={styles.variableTransform}>
                            → {TRANSFORM_TYPES.find(t => t.value === item.transform)?.label}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ title: '⚙️ Variables' }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Cargando variables...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: `⚙️ ${templateName}` }} />

            {/* Header with sync button */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Variables de la Plantilla</Text>
                <TouchableOpacity
                    style={styles.syncButton}
                    onPress={handleSync}
                    disabled={isSyncing}
                >
                    <Text style={styles.syncButtonText}>
                        {isSyncing ? '⏳ Sincronizando...' : '🔄 Sincronizar'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Variables list */}
            <FlatList
                data={variables}
                renderItem={renderVariable}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyText}>No hay variables configuradas</Text>
                        <Text style={styles.emptyHint}>
                            Pulsa "Sincronizar" para detectar variables de la plantilla
                        </Text>
                    </View>
                }
            />

            {/* Edit Modal */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowEditModal(false)}>
                            <Text style={styles.modalCancel}>Cancelar</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {selectedVariable?.name}
                        </Text>
                        <TouchableOpacity onPress={handleSaveVariable}>
                            <Text style={styles.modalSave}>Guardar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {/* Display Name */}
                        <Text style={styles.fieldLabel}>Nombre para mostrar</Text>
                        <TextInput
                            style={styles.textInput}
                            value={editForm.display_name}
                            onChangeText={(t) => setEditForm(prev => ({ ...prev, display_name: t }))}
                            placeholder="Nombre del Campo"
                        />

                        {/* Variable Type */}
                        <Text style={styles.fieldLabel}>Tipo de Variable</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={editForm.variable_type}
                                onValueChange={(v) => setEditForm(prev => ({ ...prev, variable_type: v }))}
                                style={styles.picker}
                            >
                                {VARIABLE_TYPES.map(type => (
                                    <Picker.Item
                                        key={type.value}
                                        label={`${type.icon} ${type.label}`}
                                        value={type.value}
                                    />
                                ))}
                            </Picker>
                        </View>

                        {/* Transform */}
                        <Text style={styles.fieldLabel}>Transformación</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={editForm.transform}
                                onValueChange={(v) => setEditForm(prev => ({ ...prev, transform: v }))}
                                style={styles.picker}
                            >
                                {TRANSFORM_TYPES.map(type => (
                                    <Picker.Item
                                        key={type.value}
                                        label={type.label}
                                        value={type.value}
                                    />
                                ))}
                            </Picker>
                        </View>

                        {/* Group Assignment */}
                        {groups.length > 0 && (
                            <>
                                <Text style={styles.fieldLabel}>Grupo Repetible</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={editForm.group_id || ''}
                                        onValueChange={(v) => setEditForm(prev => ({ ...prev, group_id: v || null }))}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label="🚫 Sin grupo (variable simple)" value="" />
                                        {groups.map(group => (
                                            <Picker.Item
                                                key={group.id}
                                                label={`🔄 ${group.display_name || group.name}`}
                                                value={group.id}
                                            />
                                        ))}
                                    </Picker>
                                </View>
                                <Text style={styles.groupHint}>
                                    Asigna esta variable a un grupo para permitir múltiples instancias
                                </Text>
                            </>
                        )}

                        {/* Required */}
                        <View style={styles.switchRow}>
                            <Text style={styles.fieldLabel}>Campo obligatorio</Text>
                            <Switch
                                value={editForm.is_required}
                                onValueChange={(v) => setEditForm(prev => ({ ...prev, is_required: v }))}
                                trackColor={{ true: colors.primary }}
                            />
                        </View>

                        {/* Default Value */}
                        <Text style={styles.fieldLabel}>Valor por defecto</Text>
                        <TextInput
                            style={styles.textInput}
                            value={editForm.default_value}
                            onChangeText={(t) => setEditForm(prev => ({ ...prev, default_value: t }))}
                            placeholder="Opcional"
                        />

                        {/* Placeholder */}
                        <Text style={styles.fieldLabel}>Placeholder</Text>
                        <TextInput
                            style={styles.textInput}
                            value={editForm.placeholder}
                            onChangeText={(t) => setEditForm(prev => ({ ...prev, placeholder: t }))}
                            placeholder="Texto de ayuda en el campo"
                        />

                        {/* Help Text */}
                        <Text style={styles.fieldLabel}>Texto de ayuda</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            value={editForm.help_text}
                            onChangeText={(t) => setEditForm(prev => ({ ...prev, help_text: t }))}
                            placeholder="Instrucciones adicionales"
                            multiline
                            numberOfLines={3}
                        />

                        {/* Options (for select type) */}
                        {editForm.variable_type === 'select' && (
                            <>
                                <Text style={styles.fieldLabel}>Opciones (separadas por coma)</Text>
                                <TextInput
                                    style={[styles.textInput, styles.textArea]}
                                    value={editForm.options}
                                    onChangeText={(t) => setEditForm(prev => ({ ...prev, options: t }))}
                                    placeholder="Opción 1, Opción 2, Opción 3"
                                    multiline
                                />
                            </>
                        )}

                        <View style={{ height: 50 }} />
                    </ScrollView>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: typography.fontSize.large,
        fontWeight: '700',
        color: colors.text,
    },
    syncButton: {
        backgroundColor: colors.primary + '20',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    syncButtonText: {
        color: colors.primary,
        fontWeight: '600',
    },
    list: {
        padding: spacing.md,
    },
    variableCard: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 2,
        borderColor: colors.border,
    },
    variableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    variableIcon: {
        fontSize: 28,
        marginRight: spacing.md,
    },
    variableInfo: {
        flex: 1,
    },
    variableName: {
        fontSize: typography.fontSize.body,
        fontWeight: '600',
        color: colors.text,
    },
    variableTechName: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
        fontFamily: 'monospace',
    },
    requiredBadge: {
        backgroundColor: colors.error + '20',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    requiredText: {
        color: colors.error,
        fontWeight: '700',
        fontSize: 16,
    },
    variableMeta: {
        flexDirection: 'row',
        marginTop: spacing.sm,
        gap: spacing.sm,
    },
    variableType: {
        fontSize: typography.fontSize.small,
        color: colors.primary,
        backgroundColor: colors.primary + '10',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    variableTransform: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
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
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: typography.fontSize.large,
        fontWeight: '700',
        color: colors.text,
    },
    modalCancel: {
        fontSize: typography.fontSize.body,
        color: colors.error,
    },
    modalSave: {
        fontSize: typography.fontSize.body,
        color: colors.primary,
        fontWeight: '600',
    },
    modalContent: {
        flex: 1,
        padding: spacing.md,
    },
    fieldLabel: {
        fontSize: typography.fontSize.small,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    textInput: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        fontSize: typography.fontSize.body,
        color: colors.text,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    picker: {
        color: colors.text,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.md,
    },
    groupHint: {
        fontSize: typography.fontSize.small,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginTop: spacing.xs,
    },
});
