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
const adjustForPageBreaks = (container: HTMLElement, _usableWidthPx: number, usablePageHeightPx: number) => {
  let cumulativeOffset = 0;

  const getTop = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return rect.top - containerRect.top + cumulativeOffset;
  };

  const pushToNextPage = (el: HTMLElement, padding = 8) => {
    const topInContainer = getTop(el);
    const pageStart = Math.floor(topInContainer / usablePageHeightPx);
    const nextPageTop = (pageStart + 1) * usablePageHeightPx;
    const spacerHeight = nextPageTop - topInContainer + padding;
    if (spacerHeight > 0 && spacerHeight < usablePageHeightPx) {
      el.style.marginTop = `${spacerHeight}px`;
      cumulativeOffset += spacerHeight;
    }
  };

  // -----------------------------------------------------------
  // PASS 0: Explicit page breaks (.pdf-page-break)
  // -----------------------------------------------------------
  container.querySelectorAll('.pdf-page-break').forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.breakBefore = 'page';
    htmlEl.style.pageBreakBefore = 'always';
  });

  // -----------------------------------------------------------
  // PASS 1: Keep small blocks together (push to next page if split)
  // -----------------------------------------------------------
  const noBreakSelectors = [
    '.pdf-section', '.section', '.signature-section', '.signature-grid',
    '.grand-total-section', '.summary-section', '.financial-highlight',
    '.clause', '.preamble', '.contract-header', '.bu-pdf-header', '.bu-pdf-footer',
    '.financial-snapshot-card', '.verdict-card', '.risk-card', '.section-header-block',
    '.party-box', '.data-grid',
    'table:not(.allow-page-break)',
  ].join(', ');

  container.querySelectorAll(noBreakSelectors).forEach((section) => {
    const el = section as HTMLElement;
    const rect = el.getBoundingClientRect();
    const topInContainer = getTop(el);
    const pageStart = Math.floor(topInContainer / usablePageHeightPx);
    const bottomInContainer = topInContainer + rect.height;
    const pageEnd = Math.floor((bottomInContainer - 1) / usablePageHeightPx);

    if (pageEnd > pageStart && rect.height < usablePageHeightPx * 0.80) {
      pushToNextPage(el, 8);
    }

    // Shrink oversized sections
    if (rect.height > usablePageHeightPx * 0.95) {
      const scale = (usablePageHeightPx * 0.90) / rect.height;
      if (scale < 1 && scale > 0.6) {
        const currentFontSize = parseFloat(window.getComputedStyle(el).fontSize) || 13;
        el.style.fontSize = `${Math.max(8, currentFontSize * scale)}px`;
      }
    }
  });

  // -----------------------------------------------------------
  // PASS 2: Orphaned header prevention — push heading to next
  //         page if < 80px remaining on current page
  // -----------------------------------------------------------
  container.querySelectorAll('h2, h3, h4, .section-header, .section-title, [class*="section-header"]').forEach((heading) => {
    const el = heading as HTMLElement;
    const topInContainer = getTop(el);
    const positionOnPage = topInContainer % usablePageHeightPx;
    const remainingOnPage = usablePageHeightPx - positionOnPage;

    if (remainingOnPage < 80 && remainingOnPage > 0) {
      el.style.marginTop = `${remainingOnPage + 8}px`;
      cumulativeOffset += remainingOnPage + 8;
    }
  });

  // -----------------------------------------------------------
  // PASS 3: Table rows — prevent splitting individual rows
  // -----------------------------------------------------------
  container.querySelectorAll('tr').forEach((row) => {
    const el = row as HTMLElement;
    const rect = el.getBoundingClientRect();
    const topInContainer = getTop(el);
    const pageStart = Math.floor(topInContainer / usablePageHeightPx);
    const bottomInContainer = topInContainer + rect.height;
    const pageEnd = Math.floor((bottomInContainer - 1) / usablePageHeightPx);

    if (pageEnd > pageStart && rect.height < usablePageHeightPx * 0.15) {
      const nextPageTop = (pageStart + 1) * usablePageHeightPx;
      const spacerHeight = nextPageTop - topInContainer + 4;
      el.style.marginTop = `${spacerHeight}px`;
      cumulativeOffset += spacerHeight;
    }
  });

  // -----------------------------------------------------------
  // PASS 4: Large data sections — if starting near page bottom
  //         (< 120px remaining), push to next page
  // -----------------------------------------------------------
  container.querySelectorAll('.visual-intel-card, .site-presence-card, .line-item-card, .obc-card, .financial-highlight, .parties-grid').forEach((table) => {
    const el = table as HTMLElement;
    const topInContainer = getTop(el);
    const positionOnPage = topInContainer % usablePageHeightPx;
    const remainingOnPage = usablePageHeightPx - positionOnPage;

    if (remainingOnPage < 120 && remainingOnPage > 0) {
      el.style.marginTop = `${remainingOnPage + 8}px`;
      cumulativeOffset += remainingOnPage + 8;
    }
  });

  // -----------------------------------------------------------
  // PASS 5: Signature block — always push to fresh page area
  //         if less than 200px remaining
  // -----------------------------------------------------------
  container.querySelectorAll('.signature-grid, .signature-section').forEach((sig) => {
    const el = sig as HTMLElement;
    const topInContainer = getTop(el);
    const positionOnPage = topInContainer % usablePageHeightPx;
    const remainingOnPage = usablePageHeightPx - positionOnPage;

    if (remainingOnPage < 200 && remainingOnPage > 0) {
      el.style.marginTop = `${remainingOnPage + 12}px`;
      cumulativeOffset += remainingOnPage + 12;
    }
  });
};

