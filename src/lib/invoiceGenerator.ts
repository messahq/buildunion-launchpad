// ============================================
// INVOICE PDF GENERATOR
// Builds professional invoice HTML and converts to PDF
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
}

export interface InvoiceData {
  invoiceNumber: string;
  projectName: string;
  projectAddress: string;
  trade: string;
  gfa: number;
  gfaUnit: string;
  
  contractor: {
    name: string;
    phone: string;
    email: string;
    address?: string;
    logo?: string;
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
  
  dueDate: string;
  notes: string;
  generatedAt: string;
  status: string;
}

export const buildInvoiceHTML = (data: InvoiceData): string => {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  const dueDate = new Date(data.dueDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const lineItemsHTML = data.lineItems.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left;">${escapeHtml(item.description)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity.toLocaleString()}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${escapeHtml(item.unit)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">$${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  // Build logo section - use provided logo or BuildUnion default with actual image
  const defaultLogoUrl = '/images/buildunion-logo-lightmode.png';
  const logoSection = data.contractor.logo 
    ? `<img src="${escapeHtml(data.contractor.logo)}" alt="Company Logo" style="max-height: 60px; max-width: 200px; object-fit: contain;" />`
    : `<img src="${defaultLogoUrl}" alt="BuildUnion" style="max-height: 60px; max-width: 180px; object-fit: contain;" onerror="this.style.display='none';this.nextSibling.style.display='flex';" /><div style="display:none;font-size:24px;font-weight:700;color:#f59e0b;align-items:center;gap:8px;">🏗️ BuildUnion</div>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: system-ui, -apple-system, sans-serif; 
          color: #1e293b; 
          line-height: 1.5;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          background: white;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 3px solid #f59e0b;
        }
        .company-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .company-logo {
          margin-bottom: 12px;
        }
        .company-info {
          font-size: 13px;
          color: #475569;
          line-height: 1.6;
        }
        .company-info div {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .invoice-meta {
          text-align: right;
        }
        .invoice-badge {
          display: inline-block;
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          color: white;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .invoice-number {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin: 8px 0;
        }
        .dates {
          color: #64748b;
          font-size: 14px;
        }
        .dates strong {
          color: #1e293b;
        }
        .parties {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          margin-bottom: 32px;
        }
        .party-box {
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          border-left: 4px solid #f59e0b;
        }
        .party-label {
          font-size: 11px;
          font-weight: 600;
          color: #f59e0b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .party-name {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 8px;
        }
        .party-detail {
          font-size: 14px;
          color: #64748b;
          margin: 4px 0;
        }
        .project-bar {
          background: linear-gradient(135deg, #1e293b, #334155);
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          margin-bottom: 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .project-name {
          font-size: 16px;
          font-weight: 600;
        }
        .project-meta {
          font-size: 14px;
          opacity: 0.8;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        th {
          background: #f1f5f9;
          padding: 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        th:nth-child(2), th:nth-child(3) { text-align: center; }
        th:nth-child(4), th:nth-child(5) { text-align: right; }
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 32px;
        }
        .totals-box {
          width: 320px;
          background: #f8fafc;
          border-radius: 12px;
          padding: 20px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        .total-row.discount {
          color: #16a34a;
        }
        .total-row.tax {
          color: #64748b;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 12px;
          margin-bottom: 8px;
        }
        .total-row.grand {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          padding-top: 8px;
        }
        .total-row.grand .amount {
          color: #f59e0b;
        }
        .notes-section {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 32px;
        }
        .notes-label {
          font-size: 12px;
          font-weight: 600;
          color: #92400e;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .notes-text {
          color: #78350f;
          font-size: 14px;
        }
        .footer {
          text-align: center;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
          color: #94a3b8;
          font-size: 12px;
        }
        .payment-badge {
          display: inline-block;
          background: ${data.status === 'paid' ? '#dcfce7' : '#fef3c7'};
          color: ${data.status === 'paid' ? '#166534' : '#92400e'};
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-header">
          <div class="company-logo">
            ${logoSection}
          </div>
          <div class="company-info">
            <div><strong>${escapeHtml(data.contractor.name)}</strong></div>
            ${data.contractor.phone ? `<div>📞 ${escapeHtml(data.contractor.phone)}</div>` : ''}
            ${data.contractor.email ? `<div>✉️ ${escapeHtml(data.contractor.email)}</div>` : ''}
            ${data.contractor.address ? `<div>📍 ${escapeHtml(data.contractor.address)}</div>` : ''}
          </div>
        </div>
        <div class="invoice-meta">
          <div class="invoice-badge">INVOICE</div>
          <div class="invoice-number">#${escapeHtml(data.invoiceNumber)}</div>
          <div class="dates">
            <div>Date: <strong>${currentDate}</strong></div>
            <div>Due: <strong>${dueDate}</strong></div>
          </div>
          <div style="margin-top: 8px;">
            <span class="payment-badge">${data.status === 'paid' ? '✓ PAID' : 'PENDING'}</span>
          </div>
        </div>
      </div>
      
      <div class="parties">
        <div class="party-box">
          <div class="party-label">From</div>
          <div class="party-name">${escapeHtml(data.contractor.name)}</div>
          ${data.contractor.email ? `<div class="party-detail">✉ ${escapeHtml(data.contractor.email)}</div>` : ''}
          ${data.contractor.phone ? `<div class="party-detail">☎ ${escapeHtml(data.contractor.phone)}</div>` : ''}
          ${data.contractor.address ? `<div class="party-detail">📍 ${escapeHtml(data.contractor.address)}</div>` : ''}
        </div>
        <div class="party-box">
          <div class="party-label">Bill To</div>
          <div class="party-name">${escapeHtml(data.client.name) || 'Client Name'}</div>
          ${data.client.email ? `<div class="party-detail">✉ ${escapeHtml(data.client.email)}</div>` : ''}
          ${data.client.phone ? `<div class="party-detail">☎ ${escapeHtml(data.client.phone)}</div>` : ''}
          ${data.client.address ? `<div class="party-detail">📍 ${escapeHtml(data.client.address)}</div>` : ''}
        </div>
      </div>
      
      <div class="project-bar">
        <div>
          <div class="project-name">${escapeHtml(data.projectName)}</div>
          <div class="project-meta">${escapeHtml(data.projectAddress)}</div>
        </div>
        <div style="text-align: right;">
          <div class="project-meta">${escapeHtml(data.trade)}</div>
          ${data.gfa ? `<div class="project-meta">${data.gfa.toLocaleString()} ${escapeHtml(data.gfaUnit)}</div>` : ''}
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHTML}
        </tbody>
      </table>
      
      <div class="totals-section">
        <div class="totals-box">
          <div class="total-row">
            <span>Subtotal</span>
            <span>$${data.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          ${data.discountAmount > 0 ? `
            <div class="total-row discount">
              <span>Discount (${data.discountPercent}%)</span>
              <span>-$${data.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ` : ''}
          <div class="total-row tax">
            <span>${data.taxInfo.name} (${(data.taxInfo.rate * 100).toFixed(2)}%) - ${data.taxInfo.province}</span>
            <span>$${data.taxInfo.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="total-row grand">
            <span>Total Due</span>
            <span class="amount">$${data.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
      
      ${data.notes ? `
        <div class="notes-section">
          <div class="notes-label">Notes</div>
          <div class="notes-text">${escapeHtml(data.notes)}</div>
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Generated by BuildUnion • ${currentDate}</p>
        <p>Thank you for your business!</p>
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
  a.download = `invoice-${data.invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
