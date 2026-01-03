/**
 * Template Database Service
 * Handles CRUD operations for document templates with version control
 */
import { Database, supabase } from '@/src/core/api/supabase';

export type DocumentTemplate = Database['public']['Tables']['document_templates']['Row'];
export type TemplateInsert = Database['public']['Tables']['document_templates']['Insert'];
export type TemplateUpdate = Database['public']['Tables']['document_templates']['Update'];

// Template version type (for versioning table)
export interface TemplateVersion {
    id: string;
    template_id: string;
    version_number: number;
    html_content: string;
    variables: string[];
    change_summary?: string;
    created_at: string;
}

export interface TemplateResult {
    success: boolean;
    data?: DocumentTemplate | DocumentTemplate[];
    error?: string;
}

export interface VersionResult {
    success: boolean;
    data?: TemplateVersion | TemplateVersion[];
    error?: string;
}

// ============================================
// Template CRUD Operations
// ============================================

/**
 * Get all templates for the current user
 */
export async function getMyTemplates(): Promise<TemplateResult> {
    try {
        const { data, error } = await supabase
            .from('document_templates')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get templates by type
 */
export async function getTemplatesByType(type: 'contract' | 'invoice' | 'checkin' | 'other'): Promise<TemplateResult> {
    try {
        const { data, error } = await supabase
            .from('document_templates')
            .select('*')
            .eq('type', type)
            .order('updated_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get a single template by ID
 */
export async function getTemplate(id: string): Promise<TemplateResult> {
    try {
        const { data, error } = await supabase
            .from('document_templates')
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
 * Get the default template for a type
 */
export async function getDefaultTemplate(type: 'contract' | 'invoice' | 'checkin' | 'other'): Promise<TemplateResult> {
    try {
        const { data, error } = await supabase
            .from('document_templates')
            .select('*')
            .eq('type', type)
            .eq('is_default', true)
            .single();

        if (error) {
            // No default found, get most recent
            if (error.code === 'PGRST116') {
                return getTemplatesByType(type);
            }
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Create a new template
 */
export async function createTemplate(template: {
    name: string;
    html_content: string;
    variables?: string[];
    type?: 'contract' | 'invoice' | 'checkin' | 'other';
    is_default?: boolean;
}): Promise<TemplateResult> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const { data, error } = await supabase
            .from('document_templates')
            .insert({
                ...template,
                user_id: user.id,
            })
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        // Create initial version
        if (data) {
            await createVersion(data.id, data.html_content, data.variables || [], 'Versión inicial');
        }

        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Update a template (creates a new version automatically)
 */
export async function updateTemplate(
    id: string,
    updates: Partial<TemplateUpdate>,
    changeSummary?: string
): Promise<TemplateResult> {
    try {
        // If content changed, create a version before updating
        if (updates.html_content) {
            await createVersionFromCurrent(id, changeSummary || 'Actualización');
        }

        const { data, error } = await supabase
            .from('document_templates')
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
 * Delete a template (and all its versions)
 */
export async function deleteTemplate(id: string): Promise<TemplateResult> {
    try {
        const { error } = await supabase
            .from('document_templates')
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
 * Set a template as the default for its type
 */
export async function setDefaultTemplate(id: string): Promise<TemplateResult> {
    try {
        // Get template type first
        const templateResult = await getTemplate(id);
        if (!templateResult.success || !templateResult.data || Array.isArray(templateResult.data)) {
            return { success: false, error: 'Template no encontrado' };
        }

        const templateType = templateResult.data.type;

        // Unset all other defaults of the same type
        await supabase
            .from('document_templates')
            .update({ is_default: false })
            .eq('type', templateType);

        // Set this template as default
        return updateTemplate(id, { is_default: true });
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ============================================
// Version Control Operations
// ============================================

/**
 * Get all versions for a template
 */
export async function getTemplateVersions(templateId: string): Promise<VersionResult> {
    try {
        const { data, error } = await supabase
            .from('template_versions')
            .select('*')
            .eq('template_id', templateId)
            .order('version_number', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get a specific version
 */
export async function getVersion(versionId: string): Promise<VersionResult> {
    try {
        const { data, error } = await supabase
            .from('template_versions')
            .select('*')
            .eq('id', versionId)
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
 * Create a new version for a template
 */
export async function createVersion(
    templateId: string,
    htmlContent: string,
    variables: string[],
    changeSummary?: string
): Promise<VersionResult> {
    try {
        // Get the latest version number
        const { data: versions } = await supabase
            .from('template_versions')
            .select('version_number')
            .eq('template_id', templateId)
            .order('version_number', { ascending: false })
            .limit(1);

        const nextVersion = versions && versions.length > 0
            ? versions[0].version_number + 1
            : 1;

        const { data, error } = await supabase
            .from('template_versions')
            .insert({
                template_id: templateId,
                version_number: nextVersion,
                html_content: htmlContent,
                variables: variables,
                change_summary: changeSummary,
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
 * Create a version from the current template content
 */
async function createVersionFromCurrent(templateId: string, changeSummary: string): Promise<VersionResult> {
    const templateResult = await getTemplate(templateId);

    if (!templateResult.success || !templateResult.data || Array.isArray(templateResult.data)) {
        return { success: false, error: 'Template no encontrado' };
    }

    const template = templateResult.data;
    return createVersion(
        templateId,
        template.html_content,
        template.variables || [],
        changeSummary
    );
}

/**
 * Restore a template to a previous version
 */
export async function restoreVersion(templateId: string, versionId: string): Promise<TemplateResult> {
    try {
        // Get the version to restore
        const versionResult = await getVersion(versionId);
        if (!versionResult.success || !versionResult.data || Array.isArray(versionResult.data)) {
            return { success: false, error: 'Versión no encontrada' };
        }

        const version = versionResult.data;

        // Create a version of the current state before restoring
        await createVersionFromCurrent(templateId, 'Antes de restaurar');

        // Update the template with the version's content
        return updateTemplate(templateId, {
            html_content: version.html_content,
            variables: version.variables,
        }, `Restaurado a versión ${version.version_number}`);
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
