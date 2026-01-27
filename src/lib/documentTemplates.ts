// Document Templates - Predefined templates for contracts, invoices, quotes
// Reduces AI token usage by using structured templates instead of AI generation

// ============================================
// CONTRACT TEMPLATES
// ============================================

export interface ContractTemplateData {
  contractNumber: string;
  date: string;
  contractor: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    license?: string;
  };
  client: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  project: {
    name: string;
    address?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  };
  financials: {
    subtotal: number;
    taxAmount: number;
    total: number;
    deposit: number;
    depositPercent: number;
  };
  materials: Array<{
    item: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
  terms?: string[];
  notes?: string;
}

export function generateContractHTML(data: ContractTemplateData): string {
  const escapeHtml = (text: string | number | null | undefined): string => {
    if (text === null || text === undefined) return '';
    const str = String(text);
    const map: Record<string, string> = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, (m) => map[m]);
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

  const materialsRows = data.materials.map(m => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">${escapeHtml(m.item)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: center;">${m.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: center;">${escapeHtml(m.unit)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">${formatCurrency(m.unitPrice)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600;">${formatCurrency(m.total)}</td>
    </tr>
  `).join('');

  const termsSection = data.terms?.length ? `
    <div style="margin-top: 24px;">
      <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Terms & Conditions</h3>
      <ul style="font-size: 12px; color: #666; padding-left: 20px;">
        ${data.terms.map(t => `<li style="margin-bottom: 6px;">${escapeHtml(t)}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Contract ${escapeHtml(data.contractNumber)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; background: #fff; line-height: 1.5; font-size: 12px; }
      </style>
    </head>
    <body>
      <div style="max-width: 800px; margin: 0 auto; padding: 32px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 24px; font-weight: 700;">CONSTRUCTION CONTRACT</h1>
            <p style="color: #666; font-size: 11px; margin-top: 4px;">Contract #${escapeHtml(data.contractNumber)}</p>
          </div>
          <div style="text-align: right;">
            <p style="font-weight: 600;">${escapeHtml(data.contractor.name)}</p>
            ${data.contractor.address ? `<p style="font-size: 11px; color: #666;">${escapeHtml(data.contractor.address)}</p>` : ''}
            ${data.contractor.phone ? `<p style="font-size: 11px; color: #666;">📞 ${escapeHtml(data.contractor.phone)}</p>` : ''}
            ${data.contractor.license ? `<p style="font-size: 11px; color: #666;">License: ${escapeHtml(data.contractor.license)}</p>` : ''}
          </div>
        </div>

        <!-- Client & Project Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
          <div style="background: #f8f8f8; padding: 16px; border-radius: 8px;">
            <h3 style="font-size: 12px; font-weight: 600; color: #666; margin-bottom: 8px;">CLIENT</h3>
            <p style="font-weight: 600;">${escapeHtml(data.client.name)}</p>
            ${data.client.address ? `<p style="font-size: 11px; color: #666;">${escapeHtml(data.client.address)}</p>` : ''}
            ${data.client.phone ? `<p style="font-size: 11px; color: #666;">📞 ${escapeHtml(data.client.phone)}</p>` : ''}
            ${data.client.email ? `<p style="font-size: 11px; color: #666;">✉️ ${escapeHtml(data.client.email)}</p>` : ''}
          </div>
          <div style="background: #f8f8f8; padding: 16px; border-radius: 8px;">
            <h3 style="font-size: 12px; font-weight: 600; color: #666; margin-bottom: 8px;">PROJECT</h3>
            <p style="font-weight: 600;">${escapeHtml(data.project.name)}</p>
            ${data.project.address ? `<p style="font-size: 11px; color: #666;">📍 ${escapeHtml(data.project.address)}</p>` : ''}
            ${data.project.startDate ? `<p style="font-size: 11px; color: #666;">Start: ${escapeHtml(data.project.startDate)}</p>` : ''}
            ${data.project.endDate ? `<p style="font-size: 11px; color: #666;">End: ${escapeHtml(data.project.endDate)}</p>` : ''}
          </div>
        </div>

        <!-- Materials Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background: #1a1a1a; color: white;">
              <th style="padding: 12px; text-align: left;">Item</th>
              <th style="padding: 12px; text-align: center;">Qty</th>
              <th style="padding: 12px; text-align: center;">Unit</th>
              <th style="padding: 12px; text-align: right;">Price</th>
              <th style="padding: 12px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${materialsRows}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
          <div style="width: 280px; background: #f8f8f8; padding: 16px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Subtotal:</span>
              <span style="font-weight: 600;">${formatCurrency(data.financials.subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Tax (HST 13%):</span>
              <span>${formatCurrency(data.financials.taxAmount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 2px solid #1a1a1a; font-size: 16px;">
              <span style="font-weight: 700;">TOTAL:</span>
              <span style="font-weight: 700;">${formatCurrency(data.financials.total)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #ccc;">
              <span style="font-size: 11px;">Deposit (${data.financials.depositPercent}%):</span>
              <span style="font-size: 11px; font-weight: 600;">${formatCurrency(data.financials.deposit)}</span>
            </div>
          </div>
        </div>

        ${termsSection}

        ${data.notes ? `
          <div style="margin-top: 24px; padding: 16px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px;">
            <h3 style="font-size: 12px; font-weight: 600; margin-bottom: 8px;">📝 Notes</h3>
            <p style="font-size: 12px; color: #666;">${escapeHtml(data.notes)}</p>
          </div>
        ` : ''}

        <!-- Signature Block -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 48px;">
          <div style="border-top: 1px solid #1a1a1a; padding-top: 8px;">
            <p style="font-size: 11px; color: #666;">Contractor Signature</p>
            <p style="font-size: 12px; margin-top: 4px;">${escapeHtml(data.contractor.name)}</p>
            <p style="font-size: 10px; color: #999;">Date: _______________</p>
          </div>
          <div style="border-top: 1px solid #1a1a1a; padding-top: 8px;">
            <p style="font-size: 11px; color: #666;">Client Signature</p>
            <p style="font-size: 12px; margin-top: 4px;">${escapeHtml(data.client.name)}</p>
            <p style="font-size: 10px; color: #999;">Date: _______________</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e5e5; text-align: center;">
          <p style="font-size: 10px; color: #999;">
            This contract is a legal agreement. By signing, both parties agree to the terms above.
          </p>
          <p style="font-size: 10px; color: #999; margin-top: 4px;">
            Generated on ${escapeHtml(data.date)} | ${escapeHtml(data.contractor.name)}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================
// INVOICE TEMPLATES
// ============================================

export interface InvoiceTemplateData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  contractor: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  client: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  project: {
    name: string;
    address?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paid?: number;
  balance?: number;
  paymentTerms?: string;
}

export function generateInvoiceHTML(data: InvoiceTemplateData): string {
  const escapeHtml = (text: string | number | null | undefined): string => {
    if (text === null || text === undefined) return '';
    const str = String(text);
    const map: Record<string, string> = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, (m) => map[m]);
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">${escapeHtml(item.description)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${escapeHtml(item.unit)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${formatCurrency(item.unitPrice)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600;">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${escapeHtml(data.invoiceNumber)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; }
      </style>
    </head>
    <body>
      <div style="max-width: 800px; margin: 0 auto; padding: 32px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 32px;">
          <div>
            <h1 style="font-size: 36px; font-weight: 700; color: #1a1a1a;">INVOICE</h1>
            <p style="font-size: 12px; color: #666; margin-top: 4px;">#${escapeHtml(data.invoiceNumber)}</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 14px; font-weight: 600;">${escapeHtml(data.contractor.name)}</p>
            ${data.contractor.address ? `<p style="font-size: 11px; color: #666;">${escapeHtml(data.contractor.address)}</p>` : ''}
            ${data.contractor.phone ? `<p style="font-size: 11px; color: #666;">${escapeHtml(data.contractor.phone)}</p>` : ''}
            ${data.contractor.email ? `<p style="font-size: 11px; color: #666;">${escapeHtml(data.contractor.email)}</p>` : ''}
          </div>
        </div>

        <!-- Meta Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 32px; padding: 16px; background: #f8f8f8; border-radius: 8px;">
          <div>
            <p style="font-size: 10px; color: #666; text-transform: uppercase;">Invoice Date</p>
            <p style="font-weight: 600;">${escapeHtml(data.date)}</p>
          </div>
          <div>
            <p style="font-size: 10px; color: #666; text-transform: uppercase;">Due Date</p>
            <p style="font-weight: 600;">${escapeHtml(data.dueDate || 'Upon Receipt')}</p>
          </div>
          <div>
            <p style="font-size: 10px; color: #666; text-transform: uppercase;">Amount Due</p>
            <p style="font-weight: 700; font-size: 18px; color: #16a34a;">${formatCurrency(data.balance ?? data.total)}</p>
          </div>
        </div>

        <!-- Bill To -->
        <div style="margin-bottom: 32px;">
          <p style="font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 4px;">Bill To</p>
          <p style="font-weight: 600;">${escapeHtml(data.client.name)}</p>
          ${data.client.address ? `<p style="font-size: 12px; color: #666;">${escapeHtml(data.client.address)}</p>` : ''}
          ${data.client.email ? `<p style="font-size: 12px; color: #666;">${escapeHtml(data.client.email)}</p>` : ''}
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background: #1a1a1a; color: white;">
              <th style="padding: 12px; text-align: left;">Description</th>
              <th style="padding: 12px; text-align: center;">Qty</th>
              <th style="padding: 12px; text-align: center;">Unit</th>
              <th style="padding: 12px; text-align: right;">Rate</th>
              <th style="padding: 12px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="display: flex; justify-content: flex-end;">
          <div style="width: 280px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5;">
              <span>Subtotal:</span>
              <span>${formatCurrency(data.subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5;">
              <span>Tax (${data.taxRate}%):</span>
              <span>${formatCurrency(data.taxAmount)}</span>
            </div>
            ${data.paid ? `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5;">
                <span>Paid:</span>
                <span style="color: #16a34a;">-${formatCurrency(data.paid)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: 700;">
              <span>${data.paid ? 'Balance Due:' : 'Total:'}</span>
              <span>${formatCurrency(data.balance ?? data.total)}</span>
            </div>
          </div>
        </div>

        ${data.paymentTerms ? `
          <div style="margin-top: 32px; padding: 16px; background: #fef3c7; border-radius: 8px;">
            <p style="font-size: 12px; color: #92400e;"><strong>Payment Terms:</strong> ${escapeHtml(data.paymentTerms)}</p>
          </div>
        ` : ''}

        <!-- Footer -->
        <div style="margin-top: 48px; text-align: center; color: #999; font-size: 11px;">
          <p>Thank you for your business!</p>
          <p style="margin-top: 4px;">${escapeHtml(data.contractor.name)} | ${escapeHtml(data.contractor.email || '')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================
// QUOTE TEMPLATES
// ============================================

export interface QuoteTemplateData {
  quoteNumber: string;
  date: string;
  validUntil?: string;
  contractor: {
    name: string;
    phone?: string;
    email?: string;
    license?: string;
  };
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  project: {
    name: string;
    address?: string;
    description?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
}

export function generateQuoteHTML(data: QuoteTemplateData): string {
  const escapeHtml = (text: string | number | null | undefined): string => {
    if (text === null || text === undefined) return '';
    const str = String(text);
    const map: Record<string, string> = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, (m) => map[m]);
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">${escapeHtml(item.description)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: center;">${escapeHtml(item.unit)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">${formatCurrency(item.unitPrice)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600;">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quote ${escapeHtml(data.quoteNumber)}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; margin: 0; padding: 32px;">
      <div style="max-width: 800px; margin: 0 auto;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="margin: 0; font-size: 28px;">PROJECT QUOTE</h1>
              <p style="margin: 4px 0 0; opacity: 0.9; font-size: 12px;">#${escapeHtml(data.quoteNumber)} | ${escapeHtml(data.date)}</p>
            </div>
            <div style="text-align: right;">
              <p style="font-weight: 600; margin: 0;">${escapeHtml(data.contractor.name)}</p>
              ${data.contractor.phone ? `<p style="margin: 2px 0 0; font-size: 11px; opacity: 0.9;">${escapeHtml(data.contractor.phone)}</p>` : ''}
            </div>
          </div>
        </div>

        <div style="background: white; padding: 24px; border: 1px solid #e5e5e5; border-top: none;">
          <!-- Client & Project -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
            <div style="padding: 16px; background: #f8fafc; border-radius: 8px;">
              <p style="font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Prepared For</p>
              <p style="font-weight: 600; margin: 0;">${escapeHtml(data.client.name)}</p>
              ${data.client.email ? `<p style="font-size: 11px; color: #64748b; margin: 2px 0 0;">${escapeHtml(data.client.email)}</p>` : ''}
              ${data.client.address ? `<p style="font-size: 11px; color: #64748b; margin: 2px 0 0;">${escapeHtml(data.client.address)}</p>` : ''}
            </div>
            <div style="padding: 16px; background: #f8fafc; border-radius: 8px;">
              <p style="font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Project</p>
              <p style="font-weight: 600; margin: 0;">${escapeHtml(data.project.name)}</p>
              ${data.project.address ? `<p style="font-size: 11px; color: #64748b; margin: 2px 0 0;">📍 ${escapeHtml(data.project.address)}</p>` : ''}
            </div>
          </div>

          ${data.project.description ? `
            <div style="margin-bottom: 24px; padding: 12px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px;">
              <p style="font-size: 12px; color: #92400e;">${escapeHtml(data.project.description)}</p>
            </div>
          ` : ''}

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Description</th>
                <th style="padding: 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: #64748b;">Qty</th>
                <th style="padding: 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: #64748b;">Unit</th>
                <th style="padding: 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #64748b;">Rate</th>
                <th style="padding: 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #64748b;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <!-- Totals -->
          <div style="display: flex; justify-content: flex-end;">
            <div style="width: 280px; background: #f8fafc; padding: 16px; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b;">Subtotal:</span>
                <span>${formatCurrency(data.subtotal)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b;">Tax (${data.taxRate}%):</span>
                <span>${formatCurrency(data.taxAmount)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid #3b82f6;">
                <span style="font-weight: 700; font-size: 16px;">Total:</span>
                <span style="font-weight: 700; font-size: 16px; color: #3b82f6;">${formatCurrency(data.total)}</span>
              </div>
            </div>
          </div>

          ${data.validUntil ? `
            <div style="margin-top: 24px; text-align: center; padding: 12px; background: #fee2e2; border-radius: 8px;">
              <p style="font-size: 12px; color: #991b1b;">⏰ This quote is valid until <strong>${escapeHtml(data.validUntil)}</strong></p>
            </div>
          ` : ''}

          ${data.notes ? `
            <div style="margin-top: 24px; padding: 16px; border: 1px dashed #e5e5e5; border-radius: 8px;">
              <p style="font-size: 12px; color: #64748b;"><strong>Notes:</strong> ${escapeHtml(data.notes)}</p>
            </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="background: #1e293b; color: white; padding: 16px 24px; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="font-size: 11px; margin: 0; opacity: 0.8;">
            Thank you for considering ${escapeHtml(data.contractor.name)} for your project!
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