// ============================================
// BUILDUNION PDF HEADER & FOOTER SNIPPETS
// ============================================
export const buildUnionPdfHeader = (opts: {
  docType: string;
  contractorName?: string;
  contractorPhone?: string;
  contractorEmail?: string;
  contractorWebsite?: string;
  docNumber?: string;
  dateStr?: string;
}) => {
  const date = opts.dateStr || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `
    <div class="bu-pdf-header pdf-section" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2.5px solid #f59e0b;">
      <div>
        <div style="font-size:28px;font-weight:300;letter-spacing:-0.5px;line-height:1.1;">
          <span style="color:#1f2937;">Build</span><span style="color:#f59e0b;font-weight:700;">Union</span>
        </div>
        ${opts.contractorName ? `<div style="font-size:13px;color:#4b5563;margin-top:4px;font-weight:500;">${escapeHtml(opts.contractorName)}</div>` : ''}
        <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${escapeHtml(opts.docType)}</div>
      </div>
      <div style="text-align:right;font-size:12px;color:#4b5563;">
        ${opts.docNumber ? `<div style="font-weight:600;color:#1f2937;">#${escapeHtml(opts.docNumber)}</div>` : ''}
        <div>${date}</div>
        ${opts.contractorPhone ? `<div style="margin-top:2px;">${escapeHtml(opts.contractorPhone)}</div>` : ''}
        ${opts.contractorEmail ? `<div style="color:#6b7280;font-size:11px;">${escapeHtml(opts.contractorEmail)}</div>` : ''}
        ${opts.contractorWebsite ? `<div style="color:#6b7280;font-size:10px;">${escapeHtml(opts.contractorWebsite)}</div>` : ''}
      </div>
    </div>
  `;
};

export const buildUnionPdfFooter = (opts: {
  contractorName?: string;
  docNumber?: string;
  dateStr?: string;
}) => {
  const date = opts.dateStr || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  return `
    <div class="bu-pdf-footer pdf-section" style="margin-top:36px;padding-top:14px;border-top:1.5px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#9ca3af;font-family:system-ui,sans-serif;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:13px;font-weight:300;"><span style="color:#374151;">Build</span><span style="color:#f59e0b;font-weight:700;">Union</span></span>
        ${opts.contractorName ? `<span style="color:#6b7280;">· ${escapeHtml(opts.contractorName)}</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        ${opts.docNumber ? `<span>${escapeHtml(opts.docNumber)}</span>` : ''}
        <span>${date}</span>
        <span style="background:#f3f4f6;padding:2px 8px;border-radius:3px;font-size:9px;">Licensed & Insured</span>
      </div>
    </div>
  `;
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
  container.style.background = '#ffffff';
  container.style.color = '#1a1a1a';
  // Force consistent font rendering
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  (container.style as any).webkitFontSmoothing = 'antialiased';
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

    // Wait for fonts/images to settle
    await new Promise(r => setTimeout(r, 100));

    // Adjust sections to avoid page-break splits
    adjustForPageBreaks(container, 800, usablePageHeightPx);

    // Wait for layout reflow after adjustments
    await new Promise(r => setTimeout(r, 50));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: false,
      removeContainer: false,
      windowWidth: 800,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: options.pageFormat || 'a4'
    });

    // Slice the canvas into individual page-sized chunks to prevent overlap
    const scaledPageHeightPx = usablePageHeightPx * 2; // html2canvas scale=2
    const totalCanvasHeight = canvas.height;
    const canvasWidth = canvas.width;
    let pageIndex = 0;

    // Safety limit to prevent infinite loops
    const maxPages = 50;

    while (pageIndex * scaledPageHeightPx < totalCanvasHeight && pageIndex < maxPages) {
      if (pageIndex > 0) pdf.addPage();

      const sourceY = pageIndex * scaledPageHeightPx;
      const sourceH = Math.min(scaledPageHeightPx, totalCanvasHeight - sourceY);

      // Skip empty trailing slices
      if (sourceH < 10) break;

      // Create a temporary canvas for this page slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvasWidth;
      pageCanvas.height = sourceH;
      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, sourceH);
        ctx.drawImage(canvas, 0, sourceY, canvasWidth, sourceH, 0, 0, canvasWidth, sourceH);
      }

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
      const sliceHeightMm = (sourceH / canvasWidth) * usableWidth;

      pdf.addImage(pageImgData, 'JPEG', margin, margin, usableWidth, sliceHeightMm);
      pageIndex++;
    }

    return pdf.output('blob');
  } finally {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
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
        * { box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 32px 40px; font-size: 14px; }
        .pdf-section { break-inside: avoid; page-break-inside: avoid; }
        .section { margin-bottom: 24px; break-inside: avoid; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; padding: 12px; text-align: left; }
      </style>
    </head>
    <body>
      ${buildUnionPdfHeader({
        docType: 'Project Quote',
        companyName: companyName || undefined,
        contractorName: companyName || undefined,
        docNumber: quoteNumber,
      } as any)}
      
      <div class="section pdf-section">
        <h3 style="margin: 0 0 12px 0;">Client Information</h3>
        <p style="margin: 4px 0;"><strong>Name:</strong> ${escapeHtml(clientInfo.name)}</p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${escapeHtml(clientInfo.email)}</p>
        <p style="margin: 4px 0;"><strong>Phone:</strong> ${escapeHtml(clientInfo.phone)}</p>
        <p style="margin: 4px 0;"><strong>Address:</strong> ${escapeHtml(clientInfo.address)}</p>
      </div>
      
      <div class="section pdf-section">
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
      
      <div class="pdf-section" style="text-align: right; margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px;">
        <p style="margin: 4px 0;"><strong>Subtotal:</strong> ${formatCurrency(materialTotal)}</p>
        <p style="margin: 8px 0; font-size: 20px;"><strong>Total:</strong> ${formatCurrency(grandTotal)}</p>
      </div>
      
      ${notes ? `
        <div class="section pdf-section" style="margin-top: 24px;">
          <h3 style="margin: 0 0 12px 0;">Notes</h3>
          <p style="color: #64748b;">${escapeHtml(notes)}</p>
        </div>
      ` : ''}
      
      ${buildUnionPdfFooter({
        contractorName: companyName || undefined,
        docNumber: `Quote #${quoteNumber}`,
      })}
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
  contractorLicense?: string;
  contractorHstNumber?: string;
  contractorLogo?: string;
  clientName?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  scopeOfWork?: string;
  totalAmount?: number;
  depositPercentage?: number;
  warrantyPeriod?: string;
  paymentSchedule?: string;
  additionalTerms?: string;
}

