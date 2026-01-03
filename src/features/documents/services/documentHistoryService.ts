/**
 * Document History Service
 * Tracks generated documents (PDFs) with metadata in Supabase
 */
import { supabase } from '@/src/core/api/supabase';

export interface GeneratedDocument {
    id: string;
    user_id: string;
    template_id?: string;
    title: string;
    document_type: 'contract' | 'invoice' | 'checkin' | 'other';
    file_url?: string;
    file_name?: string;
    variables_used?: Record<string, any>;
    created_at: string;
}

export interface DocumentHistoryResult {
    success: boolean;
    data?: GeneratedDocument | GeneratedDocument[];
    error?: string;
}

// ============================================
// Document History CRUD
// ============================================

/**
 * Get all generated documents for current user
 */
export async function getMyDocuments(): Promise<DocumentHistoryResult> {
    try {
        const { data, error } = await supabase
            .from('generated_documents')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get documents by type
 */
export async function getDocumentsByType(docType: GeneratedDocument['document_type']): Promise<DocumentHistoryResult> {
    try {
        const { data, error } = await supabase
            .from('generated_documents')
            .select('*')
            .eq('document_type', docType)
            .order('created_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get documents for a specific property
 */
export async function getDocumentsForProperty(propertyId: string): Promise<DocumentHistoryResult> {
    try {
        const { data, error } = await supabase
            .from('generated_documents')
            .select('*')
            .eq('property_id', propertyId)
            .order('created_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Get documents for a specific reservation
 */
export async function getDocumentsForReservation(reservationId: string): Promise<DocumentHistoryResult> {
    try {
        const { data, error } = await supabase
            .from('generated_documents')
            .select('*')
            .eq('reservation_id', reservationId)
            .order('created_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Record a new generated document
 */
export async function recordGeneratedDocument(doc: {
    title: string;
    document_type: GeneratedDocument['document_type'];
    template_id?: string;
    file_url?: string;
    file_name?: string;
    variables_used?: Record<string, any>;
}): Promise<DocumentHistoryResult> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const { data, error } = await supabase
            .from('generated_documents')
            .insert({
                ...doc,
                user_id: user.id,
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

import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Upload a generated PDF to Supabase Storage and record it
 */
export async function uploadAndRecordDocument(
    localFilePath: string,
    doc: {
        title: string;
        document_type: GeneratedDocument['document_type'];
        template_id?: string;
        file_name?: string;
        variables_used?: Record<string, any>;
    }
): Promise<DocumentHistoryResult> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        // Generate unique filename
        const timestamp = Date.now();
        // Remove .pdf extension if present to avoid duplication (e.g. file_pdf.pdf)
        const cleanTitle = doc.title.replace(/\.pdf$/i, '');
        const safeTitle = cleanTitle.replace(/[^a-zA-Z0-9]/g, '_');
        const filePath = `${user.id}/${timestamp}_${safeTitle}.pdf`;

        // Read file as Base64 and convert to ArrayBuffer
        // This is more robust on Android than using fetch(file://) for Blobs
        const base64 = await FileSystem.readAsStringAsync(localFilePath, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const arrayBuffer = Buffer.from(base64, 'base64');

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, arrayBuffer, {
                contentType: 'application/pdf',
                upsert: false,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            // Still record the document even if upload fails
            return recordGeneratedDocument(doc);
        }

        // Get public URL (or signed URL for private bucket)
        const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

        // Record document with file URL
        return recordGeneratedDocument({
            ...doc,
            file_url: urlData.publicUrl,
        });
    } catch (err: any) {
        console.error('Upload and record error:', err);
        // Fallback to just recording without file
        return recordGeneratedDocument(doc);
    }
}

/**
 * Delete a document record (and optionally the file)
 */
export async function deleteDocument(id: string, deleteFile: boolean = true): Promise<DocumentHistoryResult> {
    try {
        // If deleting file, get the URL first
        if (deleteFile) {
            const { data: doc } = await supabase
                .from('generated_documents')
                .select('file_url')
                .eq('id', id)
                .single();

            if (doc?.file_url) {
                // Extract path from URL and delete from storage
                const urlParts = doc.file_url.split('/documents/');
                if (urlParts.length > 1) {
                    await supabase.storage
                        .from('documents')
                        .remove([urlParts[1]]);
                }
            }
        }

        // Delete the record
        const { error } = await supabase
            .from('generated_documents')
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
 * Get document count by type for stats
 */
export async function getDocumentStats(): Promise<{
    total: number;
    byType: Record<string, number>;
}> {
    try {
        const { data, error } = await supabase
            .from('generated_documents')
            .select('document_type');

        if (error || !data) {
            return { total: 0, byType: {} };
        }

        const byType: Record<string, number> = {};
        data.forEach((doc) => {
            const docType = doc.document_type || 'other';
            byType[docType] = (byType[docType] || 0) + 1;
        });

        return {
            total: data.length,
            byType,
        };
    } catch {
        return { total: 0, byType: {} };
    }
}
