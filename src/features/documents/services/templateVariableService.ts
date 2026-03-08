/**
 * Template Variable Service
 * Handles CRUD operations for typed template variables
 */
import { supabase } from '@/src/core/api/supabase';

// Variable types supported
export type VariableType =
    | 'text'
    | 'number'
    | 'date'
    | 'dni'
    | 'nie'        // NIE español
    | 'passport'   // Pasaporte (sin formato específico)
    | 'email'
    | 'phone'
    | 'select'
    | 'uppercase'
    | 'lowercase'
    | 'currency';

export type TransformType = 'uppercase' | 'lowercase' | 'capitalize' | 'none';

export interface TemplateVariableGroup {
    id: string;
    template_id: string;
    name: string;
    display_name?: string;
    separator: string;
    min_instances: number;
    max_instances: number;
    sort_order: number;
    created_at: string;
}

export interface TemplateVariable {
    id: string;
    template_id: string;
    name: string;
    display_name?: string;
    variable_type: VariableType;
    is_required: boolean;
    default_value?: string;
    options?: string[];
    validation_regex?: string;
    transform: TransformType;
    placeholder?: string;
    help_text?: string;
    sort_order: number;
    created_at: string;
    group_id?: string;  // Reference to TemplateVariableGroup
}

export interface CreateVariableDTO {
    template_id: string;
    name: string;
    display_name?: string;
    variable_type?: VariableType;
    is_required?: boolean;
    default_value?: string;
    options?: string[];
    validation_regex?: string;
    transform?: TransformType;
    placeholder?: string;
    help_text?: string;
    sort_order?: number;
    group_id?: string;
}

export interface CreateGroupDTO {
    template_id: string;
    name: string;
    display_name?: string;
    separator?: string;
    min_instances?: number;
    max_instances?: number;
    sort_order?: number;
}

export interface VariableResult {
    success: boolean;
    data?: TemplateVariable | TemplateVariable[];
    error?: string;
}

