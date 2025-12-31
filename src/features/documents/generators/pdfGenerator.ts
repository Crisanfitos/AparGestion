/**
 * PDF Generator for Invoices
 * Uses expo-print for HTML to PDF conversion
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export interface InvoiceData {
    invoiceNumber: string;
    date: string;
    clientName: string;
    clientId: string;
    clientAddress: string;
    propertyName: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    pricePerNight: number;
    totalPrice: number;
    ownerName: string;
    ownerNif: string;
}

/**
 * Generate invoice PDF and return file URI
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<string> {
    const html = generateInvoiceHTML(data);

    const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
    });

    // Move to documents directory with proper name
    const newUri = `${FileSystem.documentDirectory}Factura_${data.invoiceNumber}.pdf`;
    await FileSystem.moveAsync({
        from: uri,
        to: newUri,
    });

    return newUri;
}

/**
 * Generate and share invoice
 */
export async function generateAndShareInvoice(data: InvoiceData): Promise<void> {
    const uri = await generateInvoicePDF(data);

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Factura ${data.invoiceNumber}`,
        });
    }
}

function generateInvoiceHTML(data: InvoiceData): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 14px;
          color: #000;
          padding: 40px;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        .header h1 {
          font-size: 24px;
          margin: 0;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .info-box {
          width: 45%;
        }
        .info-box h3 {
          font-size: 16px;
          margin-bottom: 10px;
          border-bottom: 1px solid #000;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #000;
          padding: 12px;
          text-align: left;
          page-break-inside: avoid;
        }
        th {
          background-color: #f0f0f0;
        }
        .total-row {
          font-weight: bold;
          font-size: 16px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>FACTURA</h1>
        <p>Nº ${data.invoiceNumber} | Fecha: ${data.date}</p>
      </div>
      
      <div class="info-row">
        <div class="info-box">
          <h3>Emisor</h3>
          <p><strong>${data.ownerName}</strong></p>
          <p>NIF: ${data.ownerNif}</p>
        </div>
        <div class="info-box">
          <h3>Cliente</h3>
          <p><strong>${data.clientName}</strong></p>
          <p>DNI/Pasaporte: ${data.clientId}</p>
          <p>${data.clientAddress}</p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Cantidad</th>
            <th>Precio/Ud</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Alojamiento en ${data.propertyName}<br>
              <small>Entrada: ${data.checkIn} | Salida: ${data.checkOut}</small>
            </td>
            <td>${data.nights} noches</td>
            <td>${data.pricePerNight.toFixed(2)} €</td>
            <td>${data.totalPrice.toFixed(2)} €</td>
          </tr>
          <tr class="total-row">
            <td colspan="3" style="text-align: right;">TOTAL</td>
            <td>${data.totalPrice.toFixed(2)} €</td>
          </tr>
        </tbody>
      </table>
      
      <div class="footer">
        <p>Documento generado por AparGestión</p>
      </div>
    </body>
    </html>
  `;
}
