/**
 * Contract Generator Service
 * Uses docxtemplater to fill Word (.docx) templates with data
 * Outputs PDF saved locally
 */
import { Buffer } from 'buffer';
import Docxtemplater from 'docxtemplater';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import PizZip from 'pizzip';

export interface ContractData {
  [key: string]: any; // Allow any fields for custom templates
}

/**
 * Generates a PDF contract from a Word template
 * 1. Fills the Word template with data using docxtemplater
 * 2. Extracts content and converts to HTML
 * 3. Generates PDF using expo-print
 * 4. Saves locally and offers share option
 */
export const generateContractFromFile = async (
  templateUri: string,
  data: ContractData,
  options?: { shareAfterSave?: boolean }
) => {
  try {
    // 1. Read template file as Base64
    const templateBase64 = await FileSystem.readAsStringAsync(templateUri, {
      encoding: 'base64',
    });

    // 2. Convert Base64 to Binary (PizZip needs binary string)
    const binaryStr = Buffer.from(templateBase64, 'base64').toString('binary');

    // 3. Load into PizZip
    const zip = new PizZip(binaryStr);

    // 4. Create Docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // 5. Render with data
    doc.render(data);

    // 6. Get the filled document.xml content
    const filledZip = doc.getZip();
    const documentXml = filledZip.file('word/document.xml');

    if (!documentXml) {
      throw new Error('No se pudo procesar el documento');
    }

    const xmlContent = documentXml.asText();

    // 7. Convert XML to HTML for PDF generation
    const htmlContent = convertWordXmlToHtml(xmlContent, data);

    // 8. Generate PDF using expo-print
    const { uri: pdfUri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // 9. Move PDF to documents directory with proper name
    const firstValue = Object.values(data)[0];
    const safeName = (typeof firstValue === 'string' ? firstValue : 'Documento')
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
    const filename = `Contrato_${safeName}_${Date.now()}.pdf`;
    const localPath = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.moveAsync({
      from: pdfUri,
      to: localPath,
    });

    console.log('PDF saved locally at:', localPath);

    // 10. Optionally share
    if (options?.shareAfterSave !== false) {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localPath, {
          mimeType: 'application/pdf',
          dialogTitle: 'Guardar o Compartir Contrato',
        });
      }
    }

    return {
      success: true,
      filepath: localPath,
      filename: filename,
    };

  } catch (error) {
    console.error('Generation Error:', error);
    throw error;
  }
};

/**
 * Converts Word XML content to HTML for PDF rendering
 */
function convertWordXmlToHtml(xmlContent: string, data: ContractData): string {
  // Extract text content from XML, preserving basic structure
  // Word XML uses <w:p> for paragraphs and <w:t> for text runs

  let html = '';

  // Extract paragraphs
  const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;

  let paragraphMatch;
  while ((paragraphMatch = paragraphRegex.exec(xmlContent)) !== null) {
    const paragraphContent = paragraphMatch[1];
    let paragraphText = '';

    // Check if it's bold
    const isBold = paragraphContent.includes('<w:b/>') || paragraphContent.includes('<w:b ');

    // Extract all text runs in this paragraph
    let textMatch;
    while ((textMatch = textRegex.exec(paragraphContent)) !== null) {
      paragraphText += textMatch[1];
    }

    if (paragraphText.trim()) {
      if (isBold) {
        html += `<p style="font-weight: bold;">${escapeHtml(paragraphText)}</p>\n`;
      } else {
        html += `<p>${escapeHtml(paragraphText)}</p>\n`;
      }
    } else {
      // Empty paragraph = line break
      html += '<br/>\n';
    }
  }

  // If no paragraphs found, fall back to simple text extraction
  if (!html.trim()) {
    const plainText = xmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    html = `<p>${escapeHtml(plainText)}</p>`;
  }

  // Wrap in full HTML document with styling
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          margin: 2cm;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
        }
        p {
          margin: 0.3em 0;
          text-align: justify;
        }
        br {
          display: block;
          margin: 0.5em 0;
          content: "";
        }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Extracts all {placeholder} variables from a Word template
 */
export const extractPlaceholdersFromTemplate = async (templateUri: string): Promise<string[]> => {
  try {
    // 1. Read template file as Base64
    const templateBase64 = await FileSystem.readAsStringAsync(templateUri, {
      encoding: 'base64',
    });

    // 2. Convert Base64 to Binary
    const binaryStr = Buffer.from(templateBase64, 'base64').toString('binary');

    // 3. Load into PizZip
    const zip = new PizZip(binaryStr);

    // 4. Get document.xml content (main document body)
    const documentXml = zip.file('word/document.xml');
    if (!documentXml) {
      throw new Error('No se encontró document.xml en el archivo');
    }

    const xmlContent = documentXml.asText();

    // 5. Find all {placeholder} patterns
    // Remove XML tags to get plain text, then find placeholders
    const plainText = xmlContent.replace(/<[^>]+>/g, '');

    // Match {variableName} patterns - alphanumeric and underscores
    const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const matches: string[] = [];
    let match;

    while ((match = regex.exec(plainText)) !== null) {
      const varName = match[1];
      // Avoid duplicates
      if (!matches.includes(varName)) {
        matches.push(varName);
      }
    }

    console.log('Found placeholders:', matches);
    return matches;

  } catch (error) {
    console.error('Error extracting placeholders:', error);
    throw error;
  }
};

/**
 * Lists all locally saved contracts
 */
export const listSavedContracts = async (): Promise<string[]> => {
  try {
    const documents = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory || '');
    return documents.filter(file => file.endsWith('.pdf') && file.startsWith('Contrato_'));
  } catch (error) {
    console.error('Error listing contracts:', error);
    return [];
  }
};
