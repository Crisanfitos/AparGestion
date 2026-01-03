/**
 * Template Service
 * Handles Word content extraction, template persistence, and document generation
 */
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import PizZip from 'pizzip';

const TEMPLATES_DIR = `${FileSystem.documentDirectory}templates/`;

/**
 * Ensures the templates directory exists
 */
async function ensureTemplatesDir() {
    const info = await FileSystem.getInfoAsync(TEMPLATES_DIR);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(TEMPLATES_DIR, { intermediates: true });
    }
}

/**
 * Extracts the actual text content from a Word document and converts it to HTML
 * Preserves paragraphs, basic formatting (bold, italic), and structure
 */
export async function extractWordContentAsHtml(templateUri: string): Promise<{
    html: string;
    variables: string[];
    originalName: string;
}> {
    // 1. Read template file as Base64
    const templateBase64 = await FileSystem.readAsStringAsync(templateUri, {
        encoding: 'base64',
    });

    // 2. Convert Base64 to Binary
    const binaryStr = Buffer.from(templateBase64, 'base64').toString('binary');

    // 3. Load into PizZip
    const zip = new PizZip(binaryStr);

    // 4. Get document.xml content
    const documentXml = zip.file('word/document.xml');
    if (!documentXml) {
        throw new Error('No se encontró contenido en el documento Word');
    }

    const xmlContent = documentXml.asText();

    // 5. Parse XML and convert to HTML
    const html = parseWordXmlToEditableHtml(xmlContent);

    // 6. Extract variables
    const variables = extractVariablesFromHtml(html);

    // Get original filename from URI
    const originalName = templateUri.split('/').pop() || 'template.docx';

    return { html, variables, originalName };
}

/**
 * Parses Word XML and converts to editable HTML with formatting
 */
function parseWordXmlToEditableHtml(xmlContent: string): string {
    let html = '';

    // Parse paragraphs
    const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
    let paragraphMatch;

    while ((paragraphMatch = paragraphRegex.exec(xmlContent)) !== null) {
        const paragraphContent = paragraphMatch[1];

        // Check paragraph properties for alignment
        let alignment = '';
        if (paragraphContent.includes('<w:jc w:val="center"')) {
            alignment = 'text-align: center;';
        } else if (paragraphContent.includes('<w:jc w:val="right"')) {
            alignment = 'text-align: right;';
        } else if (paragraphContent.includes('<w:jc w:val="both"')) {
            alignment = 'text-align: justify;';
        }

        // Parse runs (text segments) within paragraph
        const runs = parseRuns(paragraphContent);

        if (runs.trim()) {
            const style = alignment ? ` style="${alignment}"` : '';
            html += `<p${style}>${runs}</p>\n`;
        } else {
            html += '<p><br></p>\n';
        }
    }

    // If no paragraphs found, try to extract any text
    if (!html.trim()) {
        const plainText = xmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        html = `<p>${escapeHtml(plainText)}</p>`;
    }

    return html;
}

/**
 * Parses text runs within a paragraph, preserving formatting
 */
function parseRuns(paragraphXml: string): string {
    let result = '';
    const runRegex = /<w:r[^>]*>([\s\S]*?)<\/w:r>/g;
    let runMatch;

    while ((runMatch = runRegex.exec(paragraphXml)) !== null) {
        const runContent = runMatch[1];

        // Check run properties for formatting
        const isBold = runContent.includes('<w:b/>') || runContent.includes('<w:b ');
        const isItalic = runContent.includes('<w:i/>') || runContent.includes('<w:i ');
        const isUnderline = runContent.includes('<w:u ');

        // Extract text from this run
        const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        let textMatch;
        let text = '';

        while ((textMatch = textRegex.exec(runContent)) !== null) {
            text += textMatch[1];
        }

        if (text) {
            let formattedText = escapeHtml(text);

            // Apply formatting in order
            if (isUnderline) formattedText = `<u>${formattedText}</u>`;
            if (isItalic) formattedText = `<i>${formattedText}</i>`;
            if (isBold) formattedText = `<b>${formattedText}</b>`;

            result += formattedText;
        }
    }

    // Also check for direct text outside runs
    if (!result) {
        const directTextRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        let match;
        while ((match = directTextRegex.exec(paragraphXml)) !== null) {
            result += escapeHtml(match[1]);
        }
    }

    return result;
}

/**
 * Extracts variable names from HTML content
 */
function extractVariablesFromHtml(html: string): string[] {
    const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(html)) !== null) {
        if (!variables.includes(match[1])) {
            variables.push(match[1]);
        }
    }

    return variables;
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ==================== TEMPLATE PERSISTENCE ====================

