// ============================================
// M.E.S.S.A. COST BREAKDOWN PDF GENERATOR
// Professional construction cost breakdown with dual signature blocks
// ============================================

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// HTML escape function to prevent XSS
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

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  category?: 'material' | 'labor' | 'other';
}

export interface InvoiceData {
  invoiceNumber: string;
  projectName: string;
  projectAddress: string;
  trade: string;
  gfa: number;
  gfaUnit: string;
  wastePercent?: number;
  
  contractor: {
    name: string;
    phone: string;
    email: string;
    address?: string;
    logo?: string;
    province?: string;
  };
  
  client: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxInfo: {
    province: string;
    name: string;
    rate: number;
    amount: number;
  };
  grandTotal: number;
  
  materialsCost?: number;
  laborCost?: number;
  otherCost?: number;
  
  dueDate: string;
  notes: string;
  generatedAt: string;
  status: string;
}

export const buildInvoiceHTML = (data: InvoiceData): string => {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  const shortDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  // Separate line items by category
  const materialItems = data.lineItems.filter(item => 
    item.category === 'material' || (!item.category && !item.description.toLowerCase().includes('installation'))
  );
  const laborItems = data.lineItems.filter(item => 
    item.category === 'labor' || (!item.category && item.description.toLowerCase().includes('installation'))
  );
  
  // Calculate totals
  const materialsTotal = data.materialsCost || materialItems.reduce((sum, item) => sum + item.total, 0);
  const laborTotal = data.laborCost || laborItems.reduce((sum, item) => sum + item.total, 0);
  const otherTotal = data.otherCost || 0;
  const subtotal = materialsTotal + laborTotal + otherTotal;

  // Build materials table rows
  const materialsRowsHTML = materialItems.length > 0 ? materialItems.map(item => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.description)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity.toLocaleString()}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${escapeHtml(item.unit)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="5" style="padding: 20px; text-align: center; color: #9ca3af;">No material items</td>
    </tr>
  `;

  // Build labor table rows
  const laborRowsHTML = laborItems.length > 0 ? laborItems.map(item => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.description)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity.toLocaleString()}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${escapeHtml(item.unit)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="5" style="padding: 20px; text-align: center; color: #9ca3af;">No labor items</td>
    </tr>
  `;

  // Province code extraction
  const provinceCode = data.contractor.province || data.taxInfo.province?.substring(0, 2).toUpperCase() || 'ON';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          color: #1f2937; 
          line-height: 1.4;
          max-width: 800px;
          margin: 0 auto;
          padding: 32px 40px;
          background: white;
          font-size: 14px;
        }
        
        /* Header - MESSA Style */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f59e0b;
        }
        .header-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .brand-name {
          font-size: 28px;
          font-weight: 800;
          color: #f59e0b;
          letter-spacing: -0.5px;
        }
        .doc-type {
          font-size: 16px;
          color: #6b7280;
          font-weight: 500;
        }
        .project-title {
          font-size: 15px;
          font-weight: 600;
          color: #374151;
          margin-top: 4px;
        }
        .header-right {
          text-align: right;
          font-size: 13px;
          color: #4b5563;
        }
        .header-right .date {
          font-weight: 600;
          color: #1f2937;
          font-size: 14px;
        }
        .header-right .province {
          font-weight: 700;
          color: #f59e0b;
          font-size: 16px;
        }
        .header-right .phone {
          margin-top: 4px;
        }
        .header-right .location {
          color: #6b7280;
          font-size: 12px;
        }
        
        /* Prepared For Section */
        .prepared-for {
          margin-bottom: 20px;
        }
        .prepared-for-label {
          font-size: 11px;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 4px;
        }
        .client-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 24px;
          font-size: 13px;
        }
        .client-info .name {
          font-weight: 600;
          font-size: 15px;
          color: #111827;
        }
        .client-info .detail {
          color: #4b5563;
        }
        
        /* Waste Badge */
        .waste-badge {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 8px 16px;
          margin-bottom: 20px;
          font-size: 13px;
          width: 100%;
          max-width: 280px;
        }
        .waste-badge .label {
          color: #92400e;
          font-weight: 500;
        }
        .waste-badge .value {
          color: #78350f;
          font-weight: 700;
        }
        
        /* Section Headers */
        .section-header {
          font-size: 13px;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 24px 0 12px 0;
          padding-bottom: 6px;
          border-bottom: 2px solid #e5e7eb;
        }
        .section-header.materials { color: #059669; border-color: #10b981; }
        .section-header.labor { color: #2563eb; border-color: #3b82f6; }
        
        /* Tables */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
          background: white;
        }
        th {
          background: #f3f4f6;
          padding: 10px 12px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e5e7eb;
        }
        th:nth-child(2), th:nth-child(3) { text-align: center; }
        th:nth-child(4), th:nth-child(5) { text-align: right; }
        
        /* Summary Section */
        .summary-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 28px;
        }
        .summary-box {
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px 20px;
          border: 1px solid #e5e7eb;
        }
        .summary-title {
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          font-size: 14px;
          border-bottom: 1px solid #e5e7eb;
        }
        .summary-row:last-child {
          border-bottom: none;
        }
        .summary-row .label {
          color: #4b5563;
        }
        .summary-row .value {
          font-weight: 600;
          color: #111827;
        }
        .summary-row.materials .value { color: #059669; }
        .summary-row.labor .value { color: #2563eb; }
        
        /* Tax Section */
        .tax-box {
          background: #fefce8;
          border: 1px solid #fde047;
          border-radius: 8px;
          padding: 16px 20px;
        }
        .tax-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 13px;
          color: #713f12;
        }
        
        /* Grand Total */
        .grand-total-section {
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
          border-radius: 8px;
          padding: 16px 24px;
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .grand-total-label {
          color: rgba(255,255,255,0.8);
          font-size: 14px;
          font-weight: 500;
        }
        .grand-total-value {
          color: #fbbf24;
          font-size: 28px;
          font-weight: 800;
        }
        .grand-total-note {
          color: rgba(255,255,255,0.6);
          font-size: 12px;
        }
        
        /* Signature Section */
        .signature-section {
          margin-top: 36px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
        }
        .signature-intro {
          font-size: 13px;
          color: #4b5563;
          margin-bottom: 16px;
          line-height: 1.5;
        }
        .signature-intro strong {
          color: #111827;
        }
        .signature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        .signature-box {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 16px;
          background: #fafafa;
        }
        .signature-title {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 24px;
        }
        .signature-line {
          border-bottom: 1px solid #9ca3af;
          height: 40px;
          margin-bottom: 8px;
        }
        .signature-fields {
          display: flex;
          gap: 16px;
          font-size: 11px;
          color: #6b7280;
        }
        .signature-field {
          flex: 1;
        }
        .signature-field span {
          display: block;
          margin-top: 4px;
          padding-top: 4px;
          border-top: 1px dotted #d1d5db;
        }
        
        /* Footer */
        .footer {
          margin-top: 28px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #9ca3af;
        }
        .footer-brand {
          font-weight: 700;
          color: #f59e0b;
          font-size: 14px;
        }
        .footer-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f3f4f6;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 10px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <!-- MESSA Style Header -->
      <div class="header">
        <div class="header-left">
          <div class="brand-name">M.E.S.S.A.</div>
          <div class="doc-type">Cost Breakdown</div>
          <div class="project-title">${escapeHtml(data.projectName)}</div>
        </div>
        <div class="header-right">
          <div class="date">${currentDate}</div>
          <div class="province">${escapeHtml(provinceCode)}</div>
          <div class="phone">${escapeHtml(data.contractor.phone)}</div>
          <div class="location">${escapeHtml(data.projectAddress?.split(',')[0] || data.contractor.address?.split(',')[0] || '')}</div>
        </div>
      </div>
      
      <!-- Prepared For Section -->
      <div class="prepared-for">
        <div class="prepared-for-label"># Prepared For</div>
        <div class="client-info">
          <div class="name">${escapeHtml(data.client.name) || 'Client Name'}</div>
          <div class="detail">${escapeHtml(data.client.phone)}</div>
          <div class="detail">${escapeHtml(data.client.email)}</div>
          <div class="detail">${escapeHtml(data.client.address)}</div>
        </div>
      </div>
      
      <!-- Waste Badge -->
      ${data.wastePercent !== undefined ? `
        <div class="waste-badge">
          <span class="label">Materials Waste: ${data.wastePercent}%</span>
          <span class="value">$${materialsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      ` : ''}
      
      <!-- Materials Table -->
      <div class="section-header materials"># Description</div>
      <table>
        <thead>
          <tr>
            <th style="width: 40%;">Description</th>
            <th style="width: 12%;">Qty</th>
            <th style="width: 15%;">Unit</th>
            <th style="width: 15%;">Price</th>
            <th style="width: 18%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${materialsRowsHTML}
        </tbody>
      </table>
      
      <!-- Labor Table -->
      <div class="section-header labor"># Labor</div>
      <table>
        <thead>
          <tr>
            <th style="width: 40%;">Description</th>
            <th style="width: 12%;">Qty</th>
            <th style="width: 15%;">Unit</th>
            <th style="width: 15%;">Price</th>
            <th style="width: 18%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${laborRowsHTML}
        </tbody>
      </table>
      
      <!-- Summary + Tax Grid -->
      <div class="summary-section">
        <!-- Summary Box -->
        <div class="summary-box">
          <div class="summary-title"># Summary</div>
          <div class="summary-row materials">
            <span class="label">Materials</span>
            <span class="value">$${materialsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="summary-row labor">
            <span class="label">Labor</span>
            <span class="value">$${laborTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="summary-row">
            <span class="label">Other</span>
            <span class="value">$${otherTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="summary-row" style="border-top: 2px solid #d1d5db; margin-top: 8px; padding-top: 8px;">
            <span class="label"><strong>Subtotal</strong></span>
            <span class="value">$${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        
        <!-- Tax Box -->
        <div class="tax-box">
          <div class="summary-title"># Tax (${escapeHtml(data.taxInfo.province)})</div>
          <div class="tax-row">
            <span>${escapeHtml(data.taxInfo.name)} (${(data.taxInfo.rate * 100).toFixed(0)}%)</span>
            <span>$${data.taxInfo.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="tax-row" style="border-top: 1px solid #fde047; margin-top: 8px; padding-top: 8px; font-weight: 600;">
            <span>Total Tax</span>
            <span>$${data.taxInfo.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
      
      <!-- Grand Total -->
      <div class="grand-total-section">
        <div>
          <div class="grand-total-label"># Grand Total</div>
          <div class="grand-total-note">(incl. tax)</div>
        </div>
        <div class="grand-total-value">$${data.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      
      <!-- Client Approval Signature Section -->
      <div class="signature-section">
        <div class="signature-intro">
          <strong># Client Approval</strong><br/>
          By signing below, client approves this cost breakdown for: <strong>${escapeHtml(data.projectName)}</strong>
        </div>
        <div class="signature-grid">
          <div class="signature-box">
            <div class="signature-title">Client Signature</div>
            <div class="signature-line"></div>
            <div class="signature-fields">
              <div class="signature-field">Name: <span></span></div>
              <div class="signature-field">Date: <span></span></div>
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-title">Contractor Signature</div>
            <div class="signature-line"></div>
            <div class="signature-fields">
              <div class="signature-field">Name: <span></span></div>
              <div class="signature-field">Date: <span></span></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <div>
          <span class="footer-brand">M.E.S.S.A.</span>
          <span style="margin-left: 12px;">${escapeHtml(data.contractor.phone)}</span>
        </div>
        <div class="footer-badge">
          Licensed & Insured • ${shortDate}
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateInvoicePDF = async (data: InvoiceData): Promise<Blob> => {
  const html = buildInvoiceHTML(data);
  
  // Create temporary container
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10;
    const usableWidth = imgWidth - (margin * 2);
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'JPEG', margin, position, usableWidth, imgHeight);
    heightLeft -= (pageHeight - margin * 2);

    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imgHeight - heightLeft);
      pdf.addImage(imgData, 'JPEG', margin, position, usableWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
};

export const downloadInvoicePDF = async (data: InvoiceData): Promise<void> => {
  const blob = await generateInvoicePDF(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cost-breakdown-${data.projectName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
