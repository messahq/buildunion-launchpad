// PDF Generation utility for project summaries and invoices
// Using jspdf + html2canvas directly (html2pdf.js removed due to security vulnerability)
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
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    const imgWidth = options.pageFormat === 'letter' ? 215.9 : 210; // A4 width in mm
    const pageHeight = options.pageFormat === 'letter' ? 279.4 : 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const margin = options.margin || 10;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: options.pageFormat || 'a4'
    });

    let heightLeft = imgHeight;
    let position = margin;
    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Add first page
    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth - (margin * 2), imgHeight);
    heightLeft -= (pageHeight - margin * 2);

    // Add additional pages if content overflows
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth - (margin * 2), imgHeight);
      heightLeft -= (pageHeight - margin * 2);
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

// Build the professional HTML template for project summary/invoice
export const buildProjectSummaryHTML = (data: {
  quoteNumber: string;
  currentDate: string;
  clientInfo: { name: string; email: string; phone: string; address: string };
  photoData?: any;
  editedItems: Array<{
    name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total?: number;
    source: string;
  }>;
  materialTotal: number;
  taxBreakdown: Array<{ name: string; amount: number; rate: number }>;
  grandTotal: number;
  notes?: string;
  status?: string;
  createdAt?: string;
  regionShortName?: string;
  formatCurrency: (amount: number) => string;
  companyLogoUrl?: string | null;
  companyName?: string | null;
}): string => {
  const {
    quoteNumber,
    currentDate,
    clientInfo,
    photoData,
    editedItems,
    materialTotal,
    taxBreakdown,
    grandTotal,
    notes,
    status,
    createdAt,
    regionShortName,
    formatCurrency,
    companyLogoUrl,
    companyName
  } = data;

  // Build materials table rows with HTML escaping for user-controlled data
  const materialsRows = editedItems.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${escapeHtml(item.name)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${escapeHtml(item.quantity)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${escapeHtml(item.unit)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.unit_price)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${formatCurrency(item.quantity * item.unit_price)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase;
          ${item.source === 'photo' ? 'background: #dbeafe; color: #1e40af;' : ''}
          ${item.source === 'calculator' ? 'background: #dcfce7; color: #166534;' : ''}
          ${item.source === 'template' ? 'background: #f3e8ff; color: #7e22ce;' : ''}
          ${item.source === 'blueprint' ? 'background: #ffedd5; color: #c2410c;' : ''}
          ${item.source === 'manual' ? 'background: #f1f5f9; color: #475569;' : ''}
        ">${escapeHtml(item.source)}</span>
      </td>
    </tr>
  `).join('');

  // Build photo estimate section with HTML escaping
  const photoMaterialsSection = photoData?.materials?.length > 0 ? `
    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #93c5fd; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="font-size: 16px; font-weight: 600; color: #1e40af; margin: 0 0 16px 0;">📸 AI Photo Analysis - Detected Materials</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
        <div style="background: white; border-radius: 8px; padding: 12px 16px; text-align: center;">
          <span style="display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">Total Area</span>
          <span style="font-size: 18px; font-weight: 700; color: #1e40af;">${escapeHtml(photoData.area || 'N/A')} ${escapeHtml(photoData.areaUnit || 'sq ft')}</span>
        </div>
        <div style="background: white; border-radius: 8px; padding: 12px 16px; text-align: center;">
          <span style="display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">Confidence</span>
          <span style="font-size: 18px; font-weight: 700; ${photoData.areaConfidence === 'high' ? 'color: #16a34a;' : photoData.areaConfidence === 'medium' ? 'color: #ca8a04;' : 'color: #dc2626;'}">${escapeHtml((photoData.areaConfidence || 'Unknown').toUpperCase())}</span>
        </div>
        <div style="background: white; border-radius: 8px; padding: 12px 16px; text-align: center;">
          <span style="display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">Surface Type</span>
          <span style="font-size: 18px; font-weight: 700; color: #1e40af;">${escapeHtml(photoData.surfaceType || 'Unknown')}</span>
        </div>
      </div>
      ${photoData.summary ? `<div style="margin-top: 16px; padding: 12px; background: white; border-radius: 8px; font-size: 12px; color: #475569;"><strong>AI Summary:</strong> ${escapeHtml(photoData.summary)}</div>` : ''}
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Project Summary - ${escapeHtml(quoteNumber)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          color: #1a1a1a; 
          background: #fff;
          line-height: 1.5;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 16px;">
          ${companyLogoUrl ? `
            <img src="${escapeHtml(companyLogoUrl)}" alt="Company Logo" style="height: 48px; width: auto; max-width: 120px; object-fit: contain; background: white; padding: 4px; border-radius: 6px;" />
          ` : ''}
          <div>
            <h1 style="font-size: 24px; font-weight: 700; margin: 0;">${companyName ? escapeHtml(companyName) : '🏗️ BuildUnion'}</h1>
            <p style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Professional Construction Project Summary</p>
          </div>
        </div>
        <div style="text-align: right; background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 8px;">
          <div style="font-size: 16px; font-weight: 700; letter-spacing: 1px;">${escapeHtml(quoteNumber)}</div>
          <div style="font-size: 11px; opacity: 0.9; margin-top: 2px;">Generated: ${escapeHtml(currentDate)}</div>
        </div>
      </div>

      <div style="padding: 24px 32px;">
        <!-- Client Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
            <h4 style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 10px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">👤 Client Information</h4>
            <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${escapeHtml(clientInfo.name || 'Client Name')}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${escapeHtml(clientInfo.address || 'Address not specified')}</div>
            <div style="font-size: 12px; color: #64748b;">${escapeHtml(clientInfo.phone || '')} ${clientInfo.email ? '• ' + escapeHtml(clientInfo.email) : ''}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
            <h4 style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 10px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">📍 Project Details</h4>
            <div style="font-size: 14px; font-weight: 600; color: #1e293b;">Project Summary</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Created: ${escapeHtml(createdAt || currentDate)}</div>
            <div style="font-size: 12px; color: #64748b;">Status: ${escapeHtml((status || 'DRAFT').toUpperCase())}</div>
          </div>
        </div>

        <!-- Photo Estimate Section -->
        ${photoMaterialsSection}

        <!-- Line Items -->
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 3px solid #f59e0b;">📋 Project Line Items (${editedItems.length} items)</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #1e293b; color: white;">
                <th style="padding: 12px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Description</th>
                <th style="padding: 12px; text-align: center; font-weight: 600; font-size: 10px; text-transform: uppercase;">Qty</th>
                <th style="padding: 12px; text-align: center; font-weight: 600; font-size: 10px; text-transform: uppercase;">Unit</th>
                <th style="padding: 12px; text-align: right; font-weight: 600; font-size: 10px; text-transform: uppercase;">Unit Price</th>
                <th style="padding: 12px; text-align: right; font-weight: 600; font-size: 10px; text-transform: uppercase;">Total</th>
                <th style="padding: 12px; text-align: center; font-weight: 600; font-size: 10px; text-transform: uppercase;">Source</th>
              </tr>
            </thead>
            <tbody>
              ${materialsRows || '<tr><td colspan="6" style="text-align:center;padding:24px;color:#64748b;">No items added yet</td></tr>'}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
            <div style="width: 300px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 8px; padding: 16px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid rgba(0,0,0,0.1);">
                <span style="color: #78350f;">Subtotal</span>
                <span style="font-weight: 600; color: #92400e;">${formatCurrency(materialTotal)}</span>
              </div>
              ${taxBreakdown.map(tax => `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid rgba(0,0,0,0.1);">
                  <span style="color: #78350f;">${escapeHtml(tax.name)} (${(tax.rate * 100).toFixed(tax.name === 'QST' ? 3 : 0)}%) <span style="background: #fef3c7; color: #92400e; font-size: 9px; font-weight: 600; padding: 1px 4px; border-radius: 3px;">${escapeHtml(regionShortName || 'ON')}</span></span>
                  <span style="font-weight: 600; color: #92400e;">${formatCurrency(tax.amount)}</span>
                </div>
              `).join('')}
              <div style="display: flex; justify-content: space-between; padding-top: 12px; margin-top: 8px; font-size: 18px; font-weight: 700; color: #92400e;">
                <span>GRAND TOTAL</span>
                <span>${formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Notes -->
        ${notes ? `
          <div style="margin-top: 24px; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <h3 style="font-size: 13px; font-weight: 600; color: #1e293b; margin: 0 0 8px 0;">📝 Notes & Terms</h3>
            <p style="font-size: 12px; color: #64748b; white-space: pre-wrap; margin: 0;">${escapeHtml(notes)}</p>
          </div>
        ` : ''}

        <!-- Signatures -->
        <div style="margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
          <div style="padding-top: 12px; border-top: 2px solid #1e293b;">
            <p style="font-size: 12px; color: #64748b; margin: 0;"><strong>Client Signature</strong></p>
            <p style="font-size: 11px; color: #94a3b8; margin-top: 32px;">Date: _______________</p>
          </div>
          <div style="padding-top: 12px; border-top: 2px solid #1e293b;">
            <p style="font-size: 12px; color: #64748b; margin: 0;"><strong>Contractor Signature</strong></p>
            <p style="font-size: 11px; color: #94a3b8; margin-top: 32px;">Date: _______________</p>
          </div>
        </div>
      </div>

      <div style="margin-top: 32px; padding: 20px; background: #1e293b; color: white;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 8px;">
          ${companyLogoUrl ? `
            <img src="${escapeHtml(companyLogoUrl)}" alt="Company Logo" style="height: 32px; width: auto; max-width: 80px; object-fit: contain; background: white; padding: 3px; border-radius: 4px;" />
          ` : ''}
          <p style="font-size: 14px; font-weight: 600; margin: 0;">${companyName ? escapeHtml(companyName) : 'BuildUnion'}</p>
        </div>
        <p style="font-size: 10px; opacity: 0.8; margin: 0;">Licensed & Insured • WSIB Covered • Professional Construction Management</p>
        <p style="font-size: 9px; opacity: 0.6; margin-top: 6px;">Generated with BuildUnion • Greater Toronto Area</p>
      </div>
    </body>
    </html>
  `;
};
