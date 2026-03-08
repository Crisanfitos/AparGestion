/**
 * Template Draft Service
 * Manages draft saves for template filling
 */
import { supabase } from '@/src/core/api/supabase';

// ============================================
// Types
// ============================================

export interface TemplateDraft {
    id: string;
    user_id: string;
    template_id: string;
    name: string;
    values: Record<string, string>;
    group_values: Record<string, Record<string, string>[]>;
    created_at: string;
    updated_at: string;
    // Joined data
    template_name?: string;
    template_type?: string;
}

export interface DraftResult {
    success: boolean;
    data?: TemplateDraft | TemplateDraft[];
    error?: string;
}

export interface CreateDraftDTO {
    template_id: string;
    name: string;
    values: Record<string, string>;
    group_values: Record<string, Record<string, string>[]>;
}

// ============================================
// Draft CRUD Operations
// ============================================

/**
 * Get all drafts for current user
 */
export async function getMyDrafts(): Promise<DraftResult> {
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) {
            return { success: false, error: 'No authenticated user' };
        }

        const { data, error } = await supabase
            .from('template_drafts')
            .select(`
                *,
                document_templates!inner (
                    name,
                    type
                )
            `)
            .eq('user_id', user.user.id)
            .order('updated_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        // Transform to include template info
        const drafts = (data || []).map(d => ({
            ...d,
            template_name: d.document_templates?.name,
            template_type: d.document_templates?.type,
        }));

        return { success: true, data: drafts };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get drafts for a specific template
 */
export async function getDraftsForTemplate(templateId: string): Promise<DraftResult> {
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) {
            return { success: false, error: 'No authenticated user' };
        }

        const { data, error } = await supabase
            .from('template_drafts')
            .select('*')
            .eq('user_id', user.user.id)
            .eq('template_id', templateId)
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
 * Get drafts by template type (contract, invoice, etc.)
 */
export async function getDraftsByType(type: string): Promise<DraftResult> {
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) {
            return { success: false, error: 'No authenticated user' };
        }

        const { data, error } = await supabase
            .from('template_drafts')
            .select(`
                *,
                document_templates!inner (
                    name,
                    type
                )
            `)
            .eq('user_id', user.user.id)
            .eq('document_templates.type', type)
            .order('updated_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        const drafts = (data || []).map(d => ({
            ...d,
            template_name: d.document_templates?.name,
            template_type: d.document_templates?.type,
        }));

        return { success: true, data: drafts };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get a single draft by ID
 */
export async function getDraft(id: string): Promise<DraftResult> {
    try {
        const { data, error } = await supabase
            .from('template_drafts')
            .select(`
                *,
                document_templates!inner (
                    name,
                    type
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        const draft = {
            ...data,
            template_name: data.document_templates?.name,
            template_type: data.document_templates?.type,
        };

        return { success: true, data: draft };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Create a new draft
 */
export async function createDraft(draft: CreateDraftDTO): Promise<DraftResult> {
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) {
            return { success: false, error: 'No authenticated user' };
        }

        const { data, error } = await supabase
            .from('template_drafts')
            .insert({
                user_id: user.user.id,
                template_id: draft.template_id,
                name: draft.name,
                values: draft.values,
                group_values: draft.group_values,
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
 * Update an existing draft
 */
export async function updateDraft(
    id: string,
    updates: {
        name?: string;
        values?: Record<string, string>;
        group_values?: Record<string, Record<string, string>[]>;
    }
): Promise<DraftResult> {
    try {
        const { data, error } = await supabase
            .from('template_drafts')
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
 * Delete a draft
 */
export async function deleteDraft(id: string): Promise<DraftResult> {
    try {
        const { error } = await supabase
            .from('template_drafts')
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
 * Delete all drafts for a template (used after PDF generation)
 */
export async function deleteDraftsForTemplate(templateId: string): Promise<DraftResult> {
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) {
            return { success: false, error: 'No authenticated user' };
        }

        const { error } = await supabase
            .from('template_drafts')
            .delete()
            .eq('user_id', user.user.id)
            .eq('template_id', templateId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Upsert draft - create or update based on template_id
 * Useful for auto-save functionality
 */
export async function upsertDraft(
    templateId: string,
    name: string,
    values: Record<string, string>,
    groupValues: Record<string, Record<string, string>[]>,
    existingDraftId?: string
): Promise<DraftResult> {
    if (existingDraftId) {
        return updateDraft(existingDraftId, { name, values, group_values: groupValues });
    } else {
        return createDraft({ template_id: templateId, name, values, group_values: groupValues });
    }
}
