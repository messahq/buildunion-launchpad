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

// Helper: adjust sections so none are split across page boundaries
const adjustForPageBreaks = (container: HTMLElement, usableWidthPx: number, usablePageHeightPx: number) => {
  const sections = container.querySelectorAll('.pdf-section, .section, .header, .signature-section, .signature-grid, .grand-total-section, .summary-section, table, .prepared-for, .waste-badge, .footer, .terms, .grid-2');
  let cumulativeOffset = 0;

  sections.forEach((section) => {
    const el = section as HTMLElement;
    const rect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const topInContainer = rect.top - containerRect.top + cumulativeOffset;

    // Which page does this section start on?
    const pageStart = Math.floor(topInContainer / usablePageHeightPx);
    // Where would it end?
    const bottomInContainer = topInContainer + rect.height;
    const pageEnd = Math.floor((bottomInContainer - 1) / usablePageHeightPx);

    // If the section spans two pages and it's small enough to fit on one page
    if (pageEnd > pageStart && rect.height < usablePageHeightPx * 0.9) {
      const nextPageTop = (pageStart + 1) * usablePageHeightPx;
      const spacerHeight = nextPageTop - topInContainer;
      el.style.marginTop = `${spacerHeight + 12}px`;
      cumulativeOffset += spacerHeight + 12;
    }
  });
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

    // Scale factor: 800px container width maps to usableWidth mm
    const pxPerMm = 800 / usableWidth;
    const usablePageHeightPx = usablePageHeight * pxPerMm;

    // Adjust sections to avoid page-break splits
    adjustForPageBreaks(container, 800, usablePageHeightPx);

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

// ============================================
// CONTRACT TEMPLATE PDF BUILDER
// ============================================
export interface ContractTemplateData {
  contractNumber: string;
  contractType: 'residential' | 'commercial' | 'industrial' | 'renovation';
  projectName: string;
  projectAddress: string;
  gfa: number;
  gfaUnit: string;
  trade: string;
  startDate: string;
  endDate: string;
  teamSize: number;
  taskCount: number;
  contractorName?: string;
  contractorAddress?: string;
  contractorPhone?: string;
  contractorEmail?: string;
  clientName?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  scopeOfWork?: string;
  totalAmount?: number;
  depositPercentage?: number;
  warrantyPeriod?: string;
  paymentSchedule?: string;
}

const CONTRACT_TYPE_CONFIG: Record<string, {
  title: string;
  color: string;
  icon: string;
  defaultWarranty: string;
  defaultPayment: string;
}> = {
  residential: {
    title: 'Residential Construction Contract',
    color: '#059669',
    icon: '🏠',
    defaultWarranty: '1 year',
    defaultPayment: '50% deposit, 50% on completion',
  },
  commercial: {
    title: 'Commercial Construction Contract',
    color: '#0284c7',
    icon: '🏢',
    defaultWarranty: '2 years',
    defaultPayment: '30% deposit, 40% midpoint, 30% completion',
  },
  industrial: {
    title: 'Industrial Construction Contract',
    color: '#7c3aed',
    icon: '🏭',
    defaultWarranty: '3 years',
    defaultPayment: '25% deposit, 25% phase 1, 25% phase 2, 25% completion',
  },
  renovation: {
    title: 'Renovation Contract',
    color: '#ea580c',
    icon: '🔨',
    defaultWarranty: '6 months',
    defaultPayment: '50% deposit, 50% on completion',
  },
};

export const buildContractHTML = (data: ContractTemplateData): string => {
  const config = CONTRACT_TYPE_CONFIG[data.contractType] || CONTRACT_TYPE_CONFIG.residential;
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: system-ui, -apple-system, sans-serif; 
          color: #1e293b; 
          line-height: 1.6; 
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        .pdf-section { break-inside: avoid; page-break-inside: avoid; }
        .header { 
          text-align: center; 
          margin-bottom: 32px; 
          padding-bottom: 24px;
          border-bottom: 3px solid ${config.color};
        }
        .contract-badge {
          display: inline-block;
          background: ${config.color};
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .section { 
          margin-bottom: 24px; 
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: ${config.color};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .field { margin-bottom: 8px; }
        .field-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .field-value { font-size: 14px; font-weight: 500; }
        .terms { font-size: 12px; color: #475569; }
        .terms p { margin: 8px 0; }
        .signature-section { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
        .signature-box { border: 1px dashed #cbd5e1; padding: 24px; text-align: center; border-radius: 8px; margin-bottom: 16px; }
        .signature-line { border-bottom: 1px solid #1e293b; width: 200px; margin: 24px auto 8px; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="contract-badge">${config.icon} ${escapeHtml(data.contractType.toUpperCase())}</div>
        <h1 style="margin: 8px 0; font-size: 24px; color: ${config.color};">${config.title}</h1>
        <p style="color: #64748b; margin: 0;">Contract #${escapeHtml(data.contractNumber)} • ${currentDate}</p>
      </div>
      
      <div class="section">
        <div class="section-title">Project Details</div>
        <div class="grid-2">
          <div class="field">
            <div class="field-label">Project Name</div>
            <div class="field-value">${escapeHtml(data.projectName)}</div>
          </div>
          <div class="field">
            <div class="field-label">Trade / Service</div>
            <div class="field-value">${escapeHtml(data.trade)}</div>
          </div>
          <div class="field">
            <div class="field-label">Project Address</div>
            <div class="field-value">${escapeHtml(data.projectAddress)}</div>
          </div>
          <div class="field">
            <div class="field-label">Gross Floor Area</div>
            <div class="field-value">${data.gfa.toLocaleString()} ${escapeHtml(data.gfaUnit)}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Timeline & Resources</div>
        <div class="grid-2">
          <div class="field">
            <div class="field-label">Start Date</div>
            <div class="field-value">${escapeHtml(data.startDate)}</div>
          </div>
          <div class="field">
            <div class="field-label">Expected Completion</div>
            <div class="field-value">${escapeHtml(data.endDate)}</div>
          </div>
          <div class="field">
            <div class="field-label">Team Size</div>
            <div class="field-value">${data.teamSize} member${data.teamSize !== 1 ? 's' : ''}</div>
          </div>
          <div class="field">
            <div class="field-label">Scheduled Tasks</div>
            <div class="field-value">${data.taskCount} task${data.taskCount !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>
      
      <div class="grid-2">
        <div class="section">
          <div class="section-title">Contractor</div>
          <div class="field"><div class="field-label">Name</div><div class="field-value">${escapeHtml(data.contractorName || 'To be specified')}</div></div>
          <div class="field"><div class="field-label">Address</div><div class="field-value">${escapeHtml(data.contractorAddress || '—')}</div></div>
          <div class="field"><div class="field-label">Phone</div><div class="field-value">${escapeHtml(data.contractorPhone || '—')}</div></div>
          <div class="field"><div class="field-label">Email</div><div class="field-value">${escapeHtml(data.contractorEmail || '—')}</div></div>
        </div>
        <div class="section">
          <div class="section-title">Client</div>
          <div class="field"><div class="field-label">Name</div><div class="field-value">${escapeHtml(data.clientName || 'To be specified')}</div></div>
          <div class="field"><div class="field-label">Address</div><div class="field-value">${escapeHtml(data.clientAddress || '—')}</div></div>
          <div class="field"><div class="field-label">Phone</div><div class="field-value">${escapeHtml(data.clientPhone || '—')}</div></div>
          <div class="field"><div class="field-label">Email</div><div class="field-value">${escapeHtml(data.clientEmail || '—')}</div></div>
        </div>
      </div>
      
      ${data.totalAmount ? `
        <div class="section" style="background: linear-gradient(135deg, ${config.color}10, ${config.color}05);">
          <div class="section-title">Financial Terms</div>
          <div class="grid-2">
            <div class="field">
              <div class="field-label">Total Contract Value</div>
              <div class="field-value" style="font-size: 20px; color: ${config.color};">$${data.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="field">
              <div class="field-label">Deposit Required</div>
              <div class="field-value">${data.depositPercentage || 50}% ($${((data.totalAmount * (data.depositPercentage || 50)) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })})</div>
            </div>
          </div>
          <div class="field" style="margin-top: 12px;"><div class="field-label">Payment Schedule</div><div class="field-value">${escapeHtml(data.paymentSchedule || config.defaultPayment)}</div></div>
        </div>
      ` : ''}
      
      <div class="section">
        <div class="section-title">Scope of Work</div>
        <div class="terms">
          ${data.scopeOfWork ? `<p>${escapeHtml(data.scopeOfWork)}</p>` : `
            <p>The Contractor agrees to perform the following work:</p>
            <p>• Complete ${escapeHtml(data.trade)} work at the specified project address</p>
            <p>• Provide all necessary materials, labor, and equipment</p>
            <p>• Complete work within the specified timeline</p>
            <p>• Ensure all work meets applicable building codes and standards</p>
          `}
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Terms & Conditions</div>
        <div class="terms">
          <p><strong>Warranty:</strong> ${escapeHtml(data.warrantyPeriod || config.defaultWarranty)} from completion date</p>
          <p><strong>Changes:</strong> Any modifications must be agreed in writing by both parties</p>
          <p><strong>Delays:</strong> Contractor will notify Client of any delays beyond their control</p>
          <p><strong>Insurance:</strong> Contractor maintains liability insurance and WSIB coverage</p>
        </div>
      </div>
      
      <div class="signature-section">
        <div class="grid-2">
          <div class="signature-box">
            <p style="font-weight: 600; margin: 0;">Contractor Signature</p>
            <div class="signature-line"></div>
            <p style="font-size: 12px; color: #64748b; margin: 0;">Date: _______________</p>
          </div>
          <div class="signature-box">
            <p style="font-weight: 600; margin: 0;">Client Signature</p>
            <div class="signature-line"></div>
            <p style="font-size: 12px; color: #64748b; margin: 0;">Date: _______________</p>
          </div>
        </div>
      </div>
      
      <div class="footer">
        <p>Generated by BuildUnion • ${currentDate}</p>
        <p>This contract is legally binding upon signature by both parties.</p>
      </div>
    </body>
    </html>
  `;
};

export const generateContractPDF = async (data: ContractTemplateData): Promise<Blob> => {
  const html = buildContractHTML(data);
  return generatePDFBlob(html, {
    filename: `contract-${data.contractNumber}.pdf`,
    pageFormat: 'letter',
    margin: 15,
  });
};

export const downloadContractPDF = async (data: ContractTemplateData): Promise<void> => {
  const html = buildContractHTML(data);
  await downloadPDF(html, {
    filename: `contract-${data.contractNumber}.pdf`,
    pageFormat: 'letter',
    margin: 15,
  });
};
