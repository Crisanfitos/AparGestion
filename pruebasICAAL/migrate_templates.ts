/**
 * Template Migration Script
 * Lists templates from Supabase storage bucket and creates database records
 * 
 * Run this in the app or with Node.js with Supabase client configured
 */

import { supabase } from '../src/core/api/supabase';

async function listStorageBuckets() {
    console.log('=== Listing Storage Buckets ===');
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error('Error listing buckets:', error);
        return;
    }

    console.log('Available buckets:', buckets.map(b => b.name));
    return buckets;
}

async function listFilesInBucket(bucketName: string, path: string = '') {
    console.log(`\n=== Listing files in ${bucketName}/${path || '(root)'} ===`);

    const { data: files, error } = await supabase.storage
        .from(bucketName)
        .list(path, {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
        });

    if (error) {
        console.error('Error listing files:', error);
        return [];
    }

    console.log('Files found:', files?.length || 0);
    files?.forEach(f => {
        console.log(`  - ${f.name} (${f.metadata?.size || 'folder'})`);
    });

    return files || [];
}

async function migrateTemplateFromStorage(bucketName: string, filePath: string, userId: string) {
    console.log(`\nMigrating: ${filePath}`);

    // 1. Download the file content
    const { data, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(filePath);

    if (downloadError) {
        console.error('  Error downloading:', downloadError);
        return null;
    }

    // 2. Read as text (assuming it's HTML or JSON)
    const content = await data.text();
    let htmlContent = content;
    let templateName = filePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Template Recuperada';
    let variables: string[] = [];

    // If it's JSON (old local format), parse it
    if (filePath.endsWith('.json')) {
        try {
            const parsed = JSON.parse(content);
            htmlContent = parsed.html || content;
            templateName = parsed.name || templateName;
            variables = parsed.variables || [];
        } catch (e) {
            console.log('  Not JSON, treating as raw HTML');
        }
    }

    // 3. Extract variables from HTML
    if (variables.length === 0) {
        const matches = htmlContent.match(/\{\{([^}]+)\}\}/g) || [];
        variables = [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '').trim()))];
    }

    // 4. Create database record
    const { data: insertData, error: insertError } = await supabase
        .from('document_templates')
        .insert({
            user_id: userId,
            name: templateName,
            html_content: htmlContent,
            variables: variables,
            type: 'contract', // Default type
            is_default: false
        })
        .select()
        .single();

    if (insertError) {
        console.error('  Error inserting:', insertError);
        return null;
    }

    console.log(`  ✅ Created: ${insertData.id} - ${insertData.name}`);
    return insertData;
}

// Main migration function
export async function runTemplateMigration() {
    console.log('🔄 Starting Template Migration...\n');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('❌ Not authenticated');
        return;
    }
    console.log('User ID:', user.id);

    // List buckets
    await listStorageBuckets();

    // List files in templates bucket (adjust bucket name as needed)
    const possibleBuckets = ['templates', 'documents', 'document-templates', 'user-templates'];

    for (const bucket of possibleBuckets) {
        const files = await listFilesInBucket(bucket);

        if (files.length > 0) {
            console.log(`\n📁 Found files in '${bucket}' bucket`);

            for (const file of files) {
                if (!file.id) continue; // Skip folders
                await migrateTemplateFromStorage(bucket, file.name, user.id);
            }
        }
    }

    console.log('\n✅ Migration complete!');
}

// Run directly if this file is executed
runTemplateMigration();