export interface SavedTemplate {
    id: string;
    name: string;
    html: string;
    variables: string[];
    createdAt: number;
    updatedAt: number;
}

/**
 * Saves a template to local storage
 */
export async function saveTemplate(name: string, html: string, variables: string[]): Promise<SavedTemplate> {
    await ensureTemplatesDir();

    const id = `template_${Date.now()}`;
    const template: SavedTemplate = {
        id,
        name,
        html,
        variables,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    const filepath = `${TEMPLATES_DIR}${id}.json`;
    await FileSystem.writeAsStringAsync(filepath, JSON.stringify(template));

    return template;
}

/**
 * Updates an existing template
 */
export async function updateTemplate(id: string, html: string, variables?: string[]): Promise<void> {
    const filepath = `${TEMPLATES_DIR}${id}.json`;
    const info = await FileSystem.getInfoAsync(filepath);

    if (!info.exists) {
        throw new Error('Template not found');
    }

    const content = await FileSystem.readAsStringAsync(filepath);
    const template: SavedTemplate = JSON.parse(content);

    template.html = html;
    template.updatedAt = Date.now();
    if (variables) {
        template.variables = variables;
    }

    await FileSystem.writeAsStringAsync(filepath, JSON.stringify(template));
}

/**
 * Loads a template by ID
 */
export async function loadTemplate(id: string): Promise<SavedTemplate | null> {
    const filepath = `${TEMPLATES_DIR}${id}.json`;
    const info = await FileSystem.getInfoAsync(filepath);

    if (!info.exists) {
        return null;
    }

    const content = await FileSystem.readAsStringAsync(filepath);
    return JSON.parse(content);
}

/**
 * Lists all saved templates
 */
export async function listTemplates(): Promise<SavedTemplate[]> {
    await ensureTemplatesDir();

    try {
        const files = await FileSystem.readDirectoryAsync(TEMPLATES_DIR);
        const templates: SavedTemplate[] = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                const content = await FileSystem.readAsStringAsync(`${TEMPLATES_DIR}${file}`);
                templates.push(JSON.parse(content));
            }
        }

        // Sort by updated date, newest first
        templates.sort((a, b) => b.updatedAt - a.updatedAt);
        return templates;
    } catch (error) {
        console.error('Error listing templates:', error);
        return [];
    }
}

/**
 * Deletes a template
 */
export async function deleteTemplate(id: string): Promise<void> {
    const filepath = `${TEMPLATES_DIR}${id}.json`;
    await FileSystem.deleteAsync(filepath, { idempotent: true });
}

// ==================== DOCUMENT GENERATION ====================

/**
 * Generates a PDF from HTML content with variables replaced
 * Saves to Downloads folder on Android
 */
export async function generatePdfFromTemplate(
    html: string,
    variables: Record<string, string>,
    filename?: string
): Promise<{ filepath: string; filename: string }> {
    // Replace variables in HTML
    let processedHtml = html;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        processedHtml = processedHtml.replace(regex, escapeHtml(value));
    }

    // Wrap in full HTML document
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
                h1 { font-size: 18pt; }
                h2 { font-size: 16pt; }
                p { margin: 0.5em 0; }
                b { font-weight: bold; }
                i { font-style: italic; }
                u { text-decoration: underline; }
            </style>
        </head>
        <body>
            ${processedHtml}
        </body>
        </html>
    `;

    // Generate PDF
    const { uri: pdfUri } = await Print.printToFileAsync({ html: fullHtml });

    // Generate filename
    const safeName = (filename || 'Documento').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').replace(/\s+/g, '_');
    const finalFilename = `${safeName}_${Date.now()}.pdf`;

    // Save to app's document directory
    const localPath = `${FileSystem.documentDirectory}${finalFilename}`;
    await FileSystem.moveAsync({ from: pdfUri, to: localPath });

    // Try to save to Downloads using SAF (Storage Access Framework)
    // This opens the native file picker to let user choose save location
    try {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (permissions.granted) {
            // Read the PDF content
            const pdfContent = await FileSystem.readAsStringAsync(localPath, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Create file in the user-selected directory
            const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                finalFilename,
                'application/pdf'
            );

            // Write the content
            await FileSystem.writeAsStringAsync(fileUri, pdfContent, {
                encoding: FileSystem.EncodingType.Base64,
            });

            console.log('PDF saved to Downloads:', fileUri);
        }
    } catch (safError) {
        console.log('SAF not available or user cancelled, using fallback share:', safError);
        // Fallback to share dialog if SAF fails
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(localPath, {
                mimeType: 'application/pdf',
                dialogTitle: 'Guardar Documento',
            });
        }
    }

    return { filepath: localPath, filename: finalFilename };
}
