/**
 * Template Fill Screen
 * - Load a saved template
 * - Fill in variable values with typed inputs
 * - Generate PDF with replaced values
 */
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, colors, spacing } from '@/src/core/theme';
import { uploadAndRecordDocument } from '@/src/features/documents/services/documentHistoryService';
import {
    DocumentTemplate,
    getMyTemplates,
    getTemplate
} from '@/src/features/documents/services/templateDbService';
import { generatePdfFromTemplate, GroupInstanceValues } from '@/src/features/documents/services/templateService';
import {
    getGroupsForTemplate,
    getVariablesForTemplate,
    TemplateVariable,
    TemplateVariableGroup,
    transformValue,
    validateValue
} from '@/src/features/documents/services/templateVariableService';

export default function TemplateFillScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        id?: string;
        filterType?: string;
        draftId?: string;        // Load from existing draft
        fromDocumentId?: string; // Reuse data from generated document
    }>();

    // Template state
    const [template, setTemplate] = useState<DocumentTemplate | null>(null);
    const [values, setValues] = useState<Record<string, string>>({});
    const [variableConfigs, setVariableConfigs] = useState<Record<string, TemplateVariable>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // Group state
    const [groups, setGroups] = useState<TemplateVariableGroup[]>([]);
    const [groupValues, setGroupValues] = useState<GroupInstanceValues>({});

    // Filter state - locked to filterType if provided
    const lockedFilterType = params.filterType || null;

    // Draft state
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
    const [draftName, setDraftName] = useState('');
    const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

    // Available templates for selection
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [showTemplateSelector, setShowTemplateSelector] = useState(true); // Auto-show on mount

    // Date picker state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [currentDateField, setCurrentDateField] = useState<string | null>(null);
    const [currentGroupContext, setCurrentGroupContext] = useState<{ groupName: string; instanceIndex: number } | null>(null);
    const [tempDate, setTempDate] = useState(new Date());

    // Auto-save interval (30 seconds)
    useEffect(() => {
        if (!template || !currentDraftId) return;

        const interval = setInterval(() => {
            handleAutoSave();
        }, 30000);

        return () => clearInterval(interval);
    }, [template, currentDraftId, values, groupValues]);

    // Load template on mount
    useEffect(() => {
        loadInitialData();
    }, [params.id, params.filterType, params.draftId, params.fromDocumentId]);

    const loadInitialData = async () => {
        setIsLoading(true);

        // Load all templates from database
        const result = await getMyTemplates();
        if (result.success && Array.isArray(result.data)) {
            // Filter by type if filterType is provided
            if (lockedFilterType) {
                setTemplates(result.data.filter(t => t.type === lockedFilterType));
            } else {
                setTemplates(result.data);
            }
        }

        // Priority: Draft > Document > Template ID
        if (params.draftId) {
            // Load from draft
            await loadFromDraft(params.draftId);
        } else if (params.fromDocumentId) {
            // Load from generated document (reuse data)
            await loadFromDocument(params.fromDocumentId);
        } else if (params.id) {
            // Load template
            const loadedResult = await getTemplate(params.id);
            if (loadedResult.success && loadedResult.data && !Array.isArray(loadedResult.data)) {
                setTemplate(loadedResult.data);
                initializeValues(loadedResult.data.variables || []);
                setShowTemplateSelector(false);
            }
        }

        setIsLoading(false);
    };

    // Import draft service dynamically to avoid circular deps
    const loadFromDraft = async (draftId: string) => {
        const { getDraft } = await import('@/src/features/documents/services/templateDraftService');
        const draftResult = await getDraft(draftId);

        if (draftResult.success && draftResult.data && !Array.isArray(draftResult.data)) {
            const draft = draftResult.data;
            setCurrentDraftId(draft.id);
            setDraftName(draft.name);

            // Load the template
            const templateResult = await getTemplate(draft.template_id);
            if (templateResult.success && templateResult.data && !Array.isArray(templateResult.data)) {
                const loadedTemplate = templateResult.data;
                setTemplate(loadedTemplate);

                // Load variable configs (for input types, etc) but DON'T set values
                const configs: Record<string, TemplateVariable> = {};
                const configResult = await getVariablesForTemplate(loadedTemplate.id);
                if (configResult.success && Array.isArray(configResult.data)) {
                    configResult.data.forEach(v => {
                        configs[v.name] = v;
                    });
                }
                setVariableConfigs(configs);

                // Load groups
                const groupsResult = await getGroupsForTemplate(loadedTemplate.id);
                if (groupsResult.success && Array.isArray(groupsResult.data)) {
                    setGroups(groupsResult.data);
                }

                // NOW set the pre-loaded values from the draft
                setValues(draft.values || {});
                setGroupValues(draft.group_values || {});
                setShowTemplateSelector(false);
            }
        }
    };

    const loadFromDocument = async (documentId: string) => {
        const { supabase } = await import('@/src/core/api/supabase');
        const { data, error } = await supabase
            .from('generated_documents')
            .select('template_id, variables_used, group_values_used')
            .eq('id', documentId)
            .single();

        if (!error && data?.template_id) {
            const templateResult = await getTemplate(data.template_id);
            if (templateResult.success && templateResult.data && !Array.isArray(templateResult.data)) {
                const loadedTemplate = templateResult.data;
                setTemplate(loadedTemplate);

                // Load variable configs (for input types, etc) but DON'T set values
                const configs: Record<string, TemplateVariable> = {};
                const configResult = await getVariablesForTemplate(loadedTemplate.id);
                if (configResult.success && Array.isArray(configResult.data)) {
                    configResult.data.forEach(v => {
                        configs[v.name] = v;
                    });
                }
                setVariableConfigs(configs);

                // Load groups
                const groupsResult = await getGroupsForTemplate(loadedTemplate.id);
                if (groupsResult.success && Array.isArray(groupsResult.data)) {
                    setGroups(groupsResult.data);
                }

                // NOW set the pre-loaded values from the document
                setValues(data.variables_used || {});
                setGroupValues(data.group_values_used || {});
                setShowTemplateSelector(false);
            }
        }
    };

    const handleAutoSave = async () => {
        if (!template || !currentDraftId) return;

        const { updateDraft } = await import('@/src/features/documents/services/templateDraftService');
        await updateDraft(currentDraftId, { values, group_values: groupValues });
        setLastAutoSave(new Date());
    };

    const handleSaveDraft = async () => {
        if (!template) return;

        setIsSavingDraft(true);
        const { upsertDraft } = await import('@/src/features/documents/services/templateDraftService');

        const name = draftName || `Borrador - ${template.name}`;
        const result = await upsertDraft(template.id, name, values, groupValues, currentDraftId || undefined);

        if (result.success && result.data && !Array.isArray(result.data)) {
            setCurrentDraftId(result.data.id);
            setDraftName(result.data.name);
            setShowSaveDraftModal(false);
            Alert.alert('✅ Borrador Guardado', 'Tu progreso se ha guardado correctamente.');
        } else {
            Alert.alert('Error', result.error || 'No se pudo guardar el borrador');
        }

        setIsSavingDraft(false);
    };

    const initializeValues = (variables: string[]) => {
        const initialValues: Record<string, string> = {};
        variables.forEach(v => {
            initialValues[v] = '';
        });
        setValues(initialValues);
    };

    const handleSelectTemplate = async (selected: DocumentTemplate) => {
        setTemplate(selected);
        await loadVariableConfigs(selected.id, selected.variables || []);
        setShowTemplateSelector(false);
    };

    const loadVariableConfigs = async (templateId: string, variables: string[]) => {
        // Initialize values with defaults
        const initialValues: Record<string, string> = {};
        const configs: Record<string, TemplateVariable> = {};

        // Load configured variables from database
        const result = await getVariablesForTemplate(templateId);
        if (result.success && Array.isArray(result.data)) {
            result.data.forEach(v => {
                configs[v.name] = v;
                // Only set initial values for non-group variables
                if (!v.group_id) {
                    initialValues[v.name] = v.default_value || '';
                }
            });
        }

        // Ensure all template variables have an entry (for standalone variables)
        variables.forEach(v => {
            if (!(v in initialValues) && !configs[v]?.group_id) {
                initialValues[v] = '';
            }
        });

        // Load groups
        const groupsResult = await getGroupsForTemplate(templateId);
        const loadedGroups: TemplateVariableGroup[] = [];
        const initialGroupValues: GroupInstanceValues = {};

        if (groupsResult.success && Array.isArray(groupsResult.data)) {
            groupsResult.data.forEach(group => {
                loadedGroups.push(group);
                // Initialize with one empty instance per group (min_instances)
                const groupVars = Object.values(configs).filter(v => v.group_id === group.id);
                const emptyInstance: Record<string, string> = {};
                groupVars.forEach(v => {
                    emptyInstance[v.name] = v.default_value || '';
                });
                // Create min_instances number of instances
                initialGroupValues[group.name] = Array.from(
                    { length: group.min_instances },
                    () => ({ ...emptyInstance })
                );
            });
        }

        setGroups(loadedGroups);
        setGroupValues(initialGroupValues);
        setVariableConfigs(configs);
        setValues(initialValues);
    };

    const handleValueChange = (key: string, value: string) => {
        // Apply transformation if configured
        const config = variableConfigs[key];
        const finalValue = config ? transformValue(value, config) : value;
        setValues(prev => ({ ...prev, [key]: finalValue }));
    };

    // Handle value change for group variables
    const handleGroupValueChange = (groupName: string, instanceIndex: number, varName: string, value: string) => {
        const config = variableConfigs[varName];
        const finalValue = config ? transformValue(value, config) : value;

        setGroupValues(prev => {
            const groupInstances = [...(prev[groupName] || [])];
            if (!groupInstances[instanceIndex]) {
                groupInstances[instanceIndex] = {};
            }
            groupInstances[instanceIndex] = {
                ...groupInstances[instanceIndex],
                [varName]: finalValue
            };
            return { ...prev, [groupName]: groupInstances };
        });
    };

    // Add a new instance to a group
    const handleAddGroupInstance = (group: TemplateVariableGroup) => {
        const currentInstances = groupValues[group.name] || [];
        if (currentInstances.length >= group.max_instances) {
            Alert.alert('Límite alcanzado', `Máximo ${group.max_instances} ${group.display_name || group.name} permitidos`);
            return;
        }

        // Create empty instance with all group variables
        const groupVars = Object.values(variableConfigs).filter(v => v.group_id === group.id);
        const emptyInstance: Record<string, string> = {};
        groupVars.forEach(v => {
            emptyInstance[v.name] = v.default_value || '';
        });

        setGroupValues(prev => ({
            ...prev,
            [group.name]: [...(prev[group.name] || []), emptyInstance]
        }));
    };

    // Remove an instance from a group
    const handleRemoveGroupInstance = (group: TemplateVariableGroup, instanceIndex: number) => {
        const currentInstances = groupValues[group.name] || [];
        if (currentInstances.length <= group.min_instances) {
            Alert.alert('Mínimo requerido', `Mínimo ${group.min_instances} ${group.display_name || group.name} requeridos`);
            return;
        }

        setGroupValues(prev => ({
            ...prev,
            [group.name]: prev[group.name].filter((_, i) => i !== instanceIndex)
        }));
    };

    // Get keyboard type for a variable
    const getKeyboardType = (varName: string): 'default' | 'numeric' | 'email-address' | 'phone-pad' => {
        const config = variableConfigs[varName];
        if (!config) return 'default';

        switch (config.variable_type) {
            case 'number':
            case 'currency':
                return 'numeric';
            case 'email':
                return 'email-address';
            case 'phone':
                return 'phone-pad';
            default:
                return 'default';
        }
    };

    // Get auto capitalize setting for a variable
    const getAutoCapitalize = (varName: string): 'none' | 'sentences' | 'words' | 'characters' => {
        const config = variableConfigs[varName];
        if (!config) return 'sentences';

        if (config.variable_type === 'uppercase' || config.transform === 'uppercase') {
            return 'characters';
        }
        if (config.variable_type === 'lowercase' || config.transform === 'lowercase') {
            return 'none';
        }
        if (config.transform === 'capitalize') {
            return 'words';
        }
        if (config.variable_type === 'email') {
            return 'none';
        }
        return 'sentences';
    };

    // Get display name for a variable
    const getDisplayName = (varName: string): string => {
        const config = variableConfigs[varName];
        return config?.display_name || varName;
    };

    // Get placeholder for a variable
    const getPlaceholder = (varName: string): string => {
        const config = variableConfigs[varName];
        if (config?.placeholder) return config.placeholder;

        switch (config?.variable_type) {
            case 'email': return 'example@email.com';
            case 'phone': return '600 123 456';
            case 'dni': return '12345678A';
            case 'date': return 'DD/MM/AAAA';
            case 'currency': return '0.00';
            default: return `Escribe ${getDisplayName(varName)}...`;
        }
    };

    // Check if field is required
    const isRequired = (varName: string): boolean => {
        return variableConfigs[varName]?.is_required || false;
    };

    // Get type icon
    const getTypeIcon = (varName: string): string => {
        const config = variableConfigs[varName];
        if (!config) return '📝';

        switch (config.variable_type) {
            case 'uppercase': return '🔠';
            case 'lowercase': return '🔡';
            case 'number': return '🔢';
            case 'currency': return '💶';
            case 'date': return '📅';
            case 'dni': return '🪪';
            case 'email': return '📧';
            case 'phone': return '📱';
            case 'nie': return '🪪';
            case 'passport': return '🛂';
            case 'select': return '📋';
            default: return '📝';
        }
    };

    // Open date picker for a field
    const openDatePicker = (varName: string) => {
        const currentValue = values[varName];
        if (currentValue) {
            // Parse DD/MM/YYYY format
            const parts = currentValue.split('/');
            if (parts.length === 3) {
                const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                if (!isNaN(date.getTime())) {
                    setTempDate(date);
                }
            }
        } else {
            setTempDate(new Date());
        }
        setCurrentDateField(varName);
        setShowDatePicker(true);
    };

    // Handle date selection
    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate && currentDateField) {
            const formatted = `${selectedDate.getDate().toString().padStart(2, '0')}/${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}/${selectedDate.getFullYear()}`;
            setValues(prev => ({ ...prev, [currentDateField]: formatted }));
            setTempDate(selectedDate);
        }
    };

    // Confirm date selection (iOS)
    const confirmDateSelection = () => {
        if (currentDateField) {
            const formatted = `${tempDate.getDate().toString().padStart(2, '0')}/${(tempDate.getMonth() + 1).toString().padStart(2, '0')}/${tempDate.getFullYear()}`;
            setValues(prev => ({ ...prev, [currentDateField]: formatted }));
        }
        setShowDatePicker(false);
        setCurrentDateField(null);
    };

    const handleGenerate = async () => {
        if (!template) return;

        // Validate all fields
        const requiredErrors: string[] = [];
        const optionalEmpty: string[] = [];
        const validationErrors: string[] = [];

        for (const varName of template.variables) {
            const config = variableConfigs[varName];
            const value = values[varName] || '';
            const displayName = config?.display_name || varName;

            // Check required fields
            if (config?.is_required && !value.trim()) {
                requiredErrors.push(displayName);
            } else if (!value.trim()) {
                optionalEmpty.push(displayName);
            }

            // Validate non-empty values
            if (value.trim() && config) {
                const validation = validateValue(value, config);
                if (!validation.valid) {
                    validationErrors.push(`${displayName}: ${validation.error}`);
                }
            }
        }

        // Show validation errors first (they block generation)
        if (validationErrors.length > 0) {
            Alert.alert(
                '❌ Errores de Validación',
                `Por favor corrige los siguientes errores:\n\n${validationErrors.map(e => `• ${e}`).join('\n')}`
            );
            return;
        }

        // Show required field errors (they block generation)
        if (requiredErrors.length > 0) {
            Alert.alert(
                '⚠️ Campos Obligatorios',
                `Los siguientes campos son obligatorios y están vacíos:\n\n${requiredErrors.map(f => `• ${f}`).join('\n')}`
            );
            return;
        }

        // Show optional empty fields as warning (doesn't block)
        if (optionalEmpty.length > 0) {
            Alert.alert(
                '💡 Campos Opcionales Vacíos',
                `Los siguientes campos opcionales están vacíos:\n\n${optionalEmpty.map(f => `• ${f}`).join('\n')}\n\n¿Generar de todos modos?`,
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
            // Build group configs from loaded groups
            const groupConfigs: Record<string, { separator: string }> = {};
            groups.forEach(g => {
                groupConfigs[g.name] = { separator: g.separator };
            });

            const result = await generatePdfFromTemplate(
                template.html_content,
                values,
                template.name,
                groupValues,
                groupConfigs
            );

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
                group_values_used: groupValues,
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

                {/* Variables Form - Standalone variables only */}
                {template && Object.values(variableConfigs).filter(v => !v.group_id).length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>✏️ Datos Generales</Text>

                        {Object.values(variableConfigs)
                            .filter(v => !v.group_id)
                            .map((config) => {
                                const variable = config.name;
                                const varType = config?.variable_type;

                                return (
                                    <View key={variable} style={styles.fieldRow}>
                                        <View style={styles.fieldLabelRow}>
                                            <Text style={styles.fieldIcon}>{getTypeIcon(variable)}</Text>
                                            <Text style={styles.fieldLabel}>
                                                {getDisplayName(variable)}
                                                {isRequired(variable) && <Text style={styles.requiredMark}> *</Text>}
                                            </Text>
                                        </View>
                                        {config?.help_text && (
                                            <Text style={styles.fieldHelpText}>
                                                {config.help_text}
                                            </Text>
                                        )}

                                        {/* Date field - show date picker button */}
                                        {varType === 'date' ? (
                                            <TouchableOpacity
                                                style={[
                                                    styles.fieldInput,
                                                    styles.datePickerButton,
                                                    isRequired(variable) && !values[variable]?.trim() && styles.fieldInputRequired
                                                ]}
                                                onPress={() => openDatePicker(variable)}
                                            >
                                                <Text style={values[variable] ? styles.dateValue : styles.datePlaceholder}>
                                                    {values[variable] || '📅 Seleccionar fecha...'}
                                                </Text>
                                            </TouchableOpacity>
                                        ) : varType === 'select' && config?.options && config.options.length > 0 ? (
                                            /* Select field - show picker dropdown */
                                            <View style={[
                                                styles.pickerContainer,
                                                isRequired(variable) && !values[variable]?.trim() && styles.fieldInputRequired
                                            ]}>
                                                <Picker
                                                    selectedValue={values[variable] || ''}
                                                    onValueChange={(value) => handleValueChange(variable, value)}
                                                    style={styles.picker}
                                                >
                                                    <Picker.Item label="-- Seleccionar --" value="" />
                                                    {config.options.map((option, idx) => (
                                                        <Picker.Item key={idx} label={option} value={option} />
                                                    ))}
                                                </Picker>
                                            </View>
                                        ) : (
                                            /* Regular text input */
                                            <TextInput
                                                style={[
                                                    styles.fieldInput,
                                                    isRequired(variable) && !values[variable]?.trim() && styles.fieldInputRequired
                                                ]}
                                                value={values[variable] || ''}
                                                onChangeText={(text) => handleValueChange(variable, text)}
                                                placeholder={getPlaceholder(variable)}
                                                placeholderTextColor={colors.placeholder}
                                                keyboardType={getKeyboardType(variable)}
                                                autoCapitalize={getAutoCapitalize(variable)}
                                            />
                                        )}
                                    </View>
                                );
                            })}
                    </View>
                )}

                {/* Groups - Repeatable sections */}
                {groups.map((group) => {
                    const groupVars = Object.values(variableConfigs).filter(v => v.group_id === group.id);
                    const instances = groupValues[group.name] || [];

                    return (
                        <View key={group.id} style={styles.section}>
                            <View style={styles.groupHeader}>
                                <Text style={styles.sectionTitle}>
                                    🔄 {group.display_name || group.name}
                                </Text>
                                <Text style={styles.groupCount}>
                                    {instances.length} / {group.max_instances}
                                </Text>
                            </View>

                            {instances.map((instance, instanceIndex) => (
                                <View key={instanceIndex} style={styles.groupInstance}>
                                    <View style={styles.instanceHeader}>
                                        <Text style={styles.instanceTitle}>
                                            #{instanceIndex + 1}
                                        </Text>
                                        {instances.length > group.min_instances && (
                                            <TouchableOpacity
                                                style={styles.removeInstanceButton}
                                                onPress={() => handleRemoveGroupInstance(group, instanceIndex)}
                                            >
                                                <Text style={styles.removeInstanceText}>🗑️</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {groupVars.map((config) => {
                                        const variable = config.name;
                                        const varType = config.variable_type;
                                        const instanceValue = instance[variable] || '';

                                        return (
                                            <View key={variable} style={styles.fieldRow}>
                                                <View style={styles.fieldLabelRow}>
                                                    <Text style={styles.fieldIcon}>{getTypeIcon(variable)}</Text>
                                                    <Text style={styles.fieldLabel}>
                                                        {config.display_name || variable}
                                                        {config.is_required && <Text style={styles.requiredMark}> *</Text>}
                                                    </Text>
                                                </View>

                                                {varType === 'date' ? (
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.fieldInput,
                                                            styles.datePickerButton,
                                                            config.is_required && !instanceValue?.trim() && styles.fieldInputRequired
                                                        ]}
                                                        onPress={() => {
                                                            setCurrentGroupContext({ groupName: group.name, instanceIndex });
                                                            openDatePicker(variable);
                                                        }}
                                                    >
                                                        <Text style={instanceValue ? styles.dateValue : styles.datePlaceholder}>
                                                            {instanceValue || '📅 Seleccionar fecha...'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ) : varType === 'select' && config.options && config.options.length > 0 ? (
                                                    <View style={[
                                                        styles.pickerContainer,
                                                        config.is_required && !instanceValue?.trim() && styles.fieldInputRequired
                                                    ]}>
                                                        <Picker
                                                            selectedValue={instanceValue}
                                                            onValueChange={(value) => handleGroupValueChange(group.name, instanceIndex, variable, value)}
                                                            style={styles.picker}
                                                        >
                                                            <Picker.Item label="-- Seleccionar --" value="" />
                                                            {config.options.map((option, idx) => (
                                                                <Picker.Item key={idx} label={option} value={option} />
                                                            ))}
                                                        </Picker>
                                                    </View>
                                                ) : (
                                                    <TextInput
                                                        style={[
                                                            styles.fieldInput,
                                                            config.is_required && !instanceValue?.trim() && styles.fieldInputRequired
                                                        ]}
                                                        value={instanceValue}
                                                        onChangeText={(text) => handleGroupValueChange(group.name, instanceIndex, variable, text)}
                                                        placeholder={config.placeholder || `Escribe ${config.display_name || variable}...`}
                                                        placeholderTextColor={colors.placeholder}
                                                        keyboardType={getKeyboardType(variable)}
                                                        autoCapitalize={getAutoCapitalize(variable)}
                                                    />
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}

                            {instances.length < group.max_instances && (
                                <TouchableOpacity
                                    style={styles.addInstanceButton}
                                    onPress={() => handleAddGroupInstance(group)}
                                >
                                    <Text style={styles.addInstanceText}>
                                        ➕ Añadir {group.display_name || group.name}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}

                {/* Preview hint */}
                {template && (
                    <View style={styles.hintBox}>
                        <Text style={styles.hintText}>
                            💡 Al generar, todos los {'{campos}'} se reemplazarán con los valores que has introducido.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Footer Actions - Save Draft + Generate */}
            {template && (
                <View style={styles.footer}>
                    {/* Save Draft Button */}
                    <TouchableOpacity
                        style={[styles.saveDraftButton, isSavingDraft && styles.disabledButton]}
                        onPress={() => setShowSaveDraftModal(true)}
                        disabled={isSavingDraft}
                    >
                        <Text style={styles.saveDraftButtonText}>📋 Guardar Borrador</Text>
                    </TouchableOpacity>

                    {/* Generate PDF Button */}
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

            {/* Draft Status Indicator */}
            {currentDraftId && lastAutoSave && (
                <View style={styles.draftIndicator}>
                    <Text style={styles.draftIndicatorText}>
                        ✅ Borrador guardado: {lastAutoSave.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            )}

            {/* Save Draft Modal */}
            <Modal
                visible={showSaveDraftModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSaveDraftModal(false)}
            >
                <View style={styles.saveDraftModalOverlay}>
                    <View style={styles.saveDraftModalContent}>
                        <Text style={styles.saveDraftModalTitle}>📋 Guardar Borrador</Text>

                        <Text style={styles.saveDraftModalLabel}>Nombre del borrador:</Text>
                        <TextInput
                            style={styles.saveDraftModalInput}
                            value={draftName}
                            onChangeText={setDraftName}
                            placeholder={`Borrador - ${template?.name || 'Plantilla'}`}
                            placeholderTextColor={colors.placeholder}
                        />

                        <View style={styles.saveDraftModalActions}>
                            <TouchableOpacity
                                style={styles.saveDraftModalCancel}
                                onPress={() => setShowSaveDraftModal(false)}
                            >
                                <Text style={styles.saveDraftModalCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveDraftModalConfirm, isSavingDraft && styles.disabledButton]}
                                onPress={handleSaveDraft}
                                disabled={isSavingDraft}
                            >
                                {isSavingDraft ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text style={styles.saveDraftModalConfirmText}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Date Picker Modal (iOS) / Inline (Android) */}
            {showDatePicker && Platform.OS === 'ios' && (
                <Modal
                    visible={showDatePicker}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowDatePicker(false)}
                >
                    <View style={styles.datePickerModal}>
                        <View style={styles.datePickerModalContent}>
                            <View style={styles.datePickerHeader}>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                    <Text style={styles.datePickerCancel}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={confirmDateSelection}>
                                    <Text style={styles.datePickerConfirm}>Confirmar</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={tempDate}
                                mode="date"
                                display="spinner"
                                onChange={handleDateChange}
                                locale="es-ES"
                            />
                        </View>
                    </View>
                </Modal>
            )}

            {/* Date Picker (Android - shows inline) */}
            {showDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
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
    fieldLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    fieldIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    requiredMark: {
        color: colors.error,
        fontWeight: '700',
    },
    fieldHelpText: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        fontStyle: 'italic',
    },
    fieldInputRequired: {
        borderColor: colors.warning,
        borderWidth: 2,
    },
    // Date picker styles
    datePickerButton: {
        justifyContent: 'center',
    },
    dateValue: {
        fontSize: 16,
        color: colors.text,
    },
    datePlaceholder: {
        fontSize: 16,
        color: colors.placeholder,
    },
    // Picker styles
    pickerContainer: {
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    picker: {
        color: colors.text,
    },
    // Date picker modal (iOS)
    datePickerModal: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    datePickerModalContent: {
        backgroundColor: colors.background,
        padding: spacing.md,
        borderTopLeftRadius: borderRadius.lg,
        borderTopRightRadius: borderRadius.lg,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    datePickerCancel: {
        color: colors.error,
        fontSize: 16,
    },
    datePickerConfirm: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    // Group styles
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    groupCount: {
        fontSize: 14,
        color: colors.textSecondary,
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    groupInstance: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    instanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    instanceTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
    },
    removeInstanceButton: {
        padding: spacing.sm,
    },
    removeInstanceText: {
        fontSize: 20,
    },
    addInstanceButton: {
        backgroundColor: '#E3F2FD',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary,
        borderStyle: 'dashed',
    },
    addInstanceText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 16,
    },
    // Draft styles
    saveDraftButton: {
        flex: 1,
        backgroundColor: '#9C27B0',
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    saveDraftButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    draftIndicator: {
        backgroundColor: '#E8F5E9',
        padding: spacing.sm,
        alignItems: 'center',
    },
    draftIndicatorText: {
        color: '#2E7D32',
        fontSize: 12,
        fontWeight: '500',
    },
    saveDraftModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    saveDraftModalContent: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        width: '100%',
        maxWidth: 400,
    },
    saveDraftModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    saveDraftModalLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    saveDraftModalInput: {
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: 16,
        color: colors.text,
    },
    saveDraftModalActions: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    saveDraftModalCancel: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    saveDraftModalCancelText: {
        color: colors.text,
        fontWeight: '600',
    },
    saveDraftModalConfirm: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        backgroundColor: colors.primary,
    },
    saveDraftModalConfirmText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