const CONTRACT_TYPE_CONFIG: Record<string, {
  title: string;
  color: string;
  accent: string;
  icon: string;
  defaultWarranty: string;
  defaultPayment: string;
  legalPreamble: string;
  disputeResolution: string;
  cancellationPolicy: string;
  liabilityClause: string;
}> = {
  residential: {
    title: 'Residential Construction Contract',
    color: '#059669',
    accent: '#d1fae5',
    icon: '🏠',
    defaultWarranty: '1 year from the date of substantial completion',
    defaultPayment: '50% upon execution of this Agreement, 50% upon substantial completion',
    legalPreamble: 'This Residential Construction Contract ("Agreement") is entered into and made effective as of the date set forth below, by and between the parties identified herein. This Agreement shall govern all construction, renovation, and related services to be performed at the residential property specified.',
    disputeResolution: 'Any dispute arising under this Agreement shall first be submitted to mediation. If mediation fails, the dispute shall be resolved by binding arbitration in accordance with the rules of the applicable jurisdiction.',
    cancellationPolicy: 'Either party may terminate this Agreement with 14 days written notice. Upon termination, the Client shall pay for all work completed and materials ordered to date.',
    liabilityClause: 'The Contractor shall maintain comprehensive general liability insurance with a minimum coverage of $2,000,000 and shall provide proof of Workers\' Compensation (WSIB) coverage upon request.',
  },
  commercial: {
    title: 'Commercial Construction Agreement',
    color: '#0284c7',
    accent: '#dbeafe',
    icon: '🏢',
    defaultWarranty: '2 years from the date of substantial completion',
    defaultPayment: '30% upon execution, 40% at midpoint milestone, 30% upon substantial completion',
    legalPreamble: 'This Commercial Construction Agreement ("Agreement") is entered into by and between the parties listed below. This Agreement governs all construction, fit-out, and related professional services to be performed at the commercial property described herein, in accordance with all applicable building codes, zoning regulations, and occupational safety standards.',
    disputeResolution: 'Disputes shall be resolved through binding arbitration under the jurisdiction of the project location. Each party shall bear its own legal costs unless otherwise determined by the arbitrator.',
    cancellationPolicy: 'Termination requires 30 days written notice. A termination fee of 15% of remaining contract value applies. All completed work and ordered materials shall be paid in full.',
    liabilityClause: 'The Contractor shall maintain comprehensive general liability insurance ($5,000,000 minimum), professional liability insurance, and Workers\' Compensation coverage. Certificates of insurance shall be provided prior to commencement.',
  },
  industrial: {
    title: 'Industrial Construction Contract',
    color: '#7c3aed',
    accent: '#ede9fe',
    icon: '🏭',
    defaultWarranty: '3 years from the date of substantial completion, with extended structural warranty of 10 years',
    defaultPayment: '25% upon execution, 25% at Phase 1 completion, 25% at Phase 2 completion, 25% upon final acceptance',
    legalPreamble: 'This Industrial Construction Contract ("Agreement") is entered into between the parties below for the construction, installation, and commissioning of industrial facilities as described herein. All work shall comply with applicable environmental regulations, industrial safety standards (OSHA/OHS), and relevant building codes.',
    disputeResolution: 'All disputes shall be resolved through binding arbitration. The arbitration shall be conducted by a panel of three arbitrators with industry expertise. Interim measures may be sought from courts of competent jurisdiction.',
    cancellationPolicy: 'Termination requires 60 days written notice. A termination fee of 20% of remaining contract value applies, plus demobilization costs. Force majeure events are excluded.',
    liabilityClause: 'The Contractor shall maintain comprehensive general liability ($10,000,000 minimum), professional liability, pollution liability, and Workers\' Compensation coverage. All subcontractors must carry equivalent coverage.',
  },
  renovation: {
    title: 'Renovation & Remodeling Contract',
    color: '#ea580c',
    accent: '#ffedd5',
    icon: '🔨',
    defaultWarranty: '6 months on workmanship, manufacturer warranty on materials',
    defaultPayment: '50% upon execution of this Agreement, 50% upon completion and client walkthrough',
    legalPreamble: 'This Renovation Contract ("Agreement") is entered into between the parties below for the renovation, remodeling, and improvement of the existing property described herein. The Contractor agrees to perform all work in a professional manner consistent with industry standards.',
    disputeResolution: 'Any dispute shall first be addressed through direct negotiation between the parties. If unresolved within 15 days, the dispute shall proceed to mediation, then binding arbitration if necessary.',
    cancellationPolicy: 'Either party may terminate with 7 days written notice. Upon termination, the Client shall pay for all completed work, materials on-site, and non-refundable orders.',
    liabilityClause: 'The Contractor shall maintain general liability insurance ($2,000,000 minimum) and Workers\' Compensation coverage throughout the project duration.',
  },
};