export interface GroupResult {
    success: boolean;
    data?: TemplateVariableGroup | TemplateVariableGroup[];
    error?: string;
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Get all variables for a template
 */
export async function getVariablesForTemplate(templateId: string): Promise<VariableResult> {
    try {
        const { data, error } = await supabase
            .from('template_variables')
            .select('*')
            .eq('template_id', templateId)
            .order('sort_order', { ascending: true });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get a single variable by ID
 */
export async function getVariable(id: string): Promise<VariableResult> {
    try {
        const { data, error } = await supabase
            .from('template_variables')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Create a new variable
 */
export async function createVariable(variable: CreateVariableDTO): Promise<VariableResult> {
    try {
        const { data, error } = await supabase
            .from('template_variables')
            .insert({
                ...variable,
                variable_type: variable.variable_type || 'text',
                transform: variable.transform || 'none',
                is_required: variable.is_required || false,
                sort_order: variable.sort_order || 0,
            })
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Update a variable
 */
export async function updateVariable(
    id: string,
    updates: Partial<Omit<CreateVariableDTO, 'template_id'>>
): Promise<VariableResult> {
    try {
        const { data, error } = await supabase
            .from('template_variables')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Delete a variable
 */
export async function deleteVariable(id: string): Promise<VariableResult> {
    try {
        const { error } = await supabase
            .from('template_variables')
            .delete()
            .eq('id', id);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ============================================
// Sync & Utility Functions
// ============================================

/**
 * Sync variables from HTML content
 * Detects {{variable}} patterns and creates records for new ones
 */
export async function syncVariablesFromHtml(
    templateId: string,
    htmlContent: string
): Promise<{ created: number; existing: number; detected: string[] }> {
    console.log('[syncVariables] Starting sync for template:', templateId);
    console.log('[syncVariables] HTML content length:', htmlContent?.length || 0);

    // Extract variable names from HTML - handles {variable} with single braces
    // Also handles { variable } with spaces inside
    const regex = /\{([^{}]+)\}/g;
    const variableNames: string[] = [];
    let match;

    while ((match = regex.exec(htmlContent)) !== null) {
        const varName = match[1].trim();
        // Skip if it looks like CSS or contains special chars that aren't valid variable names
        if (varName && !variableNames.includes(varName) && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
            variableNames.push(varName);
        }
    }

    console.log('[syncVariables] Detected variables:', variableNames);

    // Get existing variables
    const existingResult = await getVariablesForTemplate(templateId);
    const existingNames = new Set(
        Array.isArray(existingResult.data)
            ? existingResult.data.map(v => v.name)
            : []
    );
    console.log('[syncVariables] Existing variables:', Array.from(existingNames));

    let created = 0;
    let existing = 0;

    for (let i = 0; i < variableNames.length; i++) {
        const name = variableNames[i];

        if (existingNames.has(name)) {
            existing++;
        } else {
            // Create new variable with default settings
            console.log('[syncVariables] Creating variable:', name);
            const result = await createVariable({
                template_id: templateId,
                name: name,
                display_name: formatDisplayName(name),
                variable_type: guessVariableType(name),
                sort_order: i,
            });

            if (result.success) {
                created++;
                console.log('[syncVariables] Created:', name);
            } else {
                console.error('[syncVariables] Failed to create:', name, result.error);
            }
        }
    }

    console.log('[syncVariables] Summary: created=', created, 'existing=', existing);
    return { created, existing, detected: variableNames };
}

/**
 * Format a variable name into a display name
 * e.g., "nombre_inquilino" -> "Nombre Inquilino"
 */
function formatDisplayName(name: string): string {
    return name
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim();
}

/**
 * Guess variable type from its name
 */
function guessVariableType(name: string): VariableType {
    const lower = name.toLowerCase();

    if (lower.includes('fecha') || lower.includes('date')) return 'date';
    if (lower.includes('dni') || lower.includes('nif')) return 'dni';
    if (lower.includes('email') || lower.includes('correo')) return 'email';
    if (lower.includes('telefono') || lower.includes('phone') || lower.includes('movil')) return 'phone';
    if (lower.includes('precio') || lower.includes('importe') || lower.includes('total') || lower.includes('coste')) return 'currency';
    if (lower.includes('numero') || lower.includes('cantidad') || lower.includes('dias')) return 'number';

    return 'text';
}

// ============================================
// Validation & Transformation
// ============================================

/**
 * Validate a value against a variable's type and rules
 */
export function validateValue(value: string, variable: TemplateVariable): { valid: boolean; error?: string } {
    if (variable.is_required && !value.trim()) {
        return { valid: false, error: `${variable.display_name || variable.name} es obligatorio` };
    }

    if (!value.trim()) {
        return { valid: true }; // Empty non-required is valid
    }

    switch (variable.variable_type) {
        case 'number':
        case 'currency':
            if (isNaN(Number(value.replace(',', '.').replace('€', '').trim()))) {
                return { valid: false, error: 'Debe ser un número válido' };
            }
            break;

        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return { valid: false, error: 'Email no válido' };
            }
            break;

        case 'dni':
            // DNI español: 8 números + letra de control
            const dniClean = value.replace(/[- ]/g, '').toUpperCase();
            const dniRegex = /^[0-9]{8}[A-Z]$/;
            if (!dniRegex.test(dniClean)) {
                return { valid: false, error: 'DNI no válido (8 números + letra)' };
            }
            // Validar letra de control
            const dniLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
            const dniNumber = parseInt(dniClean.substring(0, 8));
            const expectedLetter = dniLetters[dniNumber % 23];
            if (dniClean[8] !== expectedLetter) {
                return { valid: false, error: `Letra del DNI incorrecta (debería ser ${expectedLetter})` };
            }
            break;

        case 'nie':
            // NIE español: X/Y/Z + 7 números + letra de control
            const nieClean = value.replace(/[- ]/g, '').toUpperCase();
            const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/;
            if (!nieRegex.test(nieClean)) {
                return { valid: false, error: 'NIE no válido (X/Y/Z + 7 números + letra)' };
            }
            // Validar letra de control del NIE
            const nieLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
            let niePrefix = nieClean[0];
            let nieNumber = nieClean.substring(1, 8);
            if (niePrefix === 'X') niePrefix = '0';
            else if (niePrefix === 'Y') niePrefix = '1';
            else if (niePrefix === 'Z') niePrefix = '2';
            const nieFullNumber = parseInt(niePrefix + nieNumber);
            const expectedNieLetter = nieLetters[nieFullNumber % 23];
            if (nieClean[8] !== expectedNieLetter) {
                return { valid: false, error: `Letra del NIE incorrecta (debería ser ${expectedNieLetter})` };
            }
            break;

        case 'passport':
            // Pasaporte: solo verificamos que tenga al menos 5 caracteres alfanuméricos
            if (value.replace(/[- ]/g, '').length < 5) {
                return { valid: false, error: 'Pasaporte debe tener al menos 5 caracteres' };
            }
            break;

        case 'phone':
            const phoneRegex = /^[+]?[0-9\s-]{9,15}$/;
            if (!phoneRegex.test(value)) {
                return { valid: false, error: 'Teléfono no válido' };
            }
            break;

        case 'date':
            // Accept DD/MM/YYYY format (Spanish format) or ISO
            const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
            const dateMatch = value.match(dateRegex);
            if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const month = parseInt(dateMatch[2]);
                const year = parseInt(dateMatch[3]);
                // Validate ranges
                if (month < 1 || month > 12) {
                    return { valid: false, error: 'Mes no válido (1-12)' };
                }
                if (day < 1 || day > 31) {
                    return { valid: false, error: 'Día no válido (1-31)' };
                }
                if (year < 1900 || year > 2100) {
                    return { valid: false, error: 'Año no válido' };
                }
            } else if (isNaN(Date.parse(value))) {
                // Also accept ISO format as fallback
                return { valid: false, error: 'Fecha no válida (usa DD/MM/AAAA)' };
            }
            break;
    }

    // Custom regex validation
    if (variable.validation_regex) {
        try {
            const regex = new RegExp(variable.validation_regex);
            if (!regex.test(value)) {
                return { valid: false, error: 'Formato no válido' };
            }
        } catch (e) {
            // Invalid regex, skip
        }
    }

    return { valid: true };
}

/**
 * Transform a value according to variable settings
 */
export function transformValue(value: string, variable: TemplateVariable): string {
    let result = value;

    // Apply type-specific transforms first
    if (variable.variable_type === 'uppercase') {
        result = result.toUpperCase();
    } else if (variable.variable_type === 'lowercase') {
        result = result.toLowerCase();
    }

    // Then apply explicit transform
    switch (variable.transform) {
        case 'uppercase':
            result = result.toUpperCase();
            break;
        case 'lowercase':
            result = result.toLowerCase();
            break;
        case 'capitalize':
            result = result
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            break;
    }

    // Format currency
    if (variable.variable_type === 'currency' && result) {
        const num = parseFloat(result.replace(',', '.').replace('€', '').trim());
        if (!isNaN(num)) {
            result = num.toFixed(2) + ' €';
        }
    }

    return result;
}

// ============================================
// Variable Group CRUD Operations
// ============================================

/**
 * Get all groups for a template
 */
export async function getGroupsForTemplate(templateId: string): Promise<GroupResult> {
    try {
        const { data, error } = await supabase
            .from('template_variable_groups')
            .select('*')
            .eq('template_id', templateId)
            .order('sort_order', { ascending: true });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get a single group by ID
 */
export async function getGroup(id: string): Promise<GroupResult> {
    try {
        const { data, error } = await supabase
            .from('template_variable_groups')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Create a new group
 */
export async function createGroup(group: CreateGroupDTO): Promise<GroupResult> {
    try {
        const { data, error } = await supabase
            .from('template_variable_groups')
            .insert({
                ...group,
                separator: group.separator || '; ',
                min_instances: group.min_instances || 1,
                max_instances: group.max_instances || 10,
                sort_order: group.sort_order || 0,
            })
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Update a group
 */
export async function updateGroup(
    id: string,
    updates: Partial<Omit<CreateGroupDTO, 'template_id'>>
): Promise<GroupResult> {
    try {
        const { data, error } = await supabase
            .from('template_variable_groups')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Delete a group (variables will have group_id set to null)
 */
export async function deleteGroup(id: string): Promise<GroupResult> {
    try {
        const { error } = await supabase
            .from('template_variable_groups')
            .delete()
            .eq('id', id);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Assign a variable to a group
 */
export async function assignVariableToGroup(
    variableId: string,
    groupId: string | null
): Promise<VariableResult> {
    try {
        const { data, error } = await supabase
            .from('template_variables')
            .update({ group_id: groupId })
            .eq('id', variableId)
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get all variables for a specific group
 */
export async function getVariablesForGroup(groupId: string): Promise<VariableResult> {
    try {
        const { data, error } = await supabase
            .from('template_variables')
            .select('*')
            .eq('group_id', groupId)
            .order('sort_order', { ascending: true });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ============================================
// Extended Sync with Groups
// ============================================

interface SyncResult {
    variables: { created: number; existing: number; detected: string[] };
    groups: { created: number; existing: number; detected: string[] };
}

/**
 * Sync variables and groups from HTML content
 * Detects {{#group}}...{{/group}} patterns for groups
 * and {variable} patterns for variables
 */
export async function syncVariablesAndGroupsFromHtml(
    templateId: string,
    htmlContent: string
): Promise<SyncResult> {
    console.log('[syncVariablesAndGroups] Starting sync for template:', templateId);

    const result: SyncResult = {
        variables: { created: 0, existing: 0, detected: [] },
        groups: { created: 0, existing: 0, detected: [] }
    };

    // 1. Detect groups: {{#Group Name}}...{{/Group Name}} - supports spaces in names
    // Technical name will be converted to snake_case, display_name keeps original
    const groupRegex = /\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
    const groupsDetected: Map<string, { displayName: string; variables: string[] }> = new Map();
    let groupMatch;

    while ((groupMatch = groupRegex.exec(htmlContent)) !== null) {
        const groupDisplayName = groupMatch[1].trim();
        const groupContent = groupMatch[2];

        // Convert display name to technical name (snake_case)
        const groupTechName = groupDisplayName
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9\s_]/g, '') // Keep only alphanumeric, spaces, underscores
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/_+/g, '_') // Collapse multiple underscores
            .replace(/^_|_$/g, ''); // Trim leading/trailing underscores

        if (!groupsDetected.has(groupTechName)) {
            groupsDetected.set(groupTechName, { displayName: groupDisplayName, variables: [] });
        }

        // Extract variables within this group
        const varRegex = /\{([^{}#/]+)\}/g;
        let varMatch;
        while ((varMatch = varRegex.exec(groupContent)) !== null) {
            const varName = varMatch[1].trim();
            if (varName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
                const groupData = groupsDetected.get(groupTechName)!;
                if (!groupData.variables.includes(varName)) {
                    groupData.variables.push(varName);
                }
            }
        }
    }

    console.log('[syncVariablesAndGroups] Groups detected:', Array.from(groupsDetected.keys()));

    // 2. Get or create groups
    const existingGroupsResult = await getGroupsForTemplate(templateId);
    const existingGroups = new Map<string, TemplateVariableGroup>();
    if (existingGroupsResult.success && Array.isArray(existingGroupsResult.data)) {
        existingGroupsResult.data.forEach(g => existingGroups.set(g.name, g));
    }

    const groupIdMap = new Map<string, string>();
    let groupOrder = 0;

    for (const [groupTechName, groupData] of groupsDetected) {
        result.groups.detected.push(groupData.displayName);

        if (existingGroups.has(groupTechName)) {
            result.groups.existing++;
            groupIdMap.set(groupTechName, existingGroups.get(groupTechName)!.id);
        } else {
            const createResult = await createGroup({
                template_id: templateId,
                name: groupTechName,
                display_name: groupData.displayName,
                sort_order: groupOrder++
            });

            if (createResult.success && createResult.data && !Array.isArray(createResult.data)) {
                result.groups.created++;
                groupIdMap.set(groupTechName, createResult.data.id);
                console.log('[syncVariablesAndGroups] Created group:', groupTechName, 'display:', groupData.displayName);
            }
        }
    }

    // 3. Detect all variables (both in groups and standalone)
    const allVarRegex = /\{([^{}#/]+)\}/g;
    const allVariables: string[] = [];
    let allVarMatch;

    // Remove group blocks first to get standalone variables
    let contentWithoutGroups = htmlContent.replace(groupRegex, '');

    while ((allVarMatch = allVarRegex.exec(contentWithoutGroups)) !== null) {
        const varName = allVarMatch[1].trim();
        if (varName && !allVariables.includes(varName) && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
            allVariables.push(varName);
        }
    }

    // Also add variables from groups
    for (const [, groupData] of groupsDetected) {
        for (const varName of groupData.variables) {
            if (!allVariables.includes(varName)) {
                allVariables.push(varName);
            }
        }
    }

    console.log('[syncVariablesAndGroups] Variables detected:', allVariables);
    result.variables.detected = allVariables;

    // 4. Get existing variables
    const existingVarsResult = await getVariablesForTemplate(templateId);
    const existingVars = new Map<string, TemplateVariable>();
    if (existingVarsResult.success && Array.isArray(existingVarsResult.data)) {
        existingVarsResult.data.forEach(v => existingVars.set(v.name, v));
    }

    // 5. Create or update variables
    let varOrder = 0;
    for (const varName of allVariables) {
        // Find which group this variable belongs to
        let belongsToGroup: string | null = null;
        for (const [groupTechName, groupData] of groupsDetected) {
            if (groupData.variables.includes(varName)) {
                belongsToGroup = groupIdMap.get(groupTechName) || null;
                break;
            }
        }

        if (existingVars.has(varName)) {
            result.variables.existing++;
            // Update group assignment if needed
            const existingVar = existingVars.get(varName)!;
            if (existingVar.group_id !== belongsToGroup) {
                await assignVariableToGroup(existingVar.id, belongsToGroup);
            }
        } else {
            const createResult = await createVariable({
                template_id: templateId,
                name: varName,
                display_name: formatDisplayName(varName),
                variable_type: guessVariableType(varName),
                sort_order: varOrder++,
                group_id: belongsToGroup || undefined,
            });

            if (createResult.success) {
                result.variables.created++;
            }
        }
    }

    console.log('[syncVariablesAndGroups] Summary:', result);
    return result;
}
