// PDF Generation utility for project summaries, invoices, and reports
// Using jspdf + html2canvas directly
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface PDFOptions {
  filename: string;
  margin?: number;
  pageFormat?: 'a4' | 'letter';
}

// HTML escape function to prevent XSS attacks
const escapeHtml = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return '';
  const str = String(text);
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
};

export const generatePDFBlob = async (
  htmlContent: string,
  options: PDFOptions
): Promise<Blob> => {
  // Create a temporary container
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  document.body.appendChild(container);

  try {
    const imgWidth = options.pageFormat === 'letter' ? 215.9 : 210;
    const pageHeight = options.pageFormat === 'letter' ? 279.4 : 297;
    const margin = options.margin || 10;
    const usablePageHeight = pageHeight - (margin * 2);
    const usableWidth = imgWidth - (margin * 2);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: options.pageFormat || 'a4'
    });

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    const imgHeight = (canvas.height * usableWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    
    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'JPEG', margin, position, usableWidth, imgHeight);
    heightLeft -= usablePageHeight;

    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imgHeight - heightLeft);
      pdf.addImage(imgData, 'JPEG', margin, position, usableWidth, imgHeight);
      heightLeft -= usablePageHeight;
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
};

export const downloadPDF = async (
  htmlContent: string,
  options: PDFOptions
): Promise<void> => {
  const blob = await generatePDFBlob(htmlContent, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Simple project summary HTML builder
export const buildProjectSummaryHTML = (data: {
  quoteNumber: string;
  currentDate: string;
  clientInfo: { name: string; email: string; phone: string; address: string };
  editedItems: Array<{
    name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total?: number;
  }>;
  materialTotal: number;
  grandTotal: number;
  notes?: string;
  formatCurrency: (amount: number) => string;
  companyName?: string | null;
}): string => {
  const {
    quoteNumber,
    currentDate,
    clientInfo,
    editedItems,
    materialTotal,
    grandTotal,
    notes,
    formatCurrency,
    companyName,
  } = data;

  const materialsRows = editedItems.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.name)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${escapeHtml(item.quantity)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${escapeHtml(item.unit)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.unit_price)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.quantity * item.unit_price)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.5; }
        .header { text-align: center; margin-bottom: 24px; }
        .section { margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; padding: 12px; text-align: left; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0; font-size: 24px;">${escapeHtml(companyName || 'BuildUnion')}</h1>
        <p style="color: #64748b; margin: 8px 0;">Quote #${escapeHtml(quoteNumber)} • ${escapeHtml(currentDate)}</p>
      </div>
      
      <div class="section">
        <h3 style="margin: 0 0 12px 0;">Client Information</h3>
        <p style="margin: 4px 0;"><strong>Name:</strong> ${escapeHtml(clientInfo.name)}</p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${escapeHtml(clientInfo.email)}</p>
        <p style="margin: 4px 0;"><strong>Phone:</strong> ${escapeHtml(clientInfo.phone)}</p>
        <p style="margin: 4px 0;"><strong>Address:</strong> ${escapeHtml(clientInfo.address)}</p>
      </div>
      
      <div class="section">
        <h3 style="margin: 0 0 12px 0;">Materials & Services</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: center;">Unit</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${materialsRows}
          </tbody>
        </table>
      </div>
      
      <div style="text-align: right; margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px;">
        <p style="margin: 4px 0;"><strong>Subtotal:</strong> ${formatCurrency(materialTotal)}</p>
        <p style="margin: 8px 0; font-size: 20px;"><strong>Total:</strong> ${formatCurrency(grandTotal)}</p>
      </div>
      
      ${notes ? `
        <div class="section" style="margin-top: 24px;">
          <h3 style="margin: 0 0 12px 0;">Notes</h3>
          <p style="color: #64748b;">${escapeHtml(notes)}</p>
        </div>
      ` : ''}
    </body>
    </html>
  `;
};
