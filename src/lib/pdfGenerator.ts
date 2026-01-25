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
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  clientSignature?: { type: 'drawn' | 'typed'; data: string; name: string; signedAt?: string } | null;
  contractorSignature?: { type: 'drawn' | 'typed'; data: string; name: string; signedAt?: string } | null;
  // Extended data for detailed summary
  calculatorResults?: Array<{ calculator: string; area: number; material: string; totalCost: number }>;
  templateItems?: Array<{ name: string; quantity: number; unit: string; unit_price: number }>;
  dualEngineAnalysis?: {
    geminiSummary?: string;
    openaiSummary?: string;
    verificationStatus?: string;
  };
  projectDocuments?: Array<{ name: string; type: string }>;
  contracts?: Array<{ number: string; status: string; total: number }>;
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
    companyName,
    companyPhone,
    companyEmail,
    companyWebsite,
    clientSignature,
    contractorSignature,
    calculatorResults = [],
    templateItems = [],
    dualEngineAnalysis,
    projectDocuments = [],
    contracts = []
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
  const photoMaterialsSection = photoData?.materials?.length > 0 || photoData?.area ? `
    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #93c5fd; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="font-size: 16px; font-weight: 600; color: #1e40af; margin: 0 0 16px 0;">📸 AI Photo Analysis - Detected Materials</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
        <div style="background: white; border-radius: 8px; padding: 12px 16px; text-align: center;">
          <span style="display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">Total Area</span>
          <span style="font-size: 18px; font-weight: 700; color: #1e40af;">${escapeHtml(photoData?.area || 'N/A')} ${escapeHtml(photoData?.areaUnit || 'sq ft')}</span>
        </div>
        <div style="background: white; border-radius: 8px; padding: 12px 16px; text-align: center;">
          <span style="display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">Confidence</span>
          <span style="font-size: 18px; font-weight: 700; ${photoData?.areaConfidence === 'high' ? 'color: #16a34a;' : photoData?.areaConfidence === 'medium' ? 'color: #ca8a04;' : 'color: #dc2626;'}">${escapeHtml((photoData?.areaConfidence || 'Unknown').toUpperCase())}</span>
        </div>
        <div style="background: white; border-radius: 8px; padding: 12px 16px; text-align: center;">
          <span style="display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">Surface Type</span>
          <span style="font-size: 18px; font-weight: 700; color: #1e40af;">${escapeHtml(photoData?.surfaceType || 'Unknown')}</span>
        </div>
      </div>
      ${photoData?.summary ? `<div style="margin-top: 16px; padding: 12px; background: white; border-radius: 8px; font-size: 12px; color: #475569;"><strong>AI Summary:</strong> ${escapeHtml(photoData.summary)}</div>` : ''}
      ${photoData?.materials?.length > 0 ? `
        <div style="margin-top: 16px;">
          <h4 style="font-size: 12px; font-weight: 600; color: #1e40af; margin: 0 0 8px 0;">Detected Materials:</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${photoData.materials.map((m: any) => `
              <span style="background: white; padding: 6px 12px; border-radius: 6px; font-size: 11px; border: 1px solid #93c5fd;">
                ${escapeHtml(m.name || m)} ${m.quantity ? `(${m.quantity} ${m.unit || 'units'})` : ''}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  ` : '';

  // Calculator results section
  const calculatorSection = calculatorResults.length > 0 ? `
    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #86efac; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="font-size: 16px; font-weight: 600; color: #166534; margin: 0 0 16px 0;">🧮 Calculator Results</h3>
      <div style="display: grid; gap: 12px;">
        ${calculatorResults.map(calc => `
          <div style="background: white; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-weight: 600; color: #1e293b;">${escapeHtml(calc.calculator || 'Calculator')}</span>
              <span style="display: block; font-size: 11px; color: #64748b; margin-top: 2px;">${escapeHtml(calc.material || '')} • ${calc.area || 0} sq ft</span>
            </div>
            <span style="font-size: 16px; font-weight: 700; color: #166534;">${formatCurrency(calc.totalCost || 0)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  // Template items section
  const templateSection = templateItems.length > 0 ? `
    <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border: 1px solid #d8b4fe; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="font-size: 16px; font-weight: 600; color: #7e22ce; margin: 0 0 16px 0;">📋 Template Items Applied</h3>
      <div style="display: grid; gap: 8px;">
        ${templateItems.slice(0, 5).map(item => `
          <div style="background: white; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 500; color: #1e293b;">${escapeHtml(item.name)}</span>
            <span style="font-size: 12px; color: #7e22ce;">${item.quantity} ${escapeHtml(item.unit)} @ ${formatCurrency(item.unit_price)}</span>
          </div>
        `).join('')}
        ${templateItems.length > 5 ? `<p style="font-size: 11px; color: #7e22ce; text-align: center; margin-top: 8px;">+ ${templateItems.length - 5} more items</p>` : ''}
      </div>
    </div>
  ` : '';

  // Dual Engine Analysis section
  const dualEngineSection = dualEngineAnalysis ? `
    <div style="background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%); border: 1px solid #fde047; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="font-size: 16px; font-weight: 600; color: #854d0e; margin: 0 0 16px 0;">🔬 Dual Engine AI Verification</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div style="background: white; border-radius: 8px; padding: 16px; border-left: 4px solid #3b82f6;">
          <h4 style="font-size: 12px; font-weight: 600; color: #3b82f6; margin: 0 0 8px 0;">🔵 Gemini (Visual Specialist)</h4>
          <p style="font-size: 11px; color: #475569; margin: 0;">${escapeHtml(dualEngineAnalysis.geminiSummary || 'Area estimation, spatial measurements, text extraction from blueprints/PDFs')}</p>
        </div>
        <div style="background: white; border-radius: 8px; padding: 16px; border-left: 4px solid #22c55e;">
          <h4 style="font-size: 12px; font-weight: 600; color: #22c55e; margin: 0 0 8px 0;">🟢 OpenAI (Material Calculator)</h4>
          <p style="font-size: 11px; color: #475569; margin: 0;">${escapeHtml(dualEngineAnalysis.openaiSummary || 'Material quantity verification, coverage rates, waste factor calculations')}</p>
        </div>
      </div>
      ${dualEngineAnalysis.verificationStatus ? `
        <div style="margin-top: 16px; padding: 12px; background: white; border-radius: 8px; text-align: center;">
          <span style="font-size: 12px; font-weight: 600; ${dualEngineAnalysis.verificationStatus === 'verified' ? 'color: #16a34a;' : 'color: #dc2626;'}">
            ${dualEngineAnalysis.verificationStatus === 'verified' ? '✅ Cross-Verified' : '⚠️ Discrepancy Detected'}
          </span>
        </div>
      ` : ''}
    </div>
  ` : '';

  // Documents section
  const documentsSection = projectDocuments.length > 0 ? `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 16px 0;">📁 Project Documents (${projectDocuments.length})</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 12px;">
        ${projectDocuments.map(doc => `
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">${doc.type?.includes('image') ? '🖼️' : doc.type?.includes('pdf') ? '📄' : '📎'}</span>
            <span style="font-size: 12px; color: #1e293b;">${escapeHtml(doc.name)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  // Contracts section
  const contractsSection = contracts.length > 0 ? `
    <div style="background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); border: 1px solid #fca5a5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="font-size: 16px; font-weight: 600; color: #991b1b; margin: 0 0 16px 0;">📝 Associated Contracts (${contracts.length})</h3>
      <div style="display: grid; gap: 12px;">
        ${contracts.map(contract => `
          <div style="background: white; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-weight: 600; color: #1e293b;">${escapeHtml(contract.number)}</span>
              <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase;
                ${contract.status === 'complete' ? 'background: #dcfce7; color: #166534;' : ''}
                ${contract.status === 'sent' ? 'background: #dbeafe; color: #1e40af;' : ''}
                ${contract.status === 'draft' ? 'background: #f1f5f9; color: #475569;' : ''}
              ">${escapeHtml(contract.status)}</span>
            </div>
            <span style="font-size: 16px; font-weight: 700; color: #991b1b;">${formatCurrency(contract.total)}</span>
          </div>
        `).join('')}
      </div>
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
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 24px 32px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="display: flex; align-items: center; gap: 16px;">
            ${companyLogoUrl ? `
              <img src="${escapeHtml(companyLogoUrl)}" alt="Company Logo" style="height: 56px; width: auto; max-width: 140px; object-fit: contain; background: white; padding: 6px; border-radius: 8px;" />
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
        ${(companyPhone || companyEmail || companyWebsite) ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.3); display: flex; gap: 24px; flex-wrap: wrap; font-size: 11px;">
            ${companyPhone ? `<span style="display: flex; align-items: center; gap: 6px;">📞 ${escapeHtml(companyPhone)}</span>` : ''}
            ${companyEmail ? `<span style="display: flex; align-items: center; gap: 6px;">✉️ ${escapeHtml(companyEmail)}</span>` : ''}
            ${companyWebsite ? `<span style="display: flex; align-items: center; gap: 6px;">🌐 ${escapeHtml(companyWebsite)}</span>` : ''}
          </div>
        ` : ''}
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

        <!-- Dual Engine Analysis -->
        ${dualEngineSection}

        <!-- Calculator Results -->
        ${calculatorSection}

        <!-- Template Items -->
        ${templateSection}

        <!-- Project Documents -->
        ${documentsSection}

        <!-- Contracts -->
        ${contractsSection}

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
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
        <div style="margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
          <div style="padding-top: 12px; border-top: 2px solid #1e293b;">
            <p style="font-size: 12px; color: #64748b; margin: 0;"><strong>Client Signature</strong></p>
            ${clientSignature 
              ? clientSignature.type === 'drawn'
                ? '<img src="' + clientSignature.data + '" alt="Client Signature" style="max-height: 60px; margin: 8px 0; display: block;" />'
                : '<p style="font-family: \'Dancing Script\', cursive; font-size: 28px; margin: 8px 0; color: #1e293b;">' + escapeHtml(clientSignature.data) + '</p>'
              : '<div style="height: 40px; margin: 8px 0;"></div>'}
            <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">Date: ${clientSignature?.signedAt ? new Date(clientSignature.signedAt).toLocaleDateString('en-CA') : '_______________'}</p>
          </div>
          <div style="padding-top: 12px; border-top: 2px solid #1e293b;">
            <p style="font-size: 12px; color: #64748b; margin: 0;"><strong>Contractor Signature</strong></p>
            ${contractorSignature 
              ? contractorSignature.type === 'drawn'
                ? '<img src="' + contractorSignature.data + '" alt="Contractor Signature" style="max-height: 60px; margin: 8px 0; display: block;" />'
                : '<p style="font-family: \'Dancing Script\', cursive; font-size: 28px; margin: 8px 0; color: #1e293b;">' + escapeHtml(contractorSignature.data) + '</p>'
              : '<div style="height: 40px; margin: 8px 0;"></div>'}
            <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">Date: ${contractorSignature?.signedAt ? new Date(contractorSignature.signedAt).toLocaleDateString('en-CA') : '_______________'}</p>
          </div>
        </div>
      </div>

      <div style="margin-top: 32px; padding: 24px 32px; background: #1e293b; color: white;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${companyLogoUrl ? `
              <img src="${escapeHtml(companyLogoUrl)}" alt="Company Logo" style="height: 40px; width: auto; max-width: 100px; object-fit: contain; background: white; padding: 4px; border-radius: 6px;" />
            ` : ''}
            <div>
              <p style="font-size: 16px; font-weight: 700; margin: 0;">${companyName ? escapeHtml(companyName) : 'BuildUnion'}</p>
              <p style="font-size: 10px; opacity: 0.7; margin-top: 2px;">Licensed & Insured • WSIB Covered</p>
            </div>
          </div>
          <div style="text-align: right; font-size: 11px;">
            ${companyPhone ? `<p style="margin: 0 0 4px 0; opacity: 0.9;">📞 ${escapeHtml(companyPhone)}</p>` : ''}
            ${companyEmail ? `<p style="margin: 0 0 4px 0; opacity: 0.9;">✉️ ${escapeHtml(companyEmail)}</p>` : ''}
            ${companyWebsite ? `<p style="margin: 0; opacity: 0.9;">🌐 ${escapeHtml(companyWebsite)}</p>` : ''}
          </div>
        </div>
        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center;">
          <p style="font-size: 9px; opacity: 0.6; margin: 0;">Generated with BuildUnion • Professional Construction Management</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Build the professional HTML template for contracts
export const buildContractHTML = (data: {
  contractNumber: string;
  contractDate: string;
  templateType: string;
  contractorInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    license?: string;
  };
  clientInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  projectInfo: {
    name: string;
    address: string;
    description?: string;
  };
  financialTerms: {
    totalAmount: number;
    depositPercentage: number;
    depositAmount: number;
    paymentSchedule: string;
  };
  timeline: {
    startDate: string;
    estimatedEndDate: string;
    workingDays: string;
  };
  terms: {
    scopeOfWork: string;
    warrantyPeriod: string;
    materialsIncluded: boolean;
    changeOrderPolicy: string;
    cancellationPolicy: string;
    disputeResolution: string;
    additionalTerms?: string;
    hasLiabilityInsurance: boolean;
    hasWSIB: boolean;
  };
  signatures: {
    client?: { type: 'drawn' | 'typed'; data: string; name: string; signedAt?: string } | null;
    contractor?: { type: 'drawn' | 'typed'; data: string; name: string; signedAt?: string } | null;
  };
  branding: {
    companyLogoUrl?: string | null;
    companyName?: string | null;
    companyPhone?: string | null;
    companyEmail?: string | null;
    companyWebsite?: string | null;
  };
  formatCurrency: (amount: number) => string;
  regionName?: string;
}): string => {
  const {
    contractNumber,
    contractDate,
    templateType,
    contractorInfo,
    clientInfo,
    projectInfo,
    financialTerms,
    timeline,
    terms,
    signatures,
    branding,
    formatCurrency,
    regionName
  } = data;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '_______________';
    return new Date(dateStr).toLocaleDateString('en-CA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const templateLabels: Record<string, string> = {
    custom: 'Custom Contract',
    residential: 'Residential Construction',
    commercial: 'Commercial Construction',
    renovation: 'Renovation Project'
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Construction Contract - ${escapeHtml(contractNumber)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          color: #1e293b; 
          background: #fff;
          line-height: 1.6;
          font-size: 12px;
        }
        .header { 
          background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); 
          color: white; 
          padding: 24px 40px; 
        }
        .header-content { display: flex; justify-content: space-between; align-items: flex-start; }
        .brand { display: flex; align-items: center; gap: 16px; }
        .brand-logo { height: 56px; width: auto; max-width: 140px; object-fit: contain; background: white; padding: 6px; border-radius: 8px; }
        .brand-title { font-size: 22px; font-weight: 700; }
        .brand-subtitle { font-size: 11px; opacity: 0.9; margin-top: 4px; }
        .contract-badge { text-align: right; background: rgba(255,255,255,0.15); padding: 12px 20px; border-radius: 8px; }
        .contract-number { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }
        .contract-date { font-size: 11px; opacity: 0.9; margin-top: 2px; }
        .contact-bar { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.3); display: flex; gap: 24px; font-size: 11px; flex-wrap: wrap; }
        .content { padding: 24px 40px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 14px; font-weight: 700; color: #0e7490; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #0891b2; text-transform: uppercase; letter-spacing: 0.5px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .party-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
        .party-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 8px; }
        .party-name { font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 6px; }
        .party-detail { font-size: 11px; color: #64748b; margin-bottom: 2px; }
        .highlight-box { background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%); border: 1px solid #22d3ee; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
        .terms-list { margin-left: 20px; color: #475569; }
        .terms-list li { margin-bottom: 10px; }
        .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
        .sig-box { padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .sig-line { margin-top: 12px; padding-top: 8px; border-top: 1px dashed #94a3b8; }
        .footer { margin-top: 40px; padding: 24px 40px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; }
        .footer-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .footer-brand { display: flex; align-items: center; gap: 12px; }
        .footer-logo { height: 40px; width: auto; border-radius: 6px; background: white; padding: 4px; }
        .footer-legal { margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center; font-size: 9px; opacity: 0.6; }
      </style>
    </head>
    <body>
      <!-- Header with Branding -->
      <div class="header">
        <div class="header-content">
          <div class="brand">
            ${branding.companyLogoUrl ? `<img src="${escapeHtml(branding.companyLogoUrl)}" alt="Company Logo" class="brand-logo" />` : ''}
            <div>
              <div class="brand-title">${branding.companyName ? escapeHtml(branding.companyName) : '🏗️ BuildUnion'}</div>
              <div class="brand-subtitle">${escapeHtml(templateLabels[templateType] || 'Construction Contract')}</div>
            </div>
          </div>
          <div class="contract-badge">
            <div class="contract-number">${escapeHtml(contractNumber)}</div>
            <div class="contract-date">Date: ${formatDate(contractDate)}</div>
          </div>
        </div>
        ${(branding.companyPhone || branding.companyEmail || branding.companyWebsite) ? `
          <div class="contact-bar">
            ${branding.companyPhone ? `<span>📞 ${escapeHtml(branding.companyPhone)}</span>` : ''}
            ${branding.companyEmail ? `<span>✉️ ${escapeHtml(branding.companyEmail)}</span>` : ''}
            ${branding.companyWebsite ? `<span>🌐 ${escapeHtml(branding.companyWebsite)}</span>` : ''}
          </div>
        ` : ''}
      </div>

      <div class="content">
        <!-- Parties -->
        <div class="section">
          <div class="section-title">👥 Parties to This Agreement</div>
          <div class="grid-2">
            <div class="party-box">
              <div class="party-label">🔨 Contractor</div>
              <div class="party-name">${escapeHtml(contractorInfo.name) || '_______________'}</div>
              <div class="party-detail">${escapeHtml(contractorInfo.address) || 'Address: _______________'}</div>
              <div class="party-detail">📞 ${escapeHtml(contractorInfo.phone) || '_______________'}</div>
              <div class="party-detail">✉️ ${escapeHtml(contractorInfo.email) || '_______________'}</div>
              ${contractorInfo.license ? `<div class="party-detail">License #: ${escapeHtml(contractorInfo.license)}</div>` : ''}
            </div>
            <div class="party-box">
              <div class="party-label">👤 Client</div>
              <div class="party-name">${escapeHtml(clientInfo.name) || '_______________'}</div>
              <div class="party-detail">${escapeHtml(clientInfo.address) || 'Address: _______________'}</div>
              <div class="party-detail">📞 ${escapeHtml(clientInfo.phone) || '_______________'}</div>
              <div class="party-detail">✉️ ${escapeHtml(clientInfo.email) || '_______________'}</div>
            </div>
          </div>
        </div>

        <!-- Project Details -->
        <div class="section">
          <div class="section-title">📍 Project Details</div>
          <p><strong>Project Name:</strong> ${escapeHtml(projectInfo.name) || '_______________'}</p>
          <p><strong>Location:</strong> ${escapeHtml(projectInfo.address) || '_______________'}</p>
          ${projectInfo.description ? `<p style="margin-top: 8px;"><strong>Description:</strong> ${escapeHtml(projectInfo.description)}</p>` : ''}
        </div>

        <!-- Scope of Work -->
        ${terms.scopeOfWork ? `
        <div class="section">
          <div class="section-title">📋 Scope of Work</div>
          <p style="white-space: pre-line;">${escapeHtml(terms.scopeOfWork)}</p>
        </div>
        ` : ''}

        <!-- Financial Terms -->
        <div class="section">
          <div class="section-title">💰 Financial Terms</div>
          <div class="highlight-box">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Total Contract Amount:</span>
              <strong style="font-size: 18px; color: #0e7490;">${formatCurrency(financialTerms.totalAmount)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Deposit Required (${financialTerms.depositPercentage}%):</span>
              <strong>${formatCurrency(financialTerms.depositAmount)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Balance Due Upon Completion:</span>
              <strong>${formatCurrency(financialTerms.totalAmount - financialTerms.depositAmount)}</strong>
            </div>
          </div>
          <p><strong>Payment Schedule:</strong> ${escapeHtml(financialTerms.paymentSchedule)}</p>
        </div>

        <!-- Timeline -->
        <div class="section">
          <div class="section-title">📅 Project Timeline</div>
          <div class="grid-2">
            <p><strong>Start Date:</strong> ${formatDate(timeline.startDate)}</p>
            <p><strong>Estimated Completion:</strong> ${formatDate(timeline.estimatedEndDate)}</p>
          </div>
          <p style="margin-top: 8px;"><strong>Working Hours:</strong> ${escapeHtml(timeline.workingDays)}</p>
        </div>

        <!-- Terms & Conditions -->
        <div class="section">
          <div class="section-title">📜 Terms & Conditions</div>
          <ol class="terms-list">
            <li><strong>Warranty:</strong> The Contractor warrants all workmanship for a period of ${escapeHtml(terms.warrantyPeriod)} from the date of completion.</li>
            <li><strong>Materials:</strong> ${terms.materialsIncluded ? 'All materials are included in the contract price unless otherwise specified.' : 'Materials are NOT included and will be billed separately.'}</li>
            <li><strong>Change Orders:</strong> ${escapeHtml(terms.changeOrderPolicy)}</li>
            <li><strong>Cancellation:</strong> ${escapeHtml(terms.cancellationPolicy)}</li>
            <li><strong>Dispute Resolution:</strong> ${escapeHtml(terms.disputeResolution)}</li>
            ${terms.hasLiabilityInsurance ? '<li><strong>Insurance:</strong> Contractor maintains comprehensive general liability insurance.</li>' : ''}
            ${terms.hasWSIB ? '<li><strong>WSIB:</strong> Contractor maintains valid WSIB coverage for all workers.</li>' : ''}
          </ol>
        </div>

        ${terms.additionalTerms ? `
        <div class="section">
          <div class="section-title">📋 Additional Terms</div>
          <p style="white-space: pre-line;">${escapeHtml(terms.additionalTerms)}</p>
        </div>
        ` : ''}

        <!-- Signatures -->
        <div class="signature-section">
          <div class="sig-box">
            <p style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">👤 Client Acceptance</p>
            <p style="font-size: 10px; color: #64748b; margin-bottom: 12px;">By signing below, the Client agrees to all terms and conditions.</p>
            ${signatures.client 
              ? signatures.client.type === 'drawn'
                ? `<img src="${signatures.client.data}" alt="Client Signature" style="max-height: 60px; margin: 8px 0; display: block;" />`
                : `<p style="font-family: 'Dancing Script', cursive; font-size: 28px; margin: 8px 0; color: #1e293b;">${escapeHtml(signatures.client.data)}</p>`
              : '<div style="height: 50px; border-bottom: 2px solid #1e293b; margin: 8px 0;"></div>'}
            <div class="sig-line">
              <p style="font-size: 11px; color: #64748b;">
                <strong>Print Name:</strong> ${escapeHtml(clientInfo.name) || '_______________'}<br/>
                <strong>Date:</strong> ${signatures.client?.signedAt ? new Date(signatures.client.signedAt).toLocaleDateString('en-CA') : '_______________'}
              </p>
            </div>
          </div>
          <div class="sig-box">
            <p style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">🔨 Contractor Authorization</p>
            <p style="font-size: 10px; color: #64748b; margin-bottom: 12px;">By signing below, the Contractor agrees to perform all work as specified.</p>
            ${signatures.contractor 
              ? signatures.contractor.type === 'drawn'
                ? `<img src="${signatures.contractor.data}" alt="Contractor Signature" style="max-height: 60px; margin: 8px 0; display: block;" />`
                : `<p style="font-family: 'Dancing Script', cursive; font-size: 28px; margin: 8px 0; color: #1e293b;">${escapeHtml(signatures.contractor.data)}</p>`
              : '<div style="height: 50px; border-bottom: 2px solid #1e293b; margin: 8px 0;"></div>'}
            <div class="sig-line">
              <p style="font-size: 11px; color: #64748b;">
                <strong>Print Name:</strong> ${escapeHtml(contractorInfo.name) || '_______________'}<br/>
                <strong>Date:</strong> ${signatures.contractor?.signedAt ? new Date(signatures.contractor.signedAt).toLocaleDateString('en-CA') : '_______________'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-content">
          <div class="footer-brand">
            ${branding.companyLogoUrl ? `<img src="${escapeHtml(branding.companyLogoUrl)}" alt="Logo" class="footer-logo" />` : ''}
            <div>
              <p style="font-weight: 600; font-size: 14px; margin: 0;">${branding.companyName ? escapeHtml(branding.companyName) : 'BuildUnion'}</p>
              <p style="font-size: 10px; opacity: 0.8; margin: 0;">Licensed & Insured • WSIB Covered</p>
            </div>
          </div>
          <div style="text-align: right; font-size: 11px;">
            ${branding.companyPhone ? `<p style="margin: 0 0 4px 0; opacity: 0.9;">📞 ${escapeHtml(branding.companyPhone)}</p>` : ''}
            ${branding.companyEmail ? `<p style="margin: 0 0 4px 0; opacity: 0.9;">✉️ ${escapeHtml(branding.companyEmail)}</p>` : ''}
            ${branding.companyWebsite ? `<p style="margin: 0; opacity: 0.9;">🌐 ${escapeHtml(branding.companyWebsite)}</p>` : ''}
          </div>
        </div>
        <div class="footer-legal">
          ${regionName ? `Governed by the laws of ${escapeHtml(regionName)}, Canada • ` : ''}Generated with BuildUnion • Professional Construction Management
        </div>
      </div>
    </body>
    </html>
  `;
};