const formatContractDate = (dateStr: string): string => {
  if (!dateStr || dateStr === 'Not set') return '________________';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
};

export const buildContractHTML = (data: ContractTemplateData): string => {
  const config = CONTRACT_TYPE_CONFIG[data.contractType] || CONTRACT_TYPE_CONFIG.residential;
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formattedStart = formatContractDate(data.startDate);
  const formattedEnd = formatContractDate(data.endDate);
  const totalFormatted = data.totalAmount ? `$${data.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '________________';
  const depositPct = data.depositPercentage || 50;
  const depositAmt = data.totalAmount ? `$${((data.totalAmount * depositPct) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '________________';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 0; size: letter; }
        * { box-sizing: border-box; }
        body { 
          font-family: 'Georgia', 'Times New Roman', serif; 
          color: #1a1a1a; 
          line-height: 1.65; 
          max-width: 780px;
          margin: 0 auto;
          padding: 48px 40px;
          font-size: 13px;
        }
        .pdf-section { break-inside: avoid; page-break-inside: avoid; }
        
        /* Header */
        .contract-header {
          text-align: center;
          margin-bottom: 36px;
          padding-bottom: 20px;
          border-bottom: 3px double ${config.color};
        }
        .contract-header .type-badge {
          display: inline-block;
          background: ${config.color};
          color: white;
          padding: 5px 18px;
          border-radius: 3px;
          font-size: 10px;
          font-family: system-ui, sans-serif;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .contract-header h1 {
          font-size: 26px;
          font-weight: 700;
          color: ${config.color};
          margin: 8px 0 4px;
          letter-spacing: -0.3px;
        }
        .contract-header .contract-meta {
          font-size: 11px;
          color: #666;
          font-family: system-ui, sans-serif;
        }

        /* Preamble */
        .preamble {
          margin-bottom: 28px;
          padding: 20px 24px;
          background: ${config.accent};
          border-left: 4px solid ${config.color};
          border-radius: 0 6px 6px 0;
          font-style: italic;
          font-size: 12.5px;
          color: #333;
        }

        /* Section styling */
        .section {
          margin-bottom: 22px;
          break-inside: avoid;
        }
        .section-title {
          font-size: 13px;
          font-weight: 700;
          color: ${config.color};
          text-transform: uppercase;
          letter-spacing: 1.2px;
          margin-bottom: 14px;
          padding-bottom: 6px;
          border-bottom: 1.5px solid ${config.color}40;
          font-family: system-ui, sans-serif;
        }
        .section-number {
          display: inline-block;
          background: ${config.color};
          color: white;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          text-align: center;
          line-height: 22px;
          font-size: 11px;
          margin-right: 8px;
          font-weight: 700;
        }

        /* Data grid */
        .data-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .data-field { margin-bottom: 6px; }
        .data-label {
          font-size: 9.5px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-family: system-ui, sans-serif;
          margin-bottom: 2px;
        }
        .data-value {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
        }

        /* Parties */
        .parties-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .party-box {
          padding: 16px 18px;
          border: 1.5px solid #e0e0e0;
          border-radius: 6px;
          background: #fafafa;
        }
        .party-box h4 {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: ${config.color};
          margin: 0 0 12px 0;
          font-family: system-ui, sans-serif;
        }
        .party-field {
          margin-bottom: 8px;
          font-size: 12px;
        }
        .party-field strong {
          display: block;
          font-size: 9px;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 400;
          font-family: system-ui, sans-serif;
        }

        /* Financial */
        .financial-highlight {
          padding: 18px 20px;
          background: linear-gradient(135deg, ${config.accent}, white);
          border: 2px solid ${config.color}30;
          border-radius: 8px;
          margin-bottom: 22px;
        }
        .total-amount {
          font-size: 28px;
          font-weight: 700;
          color: ${config.color};
          font-family: system-ui, sans-serif;
        }

        /* Terms */
        .terms-content {
          font-size: 12px;
          color: #333;
        }
        .terms-content p {
          margin: 6px 0;
          text-align: justify;
        }
        .clause {
          margin-bottom: 14px;
        }
        .clause-title {
          font-weight: 700;
          font-size: 12px;
          color: #1a1a1a;
          margin-bottom: 3px;
        }

        /* Scope */
        .scope-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .scope-list li {
          padding: 6px 0 6px 20px;
          position: relative;
          font-size: 12.5px;
        }
        .scope-list li::before {
          content: '■';
          position: absolute;
          left: 0;
          color: ${config.color};
          font-size: 8px;
          top: 9px;
        }

        /* Signatures */
        .signature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 44px;
          padding-top: 28px;
          border-top: 2px solid #e0e0e0;
          break-inside: avoid;
        }
        .signature-block {
          text-align: center;
        }
        .signature-area {
          height: 80px;
          border: 1.5px dashed #ccc;
          border-radius: 6px;
          margin-bottom: 8px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 8px;
        }
        .signature-area .placeholder {
          font-size: 10px;
          color: #bbb;
          font-family: system-ui, sans-serif;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .sig-line {
          border-bottom: 1.5px solid #1a1a1a;
          width: 100%;
          margin-bottom: 6px;
        }
        .sig-label {
          font-size: 10px;
          color: #888;
          font-family: system-ui, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sig-name {
          font-size: 13px;
          font-weight: 600;
          margin-top: 4px;
        }
        .sig-date {
          margin-top: 16px;
        }

        /* Footer */
        .contract-footer {
          margin-top: 36px;
          padding-top: 14px;
          border-top: 1.5px solid #e0e0e0;
          text-align: center;
          font-size: 10px;
          color: #aaa;
          font-family: system-ui, sans-serif;
        }
        .contract-footer .legal-note {
          font-size: 9px;
          font-style: italic;
          margin-top: 4px;
        }
        .page-number {
          position: fixed;
          bottom: 20px;
          right: 40px;
          font-size: 9px;
          color: #ccc;
          font-family: system-ui, sans-serif;
        }
      </style>
    </head>
    <body>
      <!-- BUILDUNION HEADER -->
      ${buildUnionPdfHeader({
        docType: config.title,
        contractorName: data.contractorName,
        contractorPhone: data.contractorPhone,
        contractorEmail: data.contractorEmail,
        docNumber: data.contractNumber,
      })}

      <!-- CONTRACT TYPE BADGE -->
      <div class="contract-header pdf-section" style="border-bottom:none;margin-bottom:16px;padding-bottom:8px;">
        ${data.contractorLogo ? `<img src="${data.contractorLogo}" alt="Logo" style="max-height: 48px; margin-bottom: 8px;" />` : ''}
        <div class="type-badge">${config.icon} ${escapeHtml(data.contractType)}</div>
        <h1>${config.title}</h1>
        <div class="contract-meta">
          Contract No. <strong>${escapeHtml(data.contractNumber)}</strong> &nbsp;&bull;&nbsp; 
          Issued: ${currentDate}
        </div>
      </div>

      <!-- PREAMBLE -->
      <div class="preamble pdf-section">
        ${config.legalPreamble}
      </div>

      <!-- SECTION 1: PARTIES -->
      <div class="section pdf-section">
        <div class="section-title"><span class="section-number">1</span>Parties to this Agreement</div>
        <div class="parties-grid">
          <div class="party-box">
            <h4>Contractor</h4>
            <div class="party-field"><strong>Company / Name</strong>${escapeHtml(data.contractorName || '________________________________')}</div>
            <div class="party-field"><strong>Address</strong>${escapeHtml(data.contractorAddress || '________________________________')}</div>
            <div class="party-field"><strong>Phone</strong>${escapeHtml(data.contractorPhone || '________________________________')}</div>
            <div class="party-field"><strong>Email</strong>${escapeHtml(data.contractorEmail || '________________________________')}</div>
            ${data.contractorLicense ? `<div class="party-field"><strong>License No.</strong>${escapeHtml(data.contractorLicense)}</div>` : ''}
            ${data.contractorHstNumber ? `<div class="party-field"><strong>HST Reg. No.</strong>${escapeHtml(data.contractorHstNumber)}</div>` : ''}
          </div>
          <div class="party-box">
            <h4>Client (Owner)</h4>
            <div class="party-field"><strong>Full Name</strong>${escapeHtml(data.clientName || '________________________________')}</div>
            <div class="party-field"><strong>Address</strong>${escapeHtml(data.clientAddress || '________________________________')}</div>
            <div class="party-field"><strong>Phone</strong>${escapeHtml(data.clientPhone || '________________________________')}</div>
            <div class="party-field"><strong>Email</strong>${escapeHtml(data.clientEmail || '________________________________')}</div>
          </div>
        </div>
      </div>

      <!-- SECTION 2: PROJECT DETAILS -->
      <div class="section pdf-section">
        <div class="section-title"><span class="section-number">2</span>Project Description</div>
        <div class="data-grid">
          <div class="data-field">
            <div class="data-label">Project Name</div>
            <div class="data-value">${escapeHtml(data.projectName)}</div>
          </div>
          <div class="data-field">
            <div class="data-label">Trade / Service Type</div>
            <div class="data-value">${escapeHtml(data.trade)}</div>
          </div>
          <div class="data-field">
            <div class="data-label">Project Address</div>
            <div class="data-value">${escapeHtml(data.projectAddress)}</div>
          </div>
          <div class="data-field">
            <div class="data-label">Gross Floor Area</div>
            <div class="data-value">${data.gfa > 0 ? data.gfa.toLocaleString() : '____'} ${escapeHtml(data.gfaUnit)}</div>
          </div>
        </div>
      </div>

      <!-- SECTION 3: TIMELINE -->
      <div class="section pdf-section">
        <div class="section-title"><span class="section-number">3</span>Project Timeline</div>
        <div class="data-grid">
          <div class="data-field">
            <div class="data-label">Commencement Date</div>
            <div class="data-value">${formattedStart}</div>
          </div>
          <div class="data-field">
            <div class="data-label">Expected Completion Date</div>
            <div class="data-value">${formattedEnd}</div>
          </div>
          <div class="data-field">
            <div class="data-label">Project Team Size</div>
            <div class="data-value">${data.teamSize} member${data.teamSize !== 1 ? 's' : ''}</div>
          </div>
          <div class="data-field">
            <div class="data-label">Scheduled Work Items</div>
            <div class="data-value">${data.taskCount} task${data.taskCount !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="terms-content" style="margin-top: 12px;">
          <p>The Contractor shall commence work on or before the Commencement Date and shall use reasonable efforts to achieve substantial completion by the Expected Completion Date, subject to delays caused by force majeure, change orders, or conditions beyond the Contractor's control.</p>
        </div>
      </div>

      <!-- SECTION 4: SCOPE OF WORK -->
      <div class="section pdf-section">
        <div class="section-title"><span class="section-number">4</span>Scope of Work</div>
        <div class="terms-content">
          ${data.scopeOfWork ? `<p>${escapeHtml(data.scopeOfWork)}</p>` : `
            <p>The Contractor agrees to furnish all labor, materials, equipment, and supervision necessary to complete the following:</p>
            <ul class="scope-list">
              <li>Complete all ${escapeHtml(data.trade)} work as specified at the project address listed above</li>
              <li>Provide all necessary materials conforming to industry standards and applicable building codes</li>
              <li>Obtain all required permits and inspections as mandated by local authorities</li>
              <li>Maintain a clean and safe work environment throughout the project duration</li>
              <li>Deliver work that meets or exceeds the Ontario Building Code (OBC) 2024 standards</li>
              <li>Provide progress reports and coordinate with the Client on all material decisions</li>
              <li>Complete a final walkthrough with the Client upon substantial completion</li>
            </ul>
          `}
        </div>
      </div>

      <!-- SECTION 5: FINANCIAL TERMS -->
      <div class="section pdf-section">
        <div class="section-title"><span class="section-number">5</span>Contract Value & Payment Terms</div>
        ${data.totalAmount ? `
          <div class="financial-highlight">
            <div class="data-grid">
              <div class="data-field">
                <div class="data-label">Total Contract Value</div>
                <div class="total-amount">${totalFormatted}</div>
              </div>
              <div class="data-field">
                <div class="data-label">Required Deposit (${depositPct}%)</div>
                <div class="data-value" style="font-size: 18px; color: ${config.color};">${depositAmt}</div>
              </div>
            </div>
          </div>
        ` : `
          <div class="data-field" style="margin-bottom: 14px;">
            <div class="data-label">Total Contract Value</div>
            <div class="data-value" style="font-size: 20px;">$________________</div>
          </div>
        `}
        <div class="terms-content">
          <div class="clause">
            <div class="clause-title">Payment Schedule</div>
            <p>${escapeHtml(data.paymentSchedule || config.defaultPayment)}</p>
          </div>
          <div class="clause">
            <div class="clause-title">Late Payment</div>
            <p>Payments not received within 15 days of the due date shall bear interest at a rate of 1.5% per month (18% per annum) on the outstanding balance. The Contractor reserves the right to suspend work if payment is more than 30 days overdue.</p>
          </div>
          <div class="clause">
            <div class="clause-title">Additional Work / Change Orders</div>
            <p>Any work not described in Section 4 shall require a written Change Order signed by both parties before commencement. Change Orders may affect the Contract Value and timeline.</p>
          </div>
        </div>
      </div>

      <!-- SECTION 6: WARRANTY -->
      <div class="section pdf-section">
        <div class="section-title"><span class="section-number">6</span>Warranty</div>
        <div class="terms-content">
          <p>The Contractor warrants all workmanship for a period of <strong>${escapeHtml(data.warrantyPeriod || config.defaultWarranty)}</strong>. This warranty covers defects in workmanship and materials supplied by the Contractor. The warranty does not cover damage resulting from misuse, neglect, or normal wear and tear. Manufacturer warranties on materials and equipment shall be passed through to the Client.</p>
        </div>
      </div>

      <!-- SECTION 7: INSURANCE & LIABILITY -->
      <div class="section pdf-section">
        <div class="section-title"><span class="section-number">7</span>Insurance & Liability</div>
        <div class="terms-content">
          <p>${config.liabilityClause}</p>
          <p>The Contractor shall indemnify and hold harmless the Client from any claims, damages, or liabilities arising from the Contractor's work, except those caused by the Client's own negligence or willful misconduct.</p>
        </div>
      </div>

      <!-- SECTION 8: DISPUTE RESOLUTION -->
      <div class="section pdf-section">
        <div class="section-title"><span class="section-number">8</span>Dispute Resolution</div>
        <div class="terms-content">
          <p>${config.disputeResolution}</p>
        </div>
      </div>

      <!-- SECTION 9: TERMINATION -->
      <div class="section pdf-section">
        <div class="section-title"><span class="section-number">9</span>Termination</div>
        <div class="terms-content">
          <p>${config.cancellationPolicy}</p>
        </div>
      </div>

      <!-- SECTION 10: GENERAL PROVISIONS -->
      <div class="section pdf-section">
        <div class="section-title"><span class="section-number">10</span>General Provisions</div>
        <div class="terms-content">
          <div class="clause">
            <div class="clause-title">Entire Agreement</div>
            <p>This Agreement, including any attached schedules and Change Orders, constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, and agreements.</p>
          </div>
          <div class="clause">
            <div class="clause-title">Governing Law</div>
            <p>This Agreement shall be governed by and construed in accordance with the laws of the province/state in which the project is located.</p>
          </div>
          <div class="clause">
            <div class="clause-title">Permits & Compliance</div>
            <p>The Contractor shall obtain all necessary permits and ensure all work complies with applicable building codes, safety regulations, and environmental standards.</p>
          </div>
          ${data.additionalTerms ? `
            <div class="clause">
              <div class="clause-title">Additional Terms</div>
              <p>${escapeHtml(data.additionalTerms)}</p>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- SIGNATURES -->
      <div class="signature-grid pdf-section">
        <div class="signature-block">
          <div class="signature-area">
            <span class="placeholder">Contractor Signature</span>
          </div>
          <div class="sig-line"></div>
          <div class="sig-label">Authorized Signature &mdash; Contractor</div>
          <div class="sig-name">${escapeHtml(data.contractorName || '________________________________')}</div>
          ${data.contractorHstNumber ? `<div style="font-size:10px;color:#666;margin-top:4px;font-family:system-ui,sans-serif;">HST Reg. No.: ${escapeHtml(data.contractorHstNumber)}</div>` : ''}
          <div class="sig-date">
            <div class="sig-line" style="margin-top: 20px;"></div>
            <div class="sig-label">Date</div>
          </div>
        </div>
        <div class="signature-block">
          <div class="signature-area">
            <span class="placeholder">Client Signature</span>
          </div>
          <div class="sig-line"></div>
          <div class="sig-label">Authorized Signature &mdash; Client (Owner)</div>
          <div class="sig-name">${escapeHtml(data.clientName || '________________________________')}</div>
          <div class="sig-date">
            <div class="sig-line" style="margin-top: 20px;"></div>
            <div class="sig-label">Date</div>
          </div>
        </div>
      </div>

      <!-- BUILDUNION FOOTER -->
      ${buildUnionPdfFooter({
        contractorName: data.contractorName,
        docNumber: `Contract #${data.contractNumber}`,
      })}
      <div style="text-align:center;font-size:9px;color:#aaa;font-style:italic;margin-top:8px;font-family:system-ui,sans-serif;">
        This document is intended for use as a construction contract. Both parties acknowledge they have read, understood, and agree to be bound by the terms set forth herein. Independent legal counsel is recommended.
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
