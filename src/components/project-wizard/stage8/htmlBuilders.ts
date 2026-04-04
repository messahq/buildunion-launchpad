// ============================================
// STAGE 8: HTML Template Builders for PDF Export
// Extracted from Stage8FinalReview.tsx for modularity
// ============================================

import type { Citation } from "@/types/citation";

// XSS prevention: escape all user-controlled data before injecting into HTML templates
const esc = (v: unknown): string => {
  if (v == null) return '';
  return String(v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]!);
};

// ============================================
// MESSA AUDIT REPORT HTML BUILDER
// ============================================
interface MessaHtmlContext {
  citations: Citation[];
  tasks: Array<{ status: string; phase?: string; [k: string]: any }>;
}

export function buildMessaSynthesisHTML(data: any, ctx: MessaHtmlContext): string {
  const { citations, tasks } = ctx;
  const gemini = data.engines?.gemini?.analysis || {};
  const openai = data.engines?.openai?.analysis || {};
  const snapshot = data.projectSnapshot || {};
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const shortDate = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
  
  // Calculate data sources count and operational readiness
  const dataSources = data.citationCount || 0;
  const verifiedSources = Math.min(dataSources, Math.floor(dataSources * ((gemini.healthScore || 50) / 100)));
  const operationalReadiness = gemini.healthScore || 38;
  // DEMOLITION BONUS: Treat demolition work as extra effort, not a penalty
  const hasDemoWork = citations.some(c => c.cite_type === 'DEMOLITION_PRICE') || citations.find(c => c.cite_type === 'SITE_CONDITION')?.answer === 'demolition';
  const demoTasksInReport = tasks.filter(t => (t as any).phase === 'demolition');
  const demoCompletedInReport = demoTasksInReport.filter(t => t.status === 'completed' || t.status === 'done').length;
  const demoBonusReport = hasDemoWork && demoTasksInReport.length > 0
    ? Math.round((demoCompletedInReport / demoTasksInReport.length) * 12)
    : hasDemoWork ? 6 : 0;
  const adjustedReadiness = Math.min(operationalReadiness + demoBonusReport, 100);
  // STRICT: Never trust AI grade blindly — cap based on task progress
  const taskProg = snapshot.taskProgress || {};
  const taskDonePct = (taskProg.total || 0) > 0 ? Math.round(((taskProg.completed || 0) / taskProg.total) * 100) : 0;
  let healthGrade: string;
  if ((taskProg.total || 0) > 0 && taskDonePct < 50) {
    healthGrade = 'INCOMPLETE';
  } else if ((taskProg.total || 0) > 0 && taskDonePct < 80) {
    healthGrade = adjustedReadiness >= 50 ? 'PARTIAL' : 'INCOMPLETE';
  } else {
    healthGrade = gemini.healthGrade || (adjustedReadiness >= 80 ? 'COMPLETE' : adjustedReadiness >= 50 ? 'PARTIAL' : 'INCOMPLETE');
  }
  const auditVerdict = adjustedReadiness >= 70 ? 'PASS' : 'FAIL';
  const riskClass = openai?.riskLevel || (adjustedReadiness >= 70 ? 'LOW' : adjustedReadiness >= 40 ? 'MEDIUM' : 'CRITICAL');
  
  // Build workflow status matrix
  const workflowItems = [
    { source: 'Tasks', status: snapshot.taskProgress?.total > 0 ? 'Active' : 'Missing', updated: currentDate, notes: `${snapshot.taskProgress?.completed || 0}/${snapshot.taskProgress?.total || 0} tasks; ${snapshot.taskProgress?.percent || 0}% complete` },
    { source: 'Documents', status: snapshot.documents > 0 ? 'Available' : 'Missing', updated: snapshot.documents > 0 ? currentDate : 'N/A', notes: `${snapshot.documents || 0} files uploaded` },
    { source: 'Contracts', status: snapshot.contracts ? 'Active' : 'Missing', updated: snapshot.contracts ? currentDate : 'N/A', notes: snapshot.contracts ? 'Contract generated' : 'No contracts; legal risk maximum' },
    { source: 'Team', status: snapshot.teamSize > 1 ? 'Active' : 'Partial', updated: currentDate, notes: `${snapshot.teamSize || 1} member(s) assigned` },
    { source: 'Timeline', status: snapshot.timeline?.startDate ? 'Set' : 'Missing', updated: currentDate, notes: snapshot.timeline?.startDate ? `${snapshot.timeline.startDate} - ${snapshot.timeline.endDate || 'TBD'}` : 'Dates not configured' },
    { source: 'Budget', status: snapshot.budget?.total > 0 ? 'Set' : 'Missing', updated: currentDate, notes: `$${(snapshot.budget?.total || 0).toLocaleString()} CAD total` },
    { source: 'Site Map', status: snapshot.address ? 'Available' : 'Missing', updated: currentDate, notes: snapshot.address || 'Location not set' },
  ];

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
    background: #ffffff; 
    color: #1f2937; 
    padding: 0;
    font-size: 13px;
    line-height: 1.5;
  }
  
  /* ✓ PAGINATION CONTROL: Prevent mid-block page breaks */
  .section, .pillar-section, table, .summary-table, .pillars-grid, 
  .rec-list, .conclusion-box, .audit-header {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  @media print {
    .section { break-inside: avoid; page-break-inside: avoid; }
    table { break-inside: avoid; page-break-inside: avoid; }
  }
  
  /* Header */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 24px 32px;
    border-bottom: 1px solid #e5e7eb;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .header-date {
    font-size: 12px;
    color: #6b7280;
  }
  .header-right {
    text-align: right;
  }
  .project-title {
    font-size: 18px;
    font-weight: 700;
    color: #1f2937;
  }
  .project-location {
    font-size: 12px;
    color: #6b7280;
  }
  .data-sources {
    display: inline-block;
    margin-top: 8px;
    padding: 4px 12px;
    background: #f3f4f6;
    border-radius: 12px;
    font-size: 11px;
    color: #4b5563;
  }
  
  /* Main Content */
  .content {
    padding: 24px 32px;
    max-width: 900px;
  }
  
  /* Audit Header */
  .audit-header {
    text-align: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid #1f2937;
  }
  .audit-icon { font-size: 24px; margin-bottom: 8px; }
  .audit-title {
    font-size: 20px;
    font-weight: 800;
    color: #1f2937;
    letter-spacing: 1px;
  }
  .audit-meta {
    font-size: 12px;
    color: #6b7280;
    margin-top: 8px;
  }
  .classification {
    display: inline-block;
    margin-top: 8px;
    padding: 4px 16px;
    background: ${healthGrade === 'COMPLETE' ? '#dcfce7' : healthGrade === 'PARTIAL' ? '#fef3c7' : '#fee2e2'};
    color: ${healthGrade === 'COMPLETE' ? '#166534' : healthGrade === 'PARTIAL' ? '#92400e' : '#991b1b'};
    border-radius: 4px;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 1px;
  }
  
  /* Section Headers */
  .section-header {
    font-size: 14px;
    font-weight: 700;
    color: #1f2937;
    margin: 28px 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
  }
  .section-number {
    color: #6b7280;
    font-weight: 400;
  }
  
  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }
  th, td {
    padding: 10px 12px;
    text-align: left;
    border: 1px solid #e5e7eb;
    font-size: 12px;
  }
  th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
  }
  td { color: #4b5563; }
  
  .status-available, .status-set, .status-active { color: #166534; font-weight: 600; }
  .status-partial { color: #92400e; font-weight: 600; }
  .status-missing { color: #991b1b; font-weight: 600; }
  
  /* Summary Table */
  .summary-table td:first-child { font-weight: 500; color: #374151; width: 40%; }
  .summary-table td:last-child { font-weight: 600; }
  
  /* Pillar Boxes */
  .pillars-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }
  .pillar-section {
    margin-bottom: 16px;
  }
  .pillar-title {
    font-size: 12px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pillar-icon { font-size: 14px; }
  .pillar-list {
    list-style: none;
    padding-left: 24px;
  }
  .pillar-list li {
    padding: 6px 0;
    font-size: 12px;
    color: #4b5563;
    border-bottom: 1px solid #f3f4f6;
  }
  .pillar-list li:last-child { border-bottom: none; }
  .pillar-list strong { color: #1f2937; }
  
  /* Risk Matrix */
  .risk-matrix th:first-child { width: 25%; }
  .risk-matrix .severity-critical { color: #dc2626; font-weight: 700; }
  .risk-matrix .severity-high { color: #ea580c; font-weight: 700; }
  .risk-matrix .severity-medium { color: #ca8a04; font-weight: 700; }
  .risk-matrix .severity-low { color: #16a34a; font-weight: 700; }
  
  /* Recommendations */
  .rec-list {
    list-style: none;
  }
  .rec-list li {
    padding: 10px 0;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    gap: 12px;
  }
  .rec-list li:last-child { border-bottom: none; }
  .rec-number {
    width: 24px;
    height: 24px;
    background: #1f2937;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .rec-text { font-size: 12px; color: #374151; line-height: 1.6; }
  
  /* Conclusion */
  .conclusion-box {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 20px;
    margin: 24px 0;
    text-align: center;
  }
  .verdict {
    font-size: 18px;
    font-weight: 800;
    color: ${auditVerdict === 'PASS' ? '#166534' : '#991b1b'};
    margin-bottom: 8px;
  }
  .confidence {
    font-size: 13px;
    color: #6b7280;
  }
  
  /* Footer */
  .footer {
    margin-top: 32px;
    padding: 16px 32px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    color: #9ca3af;
  }
  .footer-brand {
    font-weight: 700;
    color: #f59e0b;
  }
  .synthesis-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: #1f2937;
    color: #e5e7eb;
    border-radius: 4px;
    font-size: 9px;
  }
</style>
</head>
<body>
<!-- Page Header -->
<div class="page-header">
  <div class="header-left">
    <div class="header-date">${shortDate}</div>
  </div>
  <div class="header-right">
    <div class="project-title">🏗️ ${esc(snapshot.name) || 'Project'}</div>
    <div class="project-location">${esc(snapshot.address?.split(',')[0]) || 'Location'}</div>
    <div class="data-sources">Generated: ${esc(currentDate)} • Data Sources: ${dataSources}</div>
  </div>
</div>

<div class="content">
  <!-- Audit Report Header -->
  <div class="audit-header">
    <div class="audit-icon">🔬</div>
    <div class="audit-title">M.E.S.S.A. AUDIT REPORT</div>
    <div class="audit-meta">
      Project: ${esc(snapshot.name) || 'N/A'}<br/>
      Audit Date: ${currentDate} (Current Real-Time Audit)<br/>
      <span class="classification">Classification: ${healthGrade}</span>
    </div>
  </div>
  
  <!-- 1. EXECUTIVE AUDIT SUMMARY -->
  <div class="section-header"><span class="section-number">1.</span> EXECUTIVE AUDIT SUMMARY</div>
  <table class="summary-table">
    <tr><td>Data Completeness</td><td>${verifiedSources}/${dataSources} sources verified</td></tr>
    <tr><td>Operational Readiness</td><td>${operationalReadiness}%</td></tr>
    <tr><td>Risk Classification</td><td>${riskClass}</td></tr>
    <tr><td>Audit Verdict</td><td>${auditVerdict}</td></tr>
  </table>
  <p style="font-size: 12px; color: #4b5563; line-height: 1.7; margin-bottom: 20px;">
    <strong>Summary Statement:</strong><br/>
    ${esc(gemini.executiveSummary) || `Project "${esc(snapshot.name)}" is currently in a ${healthGrade.toLowerCase()} state. ${operationalReadiness < 50 ? 'Critical data gaps identified in financial and documentation areas require immediate attention.' : 'Core project parameters established with minor gaps to address.'}`}
  </p>
  
  <!-- 2. OPERATIONAL TRUTH VERIFICATION -->
  <div class="section-header"><span class="section-number">2.</span> OPERATIONAL TRUTH VERIFICATION (8 Pillars)</div>
  
  <div class="pillar-section">
    <div class="pillar-title"><span class="pillar-icon">✅</span> Confirmed Data Points</div>
    <ul class="pillar-list">
      <li><strong>Pillar 1:</strong> Confirmed Area: ${(snapshot.gfa || 0).toLocaleString()} sq ft ${snapshot.gfa ? '(Verified via Citation)' : '(Not set)'}</li>
      <li><strong>Pillar 2:</strong> Materials Count: ${gemini.verificationStatus?.documentsReviewed || 0} items verified</li>
      <li><strong>Pillar 6:</strong> Project Mode: ${snapshot.teamSize > 1 ? 'TEAM' : 'SOLO'} (${snapshot.teamSize} member${snapshot.teamSize > 1 ? 's' : ''})</li>
      <li><strong>Pillar 7:</strong> Project Size: ${snapshot.gfa >= 1000 ? 'LARGE' : snapshot.gfa >= 500 ? 'MEDIUM' : 'SMALL'} (AI Classification based on ${(snapshot.gfa || 0).toLocaleString()} sq ft scope)</li>
    </ul>
  </div>
  
  <div class="pillar-section">
    <div class="pillar-title"><span class="pillar-icon">⚠️</span> Pending Verification</div>
    <ul class="pillar-list">
      <li><strong>Pillar 8:</strong> AI Confidence: Reported as "${gemini.healthScore >= 70 ? 'High' : gemini.healthScore >= 40 ? 'Medium' : 'Low'}," ${gemini.verificationStatus?.completeness || 0}% verification on performance benchmarks</li>
    </ul>
  </div>
  
  <div class="pillar-section">
    <div class="pillar-title"><span class="pillar-icon">❌</span> Missing/Conflicting Data</div>
    <ul class="pillar-list">
      ${(gemini.verificationStatus?.gapsIdentified || ['Blueprint documentation incomplete', 'OBC alignment pending', 'Conflict detection requires review']).map((gap: string) => `<li>${esc(gap)}</li>`).join('')}
    </ul>
  </div>
  
  <!-- 3. WORKFLOW STATUS MATRIX -->
  <div class="section-header"><span class="section-number">3.</span> WORKFLOW STATUS MATRIX</div>
  <table>
    <thead>
      <tr>
        <th>Data Source</th>
        <th>Status</th>
        <th>Last Updated</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
       ${workflowItems.map(item => `
         <tr>
           <td>${esc(item.source)}</td>
           <td class="status-${item.status.toLowerCase()}">${esc(item.status)}</td>
           <td>${esc(item.updated)}</td>
           <td>${esc(item.notes)}</td>
         </tr>
       `).join('')}
    </tbody>
  </table>
  
  <!-- 4. STRUCTURAL ANALYSIS -->
  <div class="section-header"><span class="section-number">4.</span> STRUCTURAL ANALYSIS</div>
  <p style="font-size: 12px; color: #374151; margin-bottom: 12px;"><strong>4.1 Area & Material Assessment</strong></p>
  <ul class="pillar-list" style="padding-left: 0; margin-bottom: 16px;">
    <li>Confirmed Area: ${(snapshot.gfa || 0).toLocaleString()} sq ft (${snapshot.gfa ? 'High' : 'Low'} Confidence)</li>
    <li>Material Budget: $${(snapshot.budget?.materials || 0).toLocaleString()} CAD</li>
    <li>Labor Budget: $${(snapshot.budget?.labor || 0).toLocaleString()} CAD</li>
    <li>Cost per sq ft: $${(snapshot.budget?.perSqFt != null && !isNaN(snapshot.budget.perSqFt) && isFinite(snapshot.budget.perSqFt)) ? snapshot.budget.perSqFt.toFixed(2) : '0.00'} CAD</li>
  </ul>
  
  ${gemini.visualAnalysis && gemini.visualAnalysis.imagesAnalyzed > 0 ? `
  <!-- 4.2 FILES & CONTRACTS ANALYSIS (AI Vision) -->
  <p style="font-size: 12px; color: #374151; margin: 16px 0 8px 0;"><strong>4.2 Files & Contracts Analysis</strong> <span style="background: #06b6d4; color: white; font-size: 9px; padding: 2px 8px; border-radius: 10px; font-weight: 700;">🔍 AI VISION — ${gemini.visualAnalysis.imagesAnalyzed} images analyzed</span></p>
  
  ${(gemini.visualAnalysis.blueprintFindings || []).length > 0 ? `
  <p style="font-size: 11px; color: #0891b2; font-weight: 700; margin: 12px 0 6px 0;">📐 Blueprint Analysis</p>
  <table>
    <thead>
      <tr><th>File</th><th>Type</th><th>Dimensions</th><th>Key Observations</th></tr>
    </thead>
    <tbody>
      ${(gemini.visualAnalysis.blueprintFindings || []).map((bp: any) => `
         <tr>
           <td style="font-weight: 600;">${esc(bp.fileName) || 'Blueprint'}</td>
           <td>${esc(bp.type) || 'Drawing'}</td>
           <td>${esc(bp.dimensions) || '—'}</td>
           <td>${(bp.observations || []).slice(0, 3).map((o: string) => esc(o)).join('; ') || 'No observations'}</td>
         </tr>
      `).join('')}
    </tbody>
  </table>
  ${(gemini.visualAnalysis.blueprintFindings || []).some((bp: any) => (bp.codeFlags || []).length > 0) ? `
  <p style="font-size: 11px; color: #dc2626; font-weight: 600; margin: 8px 0 4px 0;">⚠️ Code Flags from Blueprint Review:</p>
  <ul class="pillar-list" style="padding-left: 16px;">
    ${(gemini.visualAnalysis.blueprintFindings || []).flatMap((bp: any) => (bp.codeFlags || []).map((flag: string) => `<li style="color: #dc2626;">${esc(flag)}</li>`)).join('')}
  </ul>
  ` : ''}
  ` : ''}
  
  ${(gemini.visualAnalysis.sitePhotoFindings || []).length > 0 ? `
  <p style="font-size: 11px; color: #0891b2; font-weight: 700; margin: 12px 0 6px 0;">📷 Site Photo Analysis</p>
  <table>
    <thead>
      <tr><th>Photo</th><th>Stage</th><th>Trades Visible</th><th>Quality</th><th>Observations</th></tr>
    </thead>
    <tbody>
      ${(gemini.visualAnalysis.sitePhotoFindings || []).map((photo: any) => `
        <tr>
           <td style="font-weight: 600;">${esc(photo.fileName) || 'Photo'}</td>
           <td>${esc(photo.stage) || '—'}</td>
           <td>${(photo.tradesVisible || []).map((t: string) => esc(t)).join(', ') || '—'}</td>
           <td><span style="font-weight: 700; color: ${(photo.qualityScore || 0) >= 70 ? '#16a34a' : (photo.qualityScore || 0) >= 40 ? '#ca8a04' : '#dc2626'};">${photo.qualityScore || 0}/100</span></td>
           <td>${(photo.observations || []).slice(0, 2).map((o: string) => esc(o)).join('; ') || 'No observations'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ${(gemini.visualAnalysis.sitePhotoFindings || []).some((p: any) => (p.safetyIssues || []).length > 0) ? `
  <p style="font-size: 11px; color: #dc2626; font-weight: 600; margin: 8px 0 4px 0;">🚨 Safety Issues Detected in Photos:</p>
  <ul class="pillar-list" style="padding-left: 16px;">
    ${(gemini.visualAnalysis.sitePhotoFindings || []).flatMap((p: any) => (p.safetyIssues || []).map((issue: string) => `<li style="color: #dc2626;">${esc(issue)}</li>`)).join('')}
  </ul>
  ` : ''}
  ` : ''}
  
  <table style="margin-top: 12px;">
    <tr><td style="width: 40%; font-weight: 600;">Overall Visual Score</td><td style="font-weight: 700; color: ${(gemini.visualAnalysis.overallVisualScore || 0) >= 70 ? '#16a34a' : '#ca8a04'};">${gemini.visualAnalysis.overallVisualScore || 0}/100</td></tr>
    <tr><td style="font-weight: 600;">Images Analyzed</td><td>${gemini.visualAnalysis.imagesAnalyzed} files (${(data.engines?.gemini?.imageFileNames || []).map((n: string) => esc(n)).join(', ') || 'N/A'})</td></tr>
  </table>
  
  ${(gemini.visualAnalysis.criticalVisualFlags || []).length > 0 ? `
  <p style="font-size: 11px; color: #dc2626; font-weight: 700; margin: 12px 0 4px 0;">🔴 Critical Visual Flags:</p>
  <ul class="pillar-list" style="padding-left: 16px;">
    ${(gemini.visualAnalysis.criticalVisualFlags || []).map((flag: string) => `<li style="color: #dc2626; font-weight: 600;">${esc(flag)}</li>`).join('')}
  </ul>
  ` : ''}
  ` : `
  <div class="pdf-section" style="margin: 16px 0; padding: 12px; background: #fefce8; border: 1px solid #fde68a; border-radius: 8px;">
    <p style="font-size: 12px; color: #92400e; font-weight: 600;">📂 Unresolved Visual Evidence</p>
    <p style="font-size: 11px; color: #78350f; margin-top: 4px;">
      ${(data.projectSnapshot?.documents || 0) > 0 
        ? `${data.projectSnapshot.documents} file(s) found in project storage but AI visual analysis could not process them. Upload image files (.jpg, .png) for Files & Contracts analysis.`
        : 'No project images uploaded yet. Upload blueprints and site photos to the Documents panel to enable Files & Contracts.'
      }
    </p>
  </div>
  `}
  
  ${data.dualEngineUsed && openai ? `
  <!-- 5. REGULATORY ALIGNMENT -->
  <div class="section-header"><span class="section-number">5.</span> REGULATORY ALIGNMENT (${data.region?.toUpperCase() || 'Ontario'} Building Code)</div>
  <table>
    <tr><td style="width: 30%;"><strong>OBC Status</strong></td><td>${openai.codeCompliance?.structural?.status || 'REQUIRES REVIEW'}</td></tr>
    <tr><td><strong>Risk Level</strong></td><td>${openai.riskLevel || 'MEDIUM'}</td></tr>
    <tr><td><strong>Alignment Score</strong></td><td>${openai.complianceScore || '—'}%</td></tr>
  </table>
  
  ${openai.codeCompliance ? `
  <p style="font-size: 12px; color: #374151; margin: 16px 0 8px 0;"><strong>Alignment Notes:</strong></p>
  <ul class="pillar-list" style="padding-left: 16px;">
     <li><strong>Structural:</strong> ${esc(openai.codeCompliance.structural?.notes) || 'Review required'}</li>
     <li><strong>Fire Safety:</strong> ${esc(openai.codeCompliance.fireSafety?.notes) || 'Review required'}</li>
     <li><strong>Accessibility:</strong> ${esc(openai.codeCompliance.accessibility?.notes) || 'Review required'}</li>
  </ul>
  ` : ''}
  ` : ''}
  
  <!-- 6. CONFLICT DETECTION LOG -->
  <div class="section-header"><span class="section-number">6.</span> CONFLICT DETECTION LOG</div>
  <p style="font-size: 12px; color: #374151; margin-bottom: 12px;"><strong>Data Consistency Check:</strong></p>
  <ul class="pillar-list" style="padding-left: 0;">
    ${(gemini.progressAnalysis?.criticalItems || [
      snapshot.budget?.total === 0 ? 'FINANCIAL CONFLICT: Budget set to $0.00 CAD' : null,
      snapshot.teamSize === 1 ? 'RESOURCE CONFLICT: Only 1 team member assigned' : null,
      !snapshot.timeline?.startDate ? 'TIMELINE CONFLICT: Project dates not configured' : null,
    ]).filter(Boolean).map((item: string, i: number) => `<li><strong>${i + 1}.</strong> ${esc(item)}</li>`).join('') || '<li>No critical conflicts detected</li>'}
  </ul>
  
  <!-- 7. RISK ASSESSMENT MATRIX -->
  <div class="section-header"><span class="section-number">7.</span> RISK ASSESSMENT MATRIX</div>
  <table class="risk-matrix">
    <thead>
      <tr>
        <th>Risk Factor</th>
        <th>Severity</th>
        <th>Impact</th>
        <th>Mitigation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Budget Accuracy</td>
        <td class="${snapshot.budget?.total > 0 ? 'severity-low' : 'severity-critical'}">${snapshot.budget?.total > 0 ? 'LOW' : 'CRITICAL'}</td>
        <td>${snapshot.budget?.total > 0 ? 'Budget established' : 'Project insolvency risk'}</td>
        <td>${snapshot.budget?.total > 0 ? 'Monitor spending' : 'Populate line-item costs'}</td>
      </tr>
      <tr>
        <td>Legal Liability</td>
        <td class="${snapshot.contracts ? 'severity-low' : 'severity-high'}">${snapshot.contracts ? 'LOW' : 'HIGH'}</td>
        <td>${snapshot.contracts ? 'Contract active' : 'No signed contract'}</td>
        <td>${snapshot.contracts ? 'Maintain documentation' : 'Generate and sign contract'}</td>
      </tr>
      <tr>
        <td>Schedule Adherence</td>
        <td class="${snapshot.timeline?.startDate ? 'severity-medium' : 'severity-high'}">${snapshot.timeline?.startDate ? 'MEDIUM' : 'HIGH'}</td>
        <td>${snapshot.timeline?.startDate ? 'Timeline configured' : 'No dates set'}</td>
        <td>${snapshot.timeline?.startDate ? 'Monitor milestones' : 'Set project timeline'}</td>
      </tr>
    </tbody>
  </table>
  
  <!-- 8. ACTIONABLE RECOMMENDATIONS -->
  <div class="section-header"><span class="section-number">8.</span> ACTIONABLE RECOMMENDATIONS</div>
  <ol class="rec-list">
    ${(gemini.recommendations || [
      'Complete project documentation and upload all relevant files',
      'Configure team structure and assign roles',
      'Set project timeline with start and end dates',
      'Generate and send client contract for signature',
      'Review and confirm material/labor budgets',
    ]).slice(0, 5).map((rec: string, i: number) => `
      <li>
        <span class="rec-number">${i + 1}</span>
        <span class="rec-text">${esc(rec)}</span>
      </li>
    `).join('')}
  </ol>
  
  <!-- AUDIT CONCLUSION -->
  <div class="section-header"><span class="section-number">9.</span> AUDIT CONCLUSION</div>
  <div class="conclusion-box">
    <div class="verdict">Final Verdict: ${auditVerdict} / ${healthGrade}</div>
    <div class="confidence">Confidence Level: ${operationalReadiness}% (Based on ${verifiedSources} verified data sources)</div>
    <div class="confidence" style="margin-top: 8px;">Next Audit Recommended: Upon completion of missing data entries or at 50% task completion</div>
  </div>
  
  <p style="text-align: center; font-size: 11px; color: #6b7280; margin-top: 24px;">
    <strong>M.E.S.S.A. Audit Report</strong> generated by BuildUnion AI Engine<br/>
    Report Classification: Engineering-Grade Project Intelligence
  </p>
</div>

<!-- Footer -->
<div class="footer">
  <div>
    <span class="footer-brand">M.E.S.S.A.</span> • ${data.synthesisVersion || 'v3.0'}
  </div>
  <div class="synthesis-badge">
    ${data.dualEngineUsed ? '⚡ Dual Engine' : 'Single Engine'} • ${data.synthesisId?.slice(0, 12) || 'MESSA'}
  </div>
  <div>
    Generated with BuildUnion AI • ${currentDate}
  </div>
</div>
</body>
</html>`;
}


// ============================================
// PROJECT SUMMARY HTML BUILDER
// ============================================
export interface SummaryHtmlContext {
  projectData: { name?: string; address?: string; [k: string]: any } | null;
  financialSummary: { total_cost?: number; material_cost?: number; labor_cost?: number; [k: string]: any } | null;
  citations: Citation[];
  teamMembers: any[];
  tasks: any[];
  documents: any[];
  contracts: any[];
}

export interface SummaryHtmlParams {
  pillars: Array<{
    id: number;
    name: string;
    icon: string;
    color: string;
    status: string;
    items: Array<{ label: string; value: string; ok: boolean }>;
  }>;
  pillarComplete: number;
  pillarTotal: number;
  operationalReadiness: number;
  readinessGrade: string;
  gfaValue: number;
  grossArea: number;
  wastePercent: number;
  address: string;
  trade: string;
  workType: string;
  executionMode: string;
  siteCondition: string;
  hasDemolition: boolean;
  startDate: string;
  endDate: string;
  weatherHtml: string;
  obcHtml: string;
  aiHtml: string;
}

export function buildSummaryHTML(ctx: SummaryHtmlContext, params: SummaryHtmlParams): string {
  const {
    projectData, financialSummary, citations, teamMembers, tasks, documents,
  } = ctx;
  const {
    pillars, pillarComplete, pillarTotal, operationalReadiness, readinessGrade,
    gfaValue, grossArea, wastePercent, address, trade, workType, executionMode,
    siteCondition, hasDemolition, startDate, endDate, weatherHtml, obcHtml, aiHtml,
  } = params;

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const shortDate = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          background: #ffffff; 
          color: #1f2937; 
          padding: 0;
          font-size: 12px;
          line-height: 1.5;
        }
        
        /* ✓ PAGINATION CONTROL: Prevent content breaks mid-block */
        .section, .hero-card, .phase-card, .checkpoint-list, table, .weather-grid, 
        .alert-box, .recommendations, .stats-row, .stat-box, .conclusion-box, .pillar-card {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        @media print {
          .section { break-inside: avoid; page-break-inside: avoid; }
          table { break-inside: avoid; page-break-inside: avoid; }
          .summary-hero { break-inside: avoid; }
          .pillar-card { break-inside: avoid; page-break-inside: avoid; }
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px 28px;
          border-bottom: 2px solid #1f2937;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
        }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .brand { font-size: 22px; font-weight: 800; color: #1f2937; letter-spacing: -0.5px; }
        .header-date { font-size: 11px; color: #6b7280; }
        .header-right { text-align: right; }
        .doc-type { 
          display: inline-block;
          padding: 6px 16px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border-radius: 4px;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 1px;
        }
        .project-title { font-size: 16px; font-weight: 700; color: #1f2937; margin-top: 8px; }
        .project-location { font-size: 11px; color: #6b7280; }
        
        .content { padding: 20px 28px; }
        
        .summary-hero {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
          break-inside: avoid;
        }
        .hero-card {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 16px 12px;
          text-align: center;
          break-inside: avoid;
        }
        .hero-value { 
          font-size: 24px; 
          font-weight: 600; 
          color: #3b82f6;
          letter-spacing: -0.5px;
        }
        .hero-value.green { color: #059669; }
        .hero-value.amber { color: #d97706; }
        .hero-value.red { color: #dc2626; }
        .hero-label { font-size: 10px; color: #64748b; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.75px; font-weight: 500; }
        
        .readiness-bar {
          background: #e5e7eb;
          height: 12px;
          border-radius: 6px;
          overflow: hidden;
          margin: 16px 0;
        }
        .readiness-fill {
          height: 100%;
          background: linear-gradient(90deg, ${operationalReadiness >= 85 ? '#22c55e, #16a34a' : operationalReadiness >= 60 ? '#f59e0b, #d97706' : '#ef4444, #dc2626'});
          width: ${operationalReadiness}%;
          transition: width 0.3s;
        }
        .readiness-label {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #6b7280;
        }
        .readiness-grade {
          display: inline-block;
          padding: 4px 12px;
          background: ${readinessGrade === 'OPERATIONAL' ? '#dcfce7' : readinessGrade === 'PARTIAL' ? '#fef3c7' : '#fee2e2'};
          color: ${readinessGrade === 'OPERATIONAL' ? '#166534' : readinessGrade === 'PARTIAL' ? '#92400e' : '#991b1b'};
          border-radius: 4px;
          font-weight: 700;
          font-size: 10px;
          letter-spacing: 1px;
        }
        
        .section { margin-bottom: 20px; }
        .section-header {
          font-size: 13px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 1px solid #e5e7eb;
        }
        .section-number { color: #6b7280; font-weight: 400; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th, td { padding: 8px 10px; text-align: left; border: 1px solid #e5e7eb; font-size: 11px; }
        th { background: #f9fafb; font-weight: 600; color: #374151; }
        td { color: #4b5563; }
        
        .status-pass { color: #166534; background: #dcfce7; font-weight: 600; }
        .status-fail { color: #991b1b; background: #fee2e2; font-weight: 600; }
        .status-review { color: #92400e; background: #fef3c7; font-weight: 600; }
        .status-pending { color: #6b7280; font-style: italic; padding: 12px; background: #f3f4f6; border-radius: 6px; }
        .status-good { color: #166534; padding: 12px; background: #dcfce7; border-radius: 6px; margin-top: 8px; }
        
        .phase-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
        .phase-card { 
          background: #f8fafc; 
          border: 1px solid #e5e7eb; 
          border-radius: 6px; 
          padding: 12px; 
        }
        .phase-name { font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .phase-bar { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
        .phase-fill { height: 100%; background: #3b82f6; }
        .phase-percent { font-size: 10px; color: #6b7280; margin-top: 4px; text-align: right; }
        
        .checkpoint-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; break-inside: avoid; }
        .checkpoint { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          padding: 10px 12px; 
          background: linear-gradient(135deg, #fafafa, #f4f4f5); 
          border: 1px solid #e4e4e7; 
          border-radius: 6px;
          font-size: 11px;
          break-inside: avoid;
        }
        .checkpoint.done { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-color: #86efac; }
        .checkpoint-icon { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; }
        .checkpoint.done .checkpoint-icon { background: #22c55e; color: white; }
        .checkpoint:not(.done) .checkpoint-icon { background: #d4d4d8; color: #a1a1aa; }
        .checkpoint-priority { margin-left: auto; font-size: 9px; padding: 3px 8px; border-radius: 4px; font-weight: 500; }
        .checkpoint-priority.Critical { background: #fecaca; color: #b91c1c; }
        .checkpoint-priority.Required { background: #bfdbfe; color: #1e40af; }
        .checkpoint-priority.Important { background: #fde68a; color: #92400e; }
        .checkpoint-priority.Optional { background: #e4e4e7; color: #52525b; }
        
        .weather-grid { display: flex; gap: 16px; align-items: center; margin-bottom: 12px; }
        .weather-current { text-align: center; padding: 12px 20px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white; border-radius: 8px; }
        .weather-temp { font-size: 28px; font-weight: 700; }
        .weather-desc { font-size: 11px; opacity: 0.9; }
        .weather-details { font-size: 10px; margin-top: 6px; display: flex; gap: 12px; justify-content: center; }
        .forecast-mini { display: flex; gap: 8px; flex: 1; }
        .forecast-day { text-align: center; padding: 8px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; flex: 1; }
        .forecast-date { font-size: 10px; color: #6b7280; }
        .forecast-temps { font-size: 11px; font-weight: 600; color: #1f2937; }
        .forecast-alert { font-size: 10px; color: #dc2626; }
        
        .alert-box { padding: 14px 16px; border-radius: 8px; margin-top: 12px; break-inside: avoid; }
        .alert-box.warning { 
          background: linear-gradient(135deg, #fffbeb, #fef3c7); 
          border: 1px solid #fcd34d; 
          border-left: 4px solid #f59e0b;
          color: #92400e; 
        }
        .alert-box.warning strong { color: #b45309; }
        .alert-box.warning div { margin-top: 6px; padding-left: 20px; position: relative; }
        .alert-box.warning div::before { content: '⚠'; position: absolute; left: 0; }
        
        .dual-engine-status { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
        .engine-badge { padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
        .engine-badge.gemini { background: #dbeafe; color: #1e40af; }
        .engine-badge.openai { background: #dcfce7; color: #166534; }
        .engine-status { font-size: 11px; color: #6b7280; }
        .engine-status.active { color: #166534; font-weight: 600; }
        
        .recommendations { margin-top: 12px; padding: 12px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; }
        .recommendations ul { margin: 8px 0 0 16px; }
        .recommendations li { font-size: 11px; color: #1e40af; margin-bottom: 4px; }
        
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
        .stat-box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: 700; color: #3b82f6; }
        .stat-label { font-size: 10px; color: #6b7280; margin-top: 2px; }
        
        .footer { 
          text-align: center; 
          margin-top: 24px; 
          padding-top: 16px; 
          border-top: 1px solid #e5e7eb; 
          color: #9ca3af; 
          font-size: 10px; 
        }
        .footer-brand { font-weight: 700; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="page-header">
        <div class="header-left">
          <div>
            <div class="brand">BuildUnion</div>
            <div class="header-date">Generated: ${currentDate}</div>
          </div>
        </div>
        <div class="header-right">
          <div class="doc-type">PROJECT SUMMARY v3.0</div>
           <div class="project-title">${esc(projectData?.name) || 'Untitled Project'}</div>
           <div class="project-location">📍 ${esc(address.split(',').slice(0, 2).join(',')) || 'Location pending'}</div>
        </div>
      </div>
      
      <div class="content">
        <!-- Hero Stats -->
        <div class="summary-hero">
          <div class="hero-card">
            <div class="hero-value ${operationalReadiness >= 85 ? 'green' : operationalReadiness >= 60 ? 'amber' : 'red'}">${operationalReadiness}%</div>
            <div class="hero-label">Operational Readiness</div>
          </div>
          <div class="hero-card">
            <div class="hero-value">${gfaValue > 0 ? gfaValue.toLocaleString() : '—'}</div>
            <div class="hero-label">GFA (sq ft)</div>
          </div>
          <div class="hero-card">
            <div class="hero-value">${financialSummary?.total_cost ? '$' + Math.round(financialSummary.total_cost).toLocaleString() : '—'}</div>
            <div class="hero-label">Budget (CAD)</div>
          </div>
        </div>
        
        <div class="readiness-label">
          <span>Project Readiness</span>
          <span class="readiness-grade">${readinessGrade}</span>
        </div>
        <div class="readiness-bar">
          <div class="readiness-fill"></div>
        </div>
        
        <!-- Section 1: Project Overview -->
        <div class="section">
          <div class="section-header"><span class="section-number">1.</span> PROJECT OVERVIEW</div>
          <table>
            <tr><th width="30%">Field</th><th>Value</th></tr>
             <tr><td>Project Name</td><td><strong>${esc(projectData?.name) || 'Untitled'}</strong></td></tr>
             <tr><td>Location</td><td>${esc(address) || 'Not Set'}</td></tr>
             <tr><td>Work Type</td><td>${esc(workType)}</td></tr>
             <tr><td>Trade</td><td><strong>${esc(trade)}</strong></td></tr>
             <tr><td>Execution Mode</td><td>${esc(executionMode)}</td></tr>
             <tr><td>Site Condition</td><td>${esc(siteCondition)}${hasDemolition ? ' (Demolition Required)' : ''}</td></tr>
             <tr><td>Timeline</td><td>${startDate && endDate ? esc(startDate) + ' → ' + esc(endDate) : 'Not Set'}</td></tr>
          </table>
        </div>
        
        <!-- Section 2: 8-PILLAR OPERATIONAL STATUS (mirrors M.E.S.S.A.) -->
        <div class="section">
          <div class="section-header"><span class="section-number">2.</span> OPERATIONAL TRUTH VERIFICATION (8 Pillars) — ${pillarComplete}/${pillarTotal} Complete</div>
          
          ${pillars.map(p => {
            const statusColor = p.status === 'COMPLETE' || p.status === 'ACTIVE' ? '#166534' : p.status === 'PARTIAL' ? '#92400e' : p.status === 'N/A' ? '#6b7280' : '#991b1b';
            const statusBg = p.status === 'COMPLETE' || p.status === 'ACTIVE' ? '#dcfce7' : p.status === 'PARTIAL' ? '#fef3c7' : p.status === 'N/A' ? '#f3f4f6' : '#fee2e2';
            return `
            <div class="pillar-card pdf-section" style="border-left: 4px solid ${p.color}; background: #fafafa; border-radius: 6px; padding: 12px 16px; margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-size: 13px; font-weight: 700; color: #1f2937;">
                  ${p.icon} Pillar ${p.id}: ${p.name}
                </div>
                <span style="display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; background: ${statusBg}; color: ${statusColor};">
                  ${p.status}
                </span>
              </div>
              <table style="margin-bottom: 0;">
                <tr><th style="width: 35%;">Data Point</th><th>Value</th><th style="width: 15%; text-align: center;">Status</th></tr>
                 ${p.items.map(item => `
                   <tr>
                     <td>${esc(item.label)}</td>
                     <td><strong>${esc(item.value)}</strong></td>
                     <td style="text-align: center; color: ${item.ok ? '#166534' : '#991b1b'}; font-weight: 600;">${item.ok ? '✓' : '✗'}</td>
                   </tr>
                 `).join('')}
              </table>
            </div>
            `;
          }).join('')}
        </div>
        
        <!-- Section 4: Weather -->
        ${weatherHtml}
        
        <!-- Section 5: OBC Compliance -->
        ${obcHtml}
        
        <!-- Section 6: AI Analysis -->
        ${aiHtml}
        
        <!-- Section 7: Resource Summary -->
        <div class="section">
          <div class="section-header"><span class="section-number">6.</span> RESOURCE SUMMARY</div>
          <div class="stats-row">
            <div class="stat-box">
              <div class="stat-value">${citations.length}</div>
              <div class="stat-label">Citations</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${teamMembers.length}</div>
              <div class="stat-label">Team Members</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${tasks.length}</div>
              <div class="stat-label">Tasks</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${documents.length}</div>
              <div class="stat-label">Documents</div>
            </div>
          </div>
          ${gfaValue > 0 ? `
          <table>
            <tr><th>Metric</th><th>Value</th><th>Notes</th></tr>
            <tr><td>Net Floor Area</td><td>${gfaValue.toLocaleString()} sq ft</td><td>Locked GFA from wizard</td></tr>
            <tr><td>Gross Area (+${wastePercent}% waste)</td><td>${grossArea.toLocaleString()} sq ft</td><td>Material calculation basis</td></tr>
            <tr><td>Material Cost</td><td>${financialSummary?.material_cost ? '$' + financialSummary.material_cost.toLocaleString() : 'TBD'}</td><td>Based on template</td></tr>
            <tr><td>Labor Cost</td><td>${financialSummary?.labor_cost ? '$' + financialSummary.labor_cost.toLocaleString() : 'TBD'}</td><td>Team allocation</td></tr>
            <tr><td>Total Budget</td><td><strong>${financialSummary?.total_cost ? '$' + financialSummary.total_cost.toLocaleString() : 'TBD'}</strong></td><td>Including taxes</td></tr>
          </table>
          ` : '<div class="status-pending">GFA required for detailed financial breakdown</div>'}
        </div>
        
        <div class="footer">
          <div class="footer-brand">BuildUnion Project Management</div>
          <div>Dual AI Engine • OBC 2024 Compliant • Toronto, Ontario</div>
          <div>Report ID: SUM-${shortDate.replace(/\//g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================
// DNA REPORT HTML BUILDER
// Extracted from Stage8FinalReview.tsx for modularity
// ============================================

export interface DnaPillar {
  label: string;
  sub: string;
  icon: string;
  color: string;
  status: boolean;
  sources: { label: string; cit: Citation | undefined; field: string }[];
}

export interface DnaReportHtmlContext {
  pillars: DnaPillar[];
  passCount: number;
  pct: number;
  scoreColor: string;
  scoreLabel: string;
  projName: string;
  projAddr: string;
  projectId: string;

  // OBC
  obcSections: Array<{ section_number: string; section_title: string; content: string; relevance_score: number }>;
  obcDetailedResult: any;
  tradeCitAnswer: string;

  // Financial
  financialSummary: { material_cost: number | null; labor_cost: number | null; total_cost: number | null } | null;
  savedLineItems: any[];
  savedTemplateItems: any[];
  locationCitAnswer: string;
  demolitionCost: number;
  gfaValue: number;

  // Visual/Files
  photoCits: Citation[];
  blueprintCit: Citation | undefined;
  projectDocCount: number;
  aiAnalysisData: any;
  savedPhotoEstimate: any;

  // Site presence
  siteCheckins: Array<{ user_id: string; user_name: string; checked_in_at: string; checked_out_at: string | null; weather_snapshot: any }>;
  completedTasksByDay: Map<string, { title: string; assignee: string; status: string }[]>;
  allProjectTasks: Array<{ id: string; title: string; status: string; assigned_to: string; updated_at: string; due_date: string | null }>;

  // AI analysis
  geminiExecSummary: string;
  geminiRiskFactors: any[];
  openaiCompliance: any;

  // Tasks & docs
  tasks: Array<{ status: string; phase?: string; [k: string]: any }>;
  documents: Array<{ file_name: string; ai_analysis_status?: string | null; ai_analysis_result?: any }>;
  citations: Citation[];

  // Profile
  profile: { company_name?: string | null; phone?: string | null; company_website?: string | null };
  userEmail: string;
}

export async function buildDnaReportHTML(ctx: DnaReportHtmlContext): Promise<string> {
  const {
    pillars, passCount, pct, scoreColor, scoreLabel, projName, projAddr, projectId,
    obcSections, obcDetailedResult, tradeCitAnswer,
    financialSummary, savedLineItems, savedTemplateItems, locationCitAnswer, demolitionCost, gfaValue,
    photoCits, blueprintCit, projectDocCount, aiAnalysisData, savedPhotoEstimate,
    siteCheckins, completedTasksByDay, allProjectTasks,
    geminiExecSummary, geminiRiskFactors, openaiCompliance,
    tasks, documents, citations,
    profile, userEmail,
  } = ctx;

  // date-fns format
  const { format } = await import('date-fns');

  const buildSourceRow = (s: { label: string; cit: Citation | undefined; field: string }) => {
    const val = s.cit?.answer || (s.cit?.metadata as any)?.value || '—';
    const ts = s.cit?.timestamp ? new Date(s.cit.timestamp).toLocaleDateString() : '—';
    const citeId = s.cit?.id?.slice(0, 8) || '—';
    const statusColor = s.cit ? '#059669' : '#dc2626';
    const statusText = s.cit ? '✓ cite:' + citeId : '✗ Missing';
    const displayVal = typeof val === 'string' ? esc(val.slice(0, 55)) : esc(JSON.stringify(val).slice(0, 55));
    return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
      '<td style="padding:4px 8px;color:#6b7280;">' + esc(s.label) + '</td>' +
      '<td style="padding:4px 8px;font-family:monospace;font-size:10px;color:' + statusColor + ';">' + statusText + '</td>' +
      '<td style="padding:4px 8px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + displayVal + '</td>' +
      '<td style="padding:4px 8px;color:#9ca3af;font-size:10px;">' + ts + '</td>' +
    '</tr>';
  };

  // Build pillar HTML blocks
  const pillarRows = pillars.map(p => {
    const sourcesHtml = p.sources.map(buildSourceRow).join('');
    const bgHex = p.color + '12';
    const statusBg = p.status ? '#dcfce7' : '#fef2f2';
    const statusTxt = p.status ? '#166534' : '#991b1b';
    const statusLabel = p.status ? '✓ PASS' : '✗ FAIL';
    return '<div class="pdf-section" style="border:1px solid #e5e7eb;border-radius:6px;margin-bottom:8px;overflow:hidden;">' +
      '<div style="background:' + bgHex + ';padding:10px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #e5e7eb;">' +
        '<span style="font-size:18px;">' + p.icon + '</span>' +
        '<div style="flex:1;">' +
          '<div style="font-weight:600;font-size:13px;color:#1f2937;">' + esc(p.label) + '</div>' +
          '<div style="font-size:10px;color:#6b7280;">' + esc(p.sub) + '</div>' +
        '</div>' +
        '<span style="background:' + statusBg + ';color:' + statusTxt + ';padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;">' + statusLabel + '</span>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;">' +
        '<thead><tr style="background:#f9fafb;font-size:9px;text-transform:uppercase;color:#9ca3af;letter-spacing:0.05em;">' +
          '<th style="padding:4px 8px;text-align:left;">Source</th>' +
          '<th style="padding:4px 8px;text-align:left;">Citation</th>' +
          '<th style="padding:4px 8px;text-align:left;">Value</th>' +
          '<th style="padding:4px 8px;text-align:left;">Date</th>' +
        '</tr></thead>' +
        '<tbody>' + sourcesHtml + '</tbody>' +
      '</table>' +
    '</div>';
  }).join('');

  // ============================================
  // OBC 2024 COMPLIANCE SECTION
  // ============================================
  let obcHtml = '';
  if (obcSections.length > 0) {
    const obcRows = obcSections.slice(0, 10).map(s => {
      const relevance = Math.round((s.relevance_score || 0) * 100);
      const relColor = relevance >= 70 ? '#059669' : relevance >= 40 ? '#d97706' : '#6b7280';
      const contentPreview = esc((s.content || '').slice(0, 120));
      return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
        '<td style="padding:5px 8px;font-weight:600;color:#1e40af;white-space:nowrap;">§ ' + esc(s.section_number) + '</td>' +
        '<td style="padding:5px 8px;color:#374151;">' + esc(s.section_title) + '</td>' +
        '<td style="padding:5px 8px;color:#6b7280;font-size:10px;max-width:250px;overflow:hidden;text-overflow:ellipsis;">' + contentPreview + '</td>' +
        '<td style="padding:5px 8px;text-align:center;"><span style="color:' + relColor + ';font-weight:600;font-size:10px;">' + relevance + '%</span></td>' +
      '</tr>';
    }).join('');

    obcHtml = '<div class="pdf-section obc-card" style="margin-top:4px;margin-bottom:4px;">' +
      '<div class="section-header-block">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
          '<span style="font-size:14px;">⚖️</span>' +
          '<div style="font-size:12px;font-weight:700;color:#1e3a5f;">OBC 2024 Part 9 — Compliance Matrix</div>' +
        '</div>' +
        '<div style="font-size:10px;color:#6b7280;margin-bottom:4px;">Trade-specific regulatory requirements retrieved via RAG pipeline (' + esc(tradeCitAnswer || 'N/A') + ')</div>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
        '<thead><tr style="background:#eff6ff;font-size:9px;text-transform:uppercase;color:#3b82f6;letter-spacing:0.05em;">' +
          '<th style="padding:6px 8px;text-align:left;">Section</th>' +
          '<th style="padding:6px 8px;text-align:left;">Title</th>' +
          '<th style="padding:6px 8px;text-align:left;">Excerpt</th>' +
          '<th style="padding:6px 8px;text-align:center;">Relevance</th>' +
        '</tr></thead>' +
        '<tbody>' + obcRows + '</tbody>' +
      '</table>' +
    '</div>';
  }

  // ============================================
  // FILES & CONTRACTS SECTION
  // ============================================
  let visualHtml = '';

  // AI Visual Analysis — merge on-demand + saved DB data
  const savedVisual = (savedPhotoEstimate as any)?.visual_analysis;
  const savedGeminiFindings = savedVisual?.gemini_findings || {};
  const savedOpenaiFindings = savedVisual?.openai_findings || {};

  const geminiVisual = aiAnalysisData?.engines?.gemini?.analysis?.visualAnalysis
    || savedGeminiFindings?.visualAnalysis
    || null;
  const conflictAlerts = aiAnalysisData?.conflictAlerts
    || savedVisual?.conflict_alerts
    || [];
  const imagesAnalyzedCount = aiAnalysisData?.engines?.gemini?.imagesAnalyzed
    || savedVisual?.images_analyzed
    || 0;

  // Extract executive summary / risk assessment from AI engines
  const geminiRawAnalysis: string = typeof aiAnalysisData?.engines?.gemini?.analysis === 'string'
    ? aiAnalysisData.engines.gemini.analysis
    : '';
  const savedRawAnalysis: string = typeof savedGeminiFindings === 'string'
    ? savedGeminiFindings
    : (savedGeminiFindings?.executiveSummary || savedGeminiFindings?.rawAnalysis || savedGeminiFindings?.analysis || '');
  const geminiExecSummaryText: string = geminiRawAnalysis || savedRawAnalysis || geminiExecSummary || '';

  const openaiRawText: string = typeof aiAnalysisData?.engines?.openai?.analysis === 'string'
    ? aiAnalysisData.engines.openai.analysis
    : '';
  const openaiComplianceFinal: any = openaiRawText
    ? { rawValidation: openaiRawText, summary: openaiRawText }
    : (openaiCompliance || null);

  // Conflict Alerts Section
  let conflictHtml = '';
  if (conflictAlerts.length > 0) {
    const conflictRows = conflictAlerts.map((c: any) =>
      '<tr style="font-size:11px;border-bottom:1px solid #fecaca;">' +
        '<td style="padding:5px 8px;font-weight:700;color:#dc2626;">🔴 ' + (c.type || 'MISMATCH') + '</td>' +
        '<td style="padding:5px 8px;">' + (c.visual_value?.toLocaleString() || '?') + ' sq ft</td>' +
        '<td style="padding:5px 8px;">' + (c.db_value?.toLocaleString() || '?') + ' sq ft</td>' +
        '<td style="padding:5px 8px;font-weight:700;color:#dc2626;">+' + (c.deviation_pct || 0) + '%</td>' +
        '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">' + (c.source || 'AI Vision') + '</td>' +
      '</tr>'
    ).join('');

    conflictHtml = '<div class="pdf-section" style="margin-top:10px;margin-bottom:8px;border:2px solid #dc2626;border-radius:6px;overflow:hidden;">' +
      '<div style="background:#fef2f2;padding:10px 14px;border-bottom:1px solid #fecaca;">' +
        '<div style="font-size:14px;font-weight:700;color:#991b1b;">⚠️ CONFLICT DETECTED — Visual Evidence vs Database</div>' +
        '<div style="font-size:10px;color:#dc2626;margin-top:2px;">Automatic conflict detection by M.E.S.S.A. Files & Contracts Engine</div>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;">' +
        '<thead><tr style="background:#fff5f5;font-size:9px;text-transform:uppercase;color:#dc2626;letter-spacing:0.05em;">' +
          '<th style="padding:6px 8px;text-align:left;">Conflict</th>' +
          '<th style="padding:6px 8px;text-align:left;">Visual Value</th>' +
          '<th style="padding:6px 8px;text-align:left;">DB Value</th>' +
          '<th style="padding:6px 8px;text-align:left;">Deviation</th>' +
          '<th style="padding:6px 8px;text-align:left;">Source</th>' +
        '</tr></thead>' +
        '<tbody>' + conflictRows + '</tbody>' +
      '</table>' +
    '</div>';
  }

  // AI Vision findings
  let aiVisionHtml = '';
  if (geminiVisual && imagesAnalyzedCount > 0) {
    let bpRows = '';
    if ((geminiVisual.blueprintFindings || []).length > 0) {
      bpRows = '<p style="font-size:11px;color:#0891b2;font-weight:700;margin:12px 0 6px 0;">📐 Blueprint Analysis</p>' +
        '<table><thead><tr><th>File</th><th>Type</th><th>Dimensions</th><th>Key Observations</th></tr></thead><tbody>' +
        (geminiVisual.blueprintFindings || []).map((bp: any) =>
          '<tr><td style="font-weight:600;">' + esc(bp.fileName || 'Blueprint') + '</td>' +
          '<td>' + esc(bp.type || 'Drawing') + '</td>' +
          '<td>' + esc(bp.dimensions || '—') + '</td>' +
          '<td>' + esc((bp.observations || []).slice(0, 3).join('; ') || 'No observations') + '</td></tr>'
        ).join('') + '</tbody></table>';
    }

    let photoRows2 = '';
    if ((geminiVisual.sitePhotoFindings || []).length > 0) {
      photoRows2 = '<p style="font-size:11px;color:#0891b2;font-weight:700;margin:12px 0 6px 0;">📷 Site Photo Analysis</p>' +
        '<table><thead><tr><th>Photo</th><th>Stage</th><th>Trades</th><th>Quality</th><th>Observations</th></tr></thead><tbody>' +
        (geminiVisual.sitePhotoFindings || []).map((photo: any) =>
          '<tr><td style="font-weight:600;">' + esc(photo.fileName || 'Photo') + '</td>' +
          '<td>' + esc(photo.stage || '—') + '</td>' +
          '<td>' + esc((photo.tradesVisible || []).join(', ') || '—') + '</td>' +
          '<td><span style="font-weight:700;color:' + ((photo.qualityScore || 0) >= 70 ? '#16a34a' : '#ca8a04') + ';">' + (photo.qualityScore || 0) + '/100</span></td>' +
          '<td>' + esc((photo.observations || []).slice(0, 2).join('; ') || '—') + '</td></tr>'
        ).join('') + '</tbody></table>';
    }

    aiVisionHtml = '<div class="pdf-section" style="margin-top:8px;">' +
      '<p style="font-size:12px;color:#374151;margin-bottom:8px;"><strong>AI Files & Contracts Analysis</strong> <span style="background:#06b6d4;color:white;font-size:9px;padding:2px 8px;border-radius:10px;font-weight:700;">🔍 ' + imagesAnalyzedCount + ' images analyzed</span></p>' +
      bpRows + photoRows2 +
      '<table style="margin-top:8px;"><tr><td style="width:40%;font-weight:600;">Overall Visual Score</td><td style="font-weight:700;color:' + ((geminiVisual.overallVisualScore || 0) >= 70 ? '#16a34a' : '#ca8a04') + ';">' + (geminiVisual.overallVisualScore || 0) + '/100</td></tr></table>' +
    '</div>';
  } else if (projectDocCount > 0 && imagesAnalyzedCount === 0) {
    aiVisionHtml = '<div class="pdf-section" style="margin-top:8px;padding:10px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;">' +
      '<p style="font-size:12px;color:#92400e;font-weight:600;">📂 Unresolved Visual Evidence</p>' +
      '<p style="font-size:11px;color:#78350f;margin-top:4px;">' + projectDocCount + ' file(s) found in project documents but AI visual analysis could not process them.</p>' +
    '</div>';
  }

  if (photoCits.length > 0 || blueprintCit || projectDocCount > 0) {
    const geminiSiteFindings: any[] = geminiVisual?.sitePhotoFindings || [];
    const savedSiteFindings: any[] = (savedPhotoEstimate as any)?.engines?.gemini?.analysis?.visualAnalysis?.sitePhotoFindings
      || (savedPhotoEstimate as any)?.visualAnalysis?.sitePhotoFindings
      || (savedPhotoEstimate as any)?.sitePhotoFindings
      || [];
    const allSiteFindings = geminiSiteFindings.length > 0 ? geminiSiteFindings : savedSiteFindings;
    const savedAnalysisText: string = (savedPhotoEstimate as any)?.engines?.gemini?.analysis?.summary
      || (savedPhotoEstimate as any)?.analysis
      || (typeof savedPhotoEstimate === 'string' ? savedPhotoEstimate : '')
      || '';

    const photoRows = photoCits.slice(0, 8).map((pc, i) => {
      const ts = pc.timestamp ? new Date(pc.timestamp).toLocaleDateString() : '—';
      const cId = pc.id?.slice(0, 8) || '—';
      const desc = esc((pc.answer || '').slice(0, 80));
      const fileName = (pc.answer || '').toLowerCase();
      const matchedFinding = allSiteFindings.find((f: any) =>
        fileName.includes((f.fileName || '').toLowerCase().split('.')[0])
      ) || allSiteFindings[i];

      let aiVisionText = '';
      if (matchedFinding) {
        const obs = (matchedFinding.observations || []).slice(0, 2).join('; ');
        const stage = matchedFinding.stage || '';
        const trades = (matchedFinding.tradesVisible || []).join(', ');
        const quality = matchedFinding.qualityScore ? `Quality: ${matchedFinding.qualityScore}/100` : '';
        const parts = [obs, stage ? `Stage: ${stage}` : '', trades ? `Trades: ${trades}` : '', quality].filter(Boolean);
        aiVisionText = parts.join(' · ').slice(0, 160) || '✓ AI Analyzed';
      } else if (savedAnalysisText && i === 0) {
        aiVisionText = savedAnalysisText.slice(0, 160);
        if (savedAnalysisText.length > 160) aiVisionText += '...';
      } else {
        const meta = pc.metadata as any;
        aiVisionText = meta?.ai_analysis ? '✓ AI Analyzed' : '⏳ Pending';
      }

      return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
        '<td style="padding:5px 8px;color:#6b7280;">' + (pc.cite_type === 'VISUAL_VERIFICATION' ? '🔍 Verification' : '📷 Site Photo') + ' #' + (i + 1) + '</td>' +
        '<td style="padding:5px 8px;font-family:monospace;font-size:10px;color:#059669;">cite:' + cId + '</td>' +
        '<td style="padding:5px 8px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + desc + '</td>' +
        '<td style="padding:5px 8px;color:#7c3aed;font-size:10px;max-width:220px;line-height:1.4;word-wrap:break-word;white-space:normal;">' + esc(aiVisionText) + '</td>' +
        '<td style="padding:5px 8px;color:#9ca3af;font-size:10px;">' + ts + '</td>' +
      '</tr>';
    }).join('');

    visualHtml = '<div class="pdf-section visual-intel-card" style="margin-top:4px;margin-bottom:3px;">' +
      '<div class="section-header-block">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
          '<span style="font-size:13px;">👁️</span>' +
          '<div style="font-size:12px;font-weight:700;color:#1e3a5f;">Files & Contracts Audit</div>' +
        '</div>' +
        '<div style="font-size:10px;color:#6b7280;margin-bottom:4px;">' + photoCits.length + ' visual asset(s) captured · ' + (blueprintCit ? '1 blueprint uploaded' : 'No blueprint') + ' · ' + projectDocCount + ' document(s) in storage' + (imagesAnalyzedCount > 0 ? ' · <span style="color:#06b6d4;font-weight:600;">🔍 ' + imagesAnalyzedCount + ' AI-analyzed</span>' : '') + '</div>' +
      '</div>' +
      conflictHtml +
      (photoRows ? (
        '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
          '<thead><tr style="background:#f0fdf4;font-size:9px;text-transform:uppercase;color:#059669;letter-spacing:0.05em;">' +
            '<th style="padding:6px 8px;text-align:left;">Asset</th>' +
            '<th style="padding:6px 8px;text-align:left;">Citation</th>' +
            '<th style="padding:6px 8px;text-align:left;">Description</th>' +
            '<th style="padding:6px 8px;text-align:left;">AI Vision Analysis</th>' +
            '<th style="padding:6px 8px;text-align:left;">Date</th>' +
          '</tr></thead>' +
          '<tbody>' + photoRows + '</tbody>' +
        '</table>'
      ) : '') +
      aiVisionHtml +
    '</div>';
  }

  // ============================================
  // FINANCIAL SNAPSHOT (owner only)
  // ============================================
  let financialHtml = '';
  if (financialSummary && (financialSummary.total_cost ?? 0) > 0) {
    const fmt = (n: number | null) => n != null ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
    const allLiveItems = savedLineItems.length > 0 ? savedLineItems : savedTemplateItems;
    let materialCost = financialSummary.material_cost ?? 0;
    let laborCost = financialSummary.labor_cost ?? 0;

    if (allLiveItems.length > 0) {
      let liveMat = 0, liveLab = 0;
      for (const i of allLiveItems as any[]) {
        const t = (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0) || Number(i.total) || Number(i.totalPrice) || 0;
        const desc = (i.name || i.description || '').toLowerCase();
        if (desc.includes('demolition') || desc.includes('demo ') || desc.includes('removal')) continue;
        if (desc.includes('labor') || desc.includes('installation') || desc.includes('preparation') ||
            desc.includes('cleanup') || desc.includes('grinding') ||
            desc.includes('floor preparation') || desc.includes('prep work') || desc.includes('site prep')) {
          liveLab += t;
        } else {
          liveMat += t;
        }
      }
      if (liveMat + liveLab > 0) {
        materialCost = liveMat;
        laborCost = liveLab;
      }
    }

    const netTotal = materialCost + laborCost + demolitionCost;
    const locAnswer = (locationCitAnswer || '').toLowerCase();
    let taxLabel = 'HST';
    let taxRate = 0.13;
    if (locAnswer.includes('quebec') || locAnswer.includes('québec') || locAnswer.includes('qc')) {
      taxRate = 0.14975; taxLabel = 'GST+QST';
    } else if (locAnswer.includes('alberta') || locAnswer.includes('ab') || locAnswer.includes('northwest') || locAnswer.includes('yukon') || locAnswer.includes('nunavut')) {
      taxRate = 0.05; taxLabel = 'GST';
    } else if (locAnswer.includes('british columbia') || locAnswer.includes('bc')) {
      taxRate = 0.12; taxLabel = 'GST+PST';
    } else if (locAnswer.includes('saskatchewan') || locAnswer.includes('sk')) {
      taxRate = 0.11; taxLabel = 'GST+PST';
    } else if (locAnswer.includes('manitoba') || locAnswer.includes('mb')) {
      taxRate = 0.12; taxLabel = 'GST+PST';
    }

    const taxAmount = netTotal * taxRate;
    const computedGross = netTotal + taxAmount;
    const invoiceGrandTotal = financialSummary?.total_cost ? Number(financialSummary.total_cost) : 0;
    const grossTotal = invoiceGrandTotal > 0 ? invoiceGrandTotal : computedGross;
    const pillarsSum = materialCost + laborCost + demolitionCost;
    const budgetValue = financialSummary?.total_cost ? Number(financialSummary.total_cost) : pillarsSum;
    const taxSyncPass = pillarsSum <= budgetValue * 1.02;
    const syncStatusBg = taxSyncPass ? '#dcfce7' : '#fef2f2';
    const syncStatusColor = taxSyncPass ? '#166534' : '#991b1b';
    const syncStatusText = taxSyncPass ? '✓ PASS' : '✗ FAIL';

    financialHtml = '<div class="pdf-section financial-snapshot-card" style="margin-top:12px;margin-bottom:6px;">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">' +
        '<span style="font-size:14px;">💰</span>' +
        '<div style="font-size:13px;font-weight:700;color:#1e3a5f;">Financial Snapshot</div>' +
        '<span style="background:' + syncStatusBg + ';color:' + syncStatusColor + ';padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;margin-left:auto;">Sync Tax: ' + syncStatusText + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;">' +
        '<div class="pdf-section" style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px 10px;text-align:center;">' +
          '<div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Materials</div>' +
          '<div style="font-size:14px;font-weight:700;color:#059669;margin-top:2px;">' + fmt(materialCost) + '</div>' +
        '</div>' +
        '<div class="pdf-section" style="flex:1;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px 10px;text-align:center;">' +
          '<div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Labor</div>' +
          '<div style="font-size:14px;font-weight:700;color:#2563eb;margin-top:2px;">' + fmt(laborCost) + '</div>' +
        '</div>' +
        (demolitionCost > 0 ? (
        '<div class="pdf-section" style="flex:1;background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:8px 10px;text-align:center;">' +
          '<div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Demolition</div>' +
          '<div style="font-size:14px;font-weight:700;color:#b45309;margin-top:2px;">' + fmt(demolitionCost) + '</div>' +
        '</div>'
        ) : '') +
        '<div class="pdf-section" style="flex:1;background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:8px 10px;text-align:center;">' +
          '<div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Gross Total</div>' +
          '<div style="font-size:14px;font-weight:700;color:#d97706;margin-top:2px;">' + fmt(grossTotal) + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-top:8px;">' +
        '<div class="pdf-section" style="flex:1;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:6px;padding:8px 12px;text-align:center;">' +
          '<div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">' + taxLabel + ' (' + (taxRate * 100).toFixed(taxRate === 0.14975 ? 3 : 0) + '%)</div>' +
          '<div style="font-size:14px;font-weight:700;color:#7c3aed;margin-top:3px;">' + fmt(taxAmount) + '</div>' +
        '</div>' +
        '<div class="pdf-section" style="flex:2;background:linear-gradient(135deg,#064e3b,#065f46);border-radius:6px;padding:8px 12px;text-align:center;color:white;">' +
          '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.05em;opacity:0.8;">Gross Total (incl. tax)</div>' +
          '<div style="font-size:17px;font-weight:800;margin-top:3px;">' + fmt(grossTotal) + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-top:8px;padding:8px 12px;background:' + (taxSyncPass ? '#f0fdf4' : '#fef2f2') + ';border:1px solid ' + (taxSyncPass ? '#bbf7d0' : '#fecaca') + ';border-radius:6px;font-size:10px;color:' + (taxSyncPass ? '#166534' : '#991b1b') + ';">' +
        '🔄 <strong>Budget Sync:</strong> Actual Costs ' + fmt(pillarsSum) + ' vs Budget ' + fmt(budgetValue) + ' → ' + syncStatusText + ' <span style="opacity:0.7;">(Tax is informational only: ' + taxLabel + ' ' + fmt(taxAmount) + ')</span>' +
      '</div>' +
    '</div>';
  }

  // ============================================
  // SITE PRESENCE LOG SECTION
  // ============================================
  let sitePresenceHtml = '';
  if (siteCheckins.length > 0) {
    const checkinsByDay = new Map<string, any[]>();
    for (const c of siteCheckins) {
      const dayKey = format(new Date(c.checked_in_at), 'yyyy-MM-dd');
      if (!checkinsByDay.has(dayKey)) checkinsByDay.set(dayKey, []);
      checkinsByDay.get(dayKey)!.push(c);
    }

    const dueDateTasksByDay = new Map<string, any[]>();
    for (const t of allProjectTasks) {
      if (t.due_date) {
        const dueDay = format(new Date(t.due_date), 'yyyy-MM-dd');
        if (!dueDateTasksByDay.has(dueDay)) dueDateTasksByDay.set(dueDay, []);
        dueDateTasksByDay.get(dueDay)!.push(t);
      }
    }

    const checkinRows = siteCheckins.slice(0, 15).map((c: any) => {
      const inTime = new Date(c.checked_in_at);
      const outTime = c.checked_out_at ? new Date(c.checked_out_at) : null;
      const durationMs = (outTime || new Date()).getTime() - inTime.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const mins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      const weather = c.weather_snapshot || {};
      const weatherStr = weather.temp != null ? `${Math.round(weather.temp)}° ${weather.description || ''}` : '—';
      const statusBg = !c.checked_out_at ? '#dcfce7' : '#f9fafb';
      const statusColor = !c.checked_out_at ? '#166534' : '#6b7280';
      const statusText = !c.checked_out_at ? '● ACTIVE' : '✓ Completed';

      const checkinDay = format(inTime, 'yyyy-MM-dd');
      const dayTasks = completedTasksByDay.get(checkinDay) || [];
      const dueTasks = dueDateTasksByDay.get(checkinDay) || [];
      const missedTasks = dueTasks.filter(t => t.status !== 'completed' && t.status !== 'done');

      let taskSubRow = '';
      if (dayTasks.length > 0 || missedTasks.length > 0) {
        const taskItems = dayTasks.slice(0, 4).map(t =>
          '<span style="display:inline-block;background:#dcfce7;color:#166534;padding:1px 6px;border-radius:8px;font-size:8px;margin:1px 2px;">✓ ' + esc(t.title) + '</span>'
        ).join('');
        const missedItems = missedTasks.slice(0, 3).map(t =>
          '<span style="display:inline-block;background:#fef2f2;color:#991b1b;padding:1px 6px;border-radius:8px;font-size:8px;margin:1px 2px;">✗ ' + esc(t.title) + '</span>'
        ).join('');
        const overflowText = dayTasks.length > 4 ? '<span style="font-size:8px;color:#6b7280;"> +' + (dayTasks.length - 4) + ' more</span>' : '';
        taskSubRow = '<tr style="background:#f8fafc;"><td colspan="6" style="padding:2px 8px 4px 24px;border-bottom:1px solid #e5e7eb;">' +
          '<div style="font-size:8px;color:#374151;font-weight:600;margin-bottom:1px;">📋 Daily Tasks:</div>' +
          taskItems + overflowText + missedItems +
        '</td></tr>';
      } else {
        taskSubRow = '<tr style="background:#f8fafc;"><td colspan="6" style="padding:2px 8px 4px 24px;border-bottom:1px solid #e5e7eb;">' +
          '<span style="font-size:8px;color:#9ca3af;font-style:italic;">— No tasks completed this day</span>' +
        '</td></tr>';
      }

      return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
        '<td style="padding:5px 8px;font-weight:500;">' + esc(c.user_name) + '</td>' +
        '<td style="padding:5px 8px;color:#6b7280;">' + format(inTime, 'MMM d, HH:mm') + '</td>' +
        '<td style="padding:5px 8px;color:#6b7280;">' + (outTime ? format(outTime, 'HH:mm') : '—') + '</td>' +
        '<td style="padding:5px 8px;font-weight:600;">' + duration + '</td>' +
        '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">' + esc(weatherStr) + '</td>' +
        '<td style="padding:5px 8px;text-align:center;"><span style="background:' + statusBg + ';color:' + statusColor + ';padding:2px 8px;border-radius:10px;font-size:9px;font-weight:600;">' + statusText + '</span></td>' +
      '</tr>' + taskSubRow;
    }).join('');

    const totalSessions = siteCheckins.length;
    const completedSessions = siteCheckins.filter((c: any) => c.checked_out_at).length;
    const uniqueWorkers = new Set(siteCheckins.map((c: any) => c.user_id)).size;
    const totalTasksDone = [...completedTasksByDay.values()].reduce((sum, arr) => sum + arr.length, 0);

    sitePresenceHtml = '<div class="pdf-section site-presence-card" style="margin-top:4px;margin-bottom:3px;">' +
      '<div class="section-header-block">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
          '<span style="font-size:13px;">📍</span>' +
          '<div style="font-size:12px;font-weight:700;color:#1e3a5f;">Site Presence Log</div>' +
        '</div>' +
        '<div style="font-size:10px;color:#6b7280;margin-bottom:4px;">' + totalSessions + ' check-in session(s) · ' + completedSessions + ' completed · ' + uniqueWorkers + ' unique worker(s) · ' + totalTasksDone + ' task(s) completed during presence</div>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
        '<thead><tr style="background:#ecfdf5;font-size:9px;text-transform:uppercase;color:#059669;letter-spacing:0.05em;">' +
          '<th style="padding:6px 8px;text-align:left;">Worker</th>' +
          '<th style="padding:6px 8px;text-align:left;">Check In</th>' +
          '<th style="padding:6px 8px;text-align:left;">Check Out</th>' +
          '<th style="padding:6px 8px;text-align:left;">Duration</th>' +
          '<th style="padding:6px 8px;text-align:left;">Weather</th>' +
          '<th style="padding:6px 8px;text-align:center;">Status</th>' +
        '</tr></thead>' +
        '<tbody>' + checkinRows + '</tbody>' +
      '</table>' +
    '</div>';
  }

  // ============================================
  // EXECUTIVE SUMMARY (AI-Generated)
  // ============================================
  let execSummaryHtml = '';
  const execText = geminiExecSummaryText;
  const dualEngineUsed = aiAnalysisData?.dualEngineUsed || !!openaiRawText || !!openaiCompliance?.rawValidation;
  const geminiModel = aiAnalysisData?.engines?.gemini?.model || (geminiExecSummaryText ? 'Gemini' : '');
  const openaiModel = aiAnalysisData?.engines?.openai?.model || (openaiRawText || openaiCompliance ? 'GPT-5' : '');

  const cleanAiText = (raw: any): string => {
    if (!raw) return '';
    let text = typeof raw === 'string' ? raw : '';
    if (!text && typeof raw === 'object') {
      const obj = raw as Record<string, any>;
      text = obj.executiveSummary || obj.executive_summary || obj.summary || obj.analysis || obj.text || obj.content || '';
      if (!text) {
        for (const val of Object.values(obj)) {
          if (typeof val === 'string' && val.length > 40) { text = val; break; }
        }
      }
      if (!text) text = JSON.stringify(raw);
    }
    text = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');
    const jsonWrapMatch = text.match(/^\s*\{\s*"[^"]+"\s*:\s*"([\s\S]+)"\s*\}\s*$/);
    if (jsonWrapMatch) text = jsonWrapMatch[1];
    text = text.replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    return text.trim();
  };

  const cleanExecText = cleanAiText(execText);
  if (cleanExecText) {
    execSummaryHtml = '<div class="pdf-section" style="margin-top:10px;margin-bottom:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 12px;">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
        '<span style="font-size:14px;">🧠</span>' +
        '<div style="font-size:12px;font-weight:700;color:#064e3b;">M.E.S.S.A. Executive Summary</div>' +
        (dualEngineUsed ? '<span style="background:#7c3aed;color:white;font-size:7px;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:auto;">DUAL ENGINE</span>' : '') +
      '</div>' +
      '<div style="font-size:10px;color:#374151;line-height:1.6;margin-bottom:6px;white-space:pre-line;">' + esc(cleanExecText.slice(0, 2500)) + '</div>' +
      '<div style="display:flex;gap:12px;margin-top:8px;font-size:9px;color:#6b7280;">' +
        (geminiModel ? '<span>🔍 ' + esc(String(geminiModel)) + ' — Visual & Site</span>' : '') +
        (openaiModel ? '<span>⚖️ ' + esc(String(openaiModel)) + ' — Regulatory</span>' : '') +
        '<span style="margin-left:auto;">📊 ' + (aiAnalysisData?.citationCount || citations.length) + ' citations verified</span>' +
      '</div>' +
    '</div>';
  }

  // ============================================
  // OBC COMPLIANCE CHECKLIST (Detailed)
  // ============================================
  let obcChecklistHtml = '';
  const obcChecklist: any[] = obcDetailedResult?.complianceChecklist
    || openaiComplianceFinal?.complianceChecklist
    || openaiComplianceFinal?.checklist
    || openaiComplianceFinal?.regulatory_findings
    || [];
  const obcOverallStatus = obcDetailedResult?.overallStatus || openaiComplianceFinal?.overallStatus || openaiComplianceFinal?.compliance_status || '';
  const obcRecommendations: string[] = obcDetailedResult?.recommendations
    || openaiComplianceFinal?.recommendations
    || openaiComplianceFinal?.suggested_actions
    || [];
  const obcPermitStatus = obcDetailedResult?.permitStatus || null;
  const obcMaterialChecks: any[] = obcDetailedResult?.materialChecks || [];
  const obcSafetyChecks: any[] = obcDetailedResult?.safetyChecks || [];

  if (obcChecklist.length > 0 || obcOverallStatus || obcPermitStatus) {
    const checklistRows = obcChecklist.slice(0, 12).map((item: any) => {
      const status = item.status || item.result || 'N/A';
      const isPass = /pass|compliant|ok|yes/i.test(String(status));
      const isFail = /fail|non.?compliant|no/i.test(String(status));
      const statusIcon = isPass ? '✅' : isFail ? '❌' : '⚠️';
      const statusColor = isPass ? '#059669' : isFail ? '#dc2626' : '#d97706';

      let detailBlock = '';
      if (!isPass) {
        const details: string[] = [];
        if (item.issueDescription) details.push('⚠️ ' + esc(item.issueDescription));
        if (item.actionRequired) details.push('📋 Action: ' + esc(item.actionRequired));
        if (item.contactInfo) details.push('📞 Contact: ' + esc(item.contactInfo));
        if (item.timeline) details.push('⏱️ Timeline: ' + esc(item.timeline));
        if (item.penalty) details.push('💰 Penalty: ' + esc(item.penalty));
        if (details.length > 0) {
          detailBlock = '<tr style="font-size:10px;background:#fefce8;border-bottom:1px solid #fde68a;">' +
            '<td colspan="5" style="padding:6px 12px;color:#78350f;line-height:1.6;">' +
            details.join('<br/>') +
            '</td></tr>';
        }
      }

      return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
        '<td style="padding:5px 8px;">' + statusIcon + '</td>' +
        '<td style="padding:5px 8px;font-weight:600;color:#1e40af;">' + esc(item.code || item.section || item.obcSection || '—') + '</td>' +
        '<td style="padding:5px 8px;">' + esc(item.requirement || item.title || item.description || '—') + '</td>' +
        '<td style="padding:5px 8px;color:' + statusColor + ';font-weight:600;font-size:10px;">' + esc(String(status)) + '</td>' +
        '<td style="padding:5px 8px;color:#6b7280;font-size:10px;max-width:180px;white-space:normal;line-height:1.3;">' + esc((item.notes || item.recommendation || '').slice(0, 150)) + '</td>' +
      '</tr>' + detailBlock;
    }).join('');

    let permitHtml = '';
    if (obcPermitStatus) {
      const permitObtained = obcPermitStatus.obtained === true;
      const permitBg = permitObtained ? '#f0fdf4' : '#fef2f2';
      const permitBorder = permitObtained ? '#bbf7d0' : '#fecaca';
      const permitIcon = permitObtained ? '✅' : '❌';
      const permitTitle = permitObtained ? 'Building Permit — OBTAINED' : 'Building Permit — NOT OBTAINED';
      const permitDetails: string[] = [];
      if (obcPermitStatus.permitSection) permitDetails.push('<strong>OBC Requirement:</strong> ' + esc(obcPermitStatus.permitSection));
      if (!permitObtained && obcPermitStatus.penalty) permitDetails.push('<strong>⚠️ Penalty if ignored:</strong> ' + esc(obcPermitStatus.penalty));
      if (obcPermitStatus.contactInfo) permitDetails.push('<strong>📞 Contact:</strong> ' + esc(obcPermitStatus.contactInfo));
      if (obcPermitStatus.processingTime) permitDetails.push('<strong>⏱️ Processing:</strong> ' + esc(obcPermitStatus.processingTime));
      let docsHtml = '';
      if (Array.isArray(obcPermitStatus.documentsNeeded) && obcPermitStatus.documentsNeeded.length > 0) {
        docsHtml = '<div style="margin-top:6px;"><strong>📄 Documents needed:</strong></div>' +
          '<ul style="margin:4px 0 0 16px;padding:0;font-size:10px;line-height:1.5;">' +
          obcPermitStatus.documentsNeeded.map((d: string) => '<li>' + esc(d) + '</li>').join('') +
          '</ul>';
      }
      let stepsHtml = '';
      if (Array.isArray(obcPermitStatus.applicationSteps) && obcPermitStatus.applicationSteps.length > 0) {
        stepsHtml = '<div style="margin-top:6px;"><strong>📋 Application steps:</strong></div>' +
          '<ol style="margin:4px 0 0 16px;padding:0;font-size:10px;line-height:1.5;">' +
          obcPermitStatus.applicationSteps.map((s: string) => '<li>' + esc(s) + '</li>').join('') +
          '</ol>';
      }
      permitHtml = '<div style="margin-top:10px;padding:10px 14px;background:' + permitBg + ';border:1px solid ' + permitBorder + ';border-radius:8px;">' +
        '<div style="font-size:12px;font-weight:700;color:#1e3a5f;margin-bottom:6px;">' + permitIcon + ' ' + permitTitle + '</div>' +
        '<div style="font-size:10px;color:#374151;line-height:1.6;">' + permitDetails.join('<br/>') + docsHtml + stepsHtml + '</div>' +
      '</div>';
    }

    let materialCheckHtml = '';
    if (obcMaterialChecks.length > 0) {
      const matRows = obcMaterialChecks.slice(0, 8).map((mc: any) => {
        const isPass = /pass/i.test(mc.status || '');
        const icon = isPass ? '✅' : /fail/i.test(mc.status || '') ? '❌' : '⚠️';
        return '<tr style="font-size:10px;border-bottom:1px solid #f0f0f0;">' +
          '<td style="padding:4px 8px;">' + icon + '</td>' +
          '<td style="padding:4px 8px;font-weight:600;">' + esc(mc.material || '—') + '</td>' +
          '<td style="padding:4px 8px;color:#1e40af;font-size:9px;">' + esc(mc.obcSection || '—') + '</td>' +
          '<td style="padding:4px 8px;color:#6b7280;">' + esc(mc.requirement || mc.specification || '—') + '</td>' +
        '</tr>';
      }).join('');
      materialCheckHtml = '<div style="margin-top:10px;">' +
        '<div style="font-size:11px;font-weight:600;color:#1e3a5f;margin-bottom:4px;">🧱 Material Specification Compliance</div>' +
        '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">' +
          '<thead><tr style="background:#f0f9ff;font-size:9px;text-transform:uppercase;color:#2563eb;">' +
            '<th style="padding:4px 8px;width:30px;">✓</th><th style="padding:4px 8px;text-align:left;">Material</th>' +
            '<th style="padding:4px 8px;text-align:left;">OBC Section</th><th style="padding:4px 8px;text-align:left;">Requirement</th>' +
          '</tr></thead><tbody>' + matRows + '</tbody></table></div>';
    }

    let safetyCheckHtml = '';
    if (obcSafetyChecks.length > 0) {
      const safetyRows = obcSafetyChecks.slice(0, 8).map((sc: any) => {
        const isPass = /pass/i.test(sc.status || '');
        const icon = isPass ? '✅' : /fail/i.test(sc.status || '') ? '❌' : '⚠️';
        return '<tr style="font-size:10px;border-bottom:1px solid #f0f0f0;">' +
          '<td style="padding:4px 8px;">' + icon + '</td>' +
          '<td style="padding:4px 8px;font-weight:600;">' + esc(sc.category || '—') + '</td>' +
          '<td style="padding:4px 8px;color:#1e40af;font-size:9px;">' + esc(sc.regulation || '—') + '</td>' +
          '<td style="padding:4px 8px;color:#6b7280;">' + esc(sc.requirement || '—') + '</td>' +
          (!isPass && sc.actionRequired ? '<td style="padding:4px 8px;color:#dc2626;font-size:9px;">' + esc(sc.actionRequired) + '</td>' : '<td></td>') +
        '</tr>';
      }).join('');
      safetyCheckHtml = '<div style="margin-top:10px;">' +
        '<div style="font-size:11px;font-weight:600;color:#1e3a5f;margin-bottom:4px;">🛡️ Safety & Code Requirements</div>' +
        '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">' +
          '<thead><tr style="background:#fef3c7;font-size:9px;text-transform:uppercase;color:#92400e;">' +
            '<th style="padding:4px 8px;width:30px;">✓</th><th style="padding:4px 8px;text-align:left;">Category</th>' +
            '<th style="padding:4px 8px;text-align:left;">Regulation</th><th style="padding:4px 8px;text-align:left;">Requirement</th>' +
            '<th style="padding:4px 8px;text-align:left;">Action</th>' +
          '</tr></thead><tbody>' + safetyRows + '</tbody></table></div>';
    }

    obcChecklistHtml = '<div class="pdf-section obc-card" style="margin-top:12px;margin-bottom:6px;">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">' +
        '<span style="font-size:14px;">⚖️</span>' +
        '<div style="font-size:13px;font-weight:700;color:#1e3a5f;">Regulatory Compliance Checklist</div>' +
        (obcOverallStatus ? '<span style="background:' + (/pass|compliant/i.test(obcOverallStatus) ? '#dcfce7;color:#166534' : /fail|non/i.test(obcOverallStatus) ? '#fef2f2;color:#991b1b' : '#fefce8;color:#92400e') + ';padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;margin-left:auto;">' + esc(String(obcOverallStatus)) + '</span>' : '') +
      '</div>' +
      '<div style="font-size:11px;color:#6b7280;margin-bottom:10px;">AI-validated against Ontario Building Code (OBC 2024) via Gemini Regulatory Engine</div>' +
      (checklistRows ? (
        '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
          '<thead><tr style="background:#eff6ff;font-size:9px;text-transform:uppercase;color:#3b82f6;letter-spacing:0.05em;">' +
            '<th style="padding:6px 8px;text-align:center;width:30px;">Status</th><th style="padding:6px 8px;text-align:left;">OBC Section</th>' +
            '<th style="padding:6px 8px;text-align:left;">Requirement</th><th style="padding:6px 8px;text-align:left;">Result</th>' +
            '<th style="padding:6px 8px;text-align:left;">Notes</th>' +
          '</tr></thead><tbody>' + checklistRows + '</tbody></table>'
      ) : '') +
      permitHtml + materialCheckHtml + safetyCheckHtml +
      (obcRecommendations.length > 0 ? (
        '<div style="margin-top:12px;padding:10px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;">' +
          '<div style="font-size:11px;font-weight:600;color:#92400e;margin-bottom:6px;">📋 Regulatory Recommendations</div>' +
          '<ul style="margin:0;padding-left:16px;font-size:11px;color:#78350f;line-height:1.6;">' +
            obcRecommendations.slice(0, 8).map((r: string) => '<li>' + esc(String(r)) + '</li>').join('') +
          '</ul></div>'
      ) : '') +
    '</div>';
  }

  // ============================================
  // AI RISK ASSESSMENT
  // ============================================
  let riskHtml = '';
  const risks: any[] = geminiRiskFactors.length > 0 ? geminiRiskFactors
    : (aiAnalysisData?.engines?.gemini?.analysis?.risks || []);
  const missingPillars = pillars.filter(p => !p.status);

  if (risks.length > 0 || missingPillars.length > 0 || conflictAlerts.length > 0) {
    let riskItems = '';
    for (const mp of missingPillars) {
      riskItems += '<tr style="font-size:11px;border-bottom:1px solid #fef2f2;">' +
        '<td style="padding:5px 8px;"><span style="background:#fef2f2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">HIGH</span></td>' +
        '<td style="padding:5px 8px;font-weight:600;">Missing: ' + esc(mp.label) + '</td>' +
        '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">Incomplete pillar data may affect project validation and compliance.</td>' +
      '</tr>';
    }
    for (const ca of conflictAlerts) {
      riskItems += '<tr style="font-size:11px;border-bottom:1px solid #fef2f2;">' +
        '<td style="padding:5px 8px;"><span style="background:#fef2f2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">CRITICAL</span></td>' +
        '<td style="padding:5px 8px;font-weight:600;">' + esc(ca.type) + ': Visual (' + ca.visual_value + ') vs DB (' + ca.db_value + ')</td>' +
        '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">Deviation: ' + ca.deviation_pct + '%. Requires manual verification.</td>' +
      '</tr>';
    }
    if (obcPermitStatus && !obcPermitStatus.obtained) {
      const penaltyText = obcPermitStatus.penalty ? ' Penalty: ' + esc(obcPermitStatus.penalty) + '.' : '';
      const contactText = obcPermitStatus.contactInfo ? ' Contact: ' + esc(obcPermitStatus.contactInfo) + '.' : '';
      const timelineText = obcPermitStatus.processingTime ? ' Timeline: ' + esc(obcPermitStatus.processingTime) + '.' : '';
      riskItems += '<tr style="font-size:11px;border-bottom:1px solid #fef2f2;">' +
        '<td style="padding:5px 8px;"><span style="background:#fef2f2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">CRITICAL</span></td>' +
        '<td style="padding:5px 8px;font-weight:600;">Building Permit — NOT OBTAINED</td>' +
        '<td style="padding:5px 8px;color:#6b7280;font-size:10px;line-height:1.4;">OBC ' + esc(obcPermitStatus.permitSection || 'Section 1.3.1.2') + ' — Permit required.' + penaltyText + contactText + timelineText + '</td>' +
      '</tr>';
    } else if (obcSections.length === 0 && !obcDetailedResult) {
      riskItems += '<tr style="font-size:11px;border-bottom:1px solid #fef2f2;">' +
        '<td style="padding:5px 8px;"><span style="background:#fef2f2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">CRITICAL</span></td>' +
        '<td style="padding:5px 8px;font-weight:600;">Missing Building Code Validation</td>' +
        '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">No OBC Part 9 compliance data found.</td>' +
      '</tr>';
    }
    for (const sc of obcSafetyChecks.filter((s: any) => /fail|warning/i.test(s.status || '')).slice(0, 3)) {
      const isFail = /fail/i.test(sc.status || '');
      riskItems += '<tr style="font-size:11px;border-bottom:1px solid #fef2f2;">' +
        '<td style="padding:5px 8px;"><span style="background:' + (isFail ? '#fef2f2;color:#dc2626' : '#fefce8;color:#d97706') + ';padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">' + (isFail ? 'HIGH' : 'MEDIUM') + '</span></td>' +
        '<td style="padding:5px 8px;font-weight:600;">' + esc(sc.category || 'Safety Check') + '</td>' +
        '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">' + esc(sc.regulation || '') + ' — ' + esc(sc.requirement || '') + (sc.actionRequired ? ' Action: ' + esc(sc.actionRequired) : '') + '</td>' +
      '</tr>';
    }
    if (obcSafetyChecks.length === 0 && obcSections.length === 0) {
      riskItems += '<tr style="font-size:11px;border-bottom:1px solid #fef2f2;">' +
        '<td style="padding:5px 8px;"><span style="background:#fefce8;color:#d97706;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">MEDIUM</span></td>' +
        '<td style="padding:5px 8px;font-weight:600;">Missing Inspector Sign-off</td>' +
        '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">Inspector approval required at framing, mechanical, and final stages.</td>' +
      '</tr>';
    }
    for (const r of risks.slice(0, 6)) {
      const severity = r.severity || r.level || 'MEDIUM';
      const sevColor = /high|critical/i.test(severity) ? '#dc2626' : /medium/i.test(severity) ? '#d97706' : '#059669';
      const sevBg = /high|critical/i.test(severity) ? '#fef2f2' : /medium/i.test(severity) ? '#fefce8' : '#f0fdf4';
      riskItems += '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
        '<td style="padding:5px 8px;"><span style="background:' + sevBg + ';color:' + sevColor + ';padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">' + esc(String(severity).toUpperCase()) + '</span></td>' +
        '<td style="padding:5px 8px;font-weight:600;">' + esc(r.title || r.factor || r.name || '—') + '</td>' +
        '<td style="padding:5px 8px;color:#6b7280;font-size:10px;max-width:250px;white-space:normal;line-height:1.3;">' + esc((r.description || r.detail || r.mitigation || '').slice(0, 150)) + '</td>' +
      '</tr>';
    }
    if (riskItems) {
      riskHtml = '<div class="pdf-section risk-card" style="margin-top:12px;margin-bottom:6px;">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">' +
          '<span style="font-size:14px;">⚠️</span>' +
          '<div style="font-size:13px;font-weight:700;color:#1e3a5f;">Risk Assessment Matrix</div>' +
        '</div>' +
        '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
          '<thead><tr style="background:#fef2f2;font-size:9px;text-transform:uppercase;color:#dc2626;letter-spacing:0.05em;">' +
            '<th style="padding:6px 8px;text-align:left;width:70px;">Severity</th>' +
            '<th style="padding:6px 8px;text-align:left;">Risk Factor</th>' +
            '<th style="padding:6px 8px;text-align:left;">Description / Mitigation</th>' +
          '</tr></thead><tbody>' + riskItems + '</tbody></table></div>';
    }
  }

  // ============================================
  // MATERIAL & LABOR LINE ITEM BREAKDOWN
  // ============================================
  let lineItemHtml = '';
  const allItems = savedLineItems.length > 0 ? savedLineItems : savedTemplateItems;
  if (allItems.length > 0 && financialSummary && (financialSummary.total_cost ?? 0) > 0) {
    const fmt = (n: number | null) => n != null ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
    const itemRows = allItems.slice(0, 20).map((item: any) => {
      const name = item.name || item.item_name || item.description || '—';
      const qty = item.quantity ?? item.qty ?? '';
      const unit = item.unit || item.unit_type || '';
      const unitPrice = item.unit_price ?? item.unitPrice ?? item.price ?? null;
      const total = item.total ?? item.total_cost ?? (qty && unitPrice ? qty * unitPrice : null);
      const category = item.category || item.type || '';
      const catIcon = /labor|work|install/i.test(category) ? '👷' : '🧱';
      return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
        '<td style="padding:4px 8px;">' + catIcon + '</td>' +
        '<td style="padding:4px 8px;font-weight:600;">' + esc(String(name).slice(0, 50)) + '</td>' +
        '<td style="padding:4px 8px;text-align:center;color:#6b7280;">' + (qty || '—') + ' ' + esc(String(unit)) + '</td>' +
        '<td style="padding:4px 8px;text-align:right;color:#6b7280;">' + (unitPrice != null ? fmt(unitPrice) : '—') + '</td>' +
        '<td style="padding:4px 8px;text-align:right;font-weight:600;color:#1f2937;">' + (total != null ? fmt(total) : '—') + '</td>' +
      '</tr>';
    }).join('');

    const costPerSqFt = gfaValue > 0 && financialSummary.total_cost ? (financialSummary.total_cost / gfaValue).toFixed(2) : null;

    lineItemHtml = '<div class="pdf-section line-item-card" style="margin-top:4px;margin-bottom:3px;">' +
      '<div class="section-header-block" style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
        '<span style="font-size:13px;">📋</span>' +
        '<div style="font-size:12px;font-weight:700;color:#1e3a5f;">Material & Labor Breakdown</div>' +
        (costPerSqFt ? '<span style="background:#f0fdf4;color:#059669;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;margin-left:auto;">$' + costPerSqFt + '/sq ft</span>' : '') +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
        '<thead><tr style="background:#f9fafb;font-size:9px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">' +
          '<th style="padding:6px 8px;text-align:left;width:30px;">Type</th><th style="padding:6px 8px;text-align:left;">Item</th>' +
          '<th style="padding:6px 8px;text-align:center;">Qty</th><th style="padding:6px 8px;text-align:right;">Unit Price</th>' +
          '<th style="padding:6px 8px;text-align:right;">Total</th>' +
        '</tr></thead><tbody>' + itemRows + '</tbody>' +
        '<tfoot><tr style="background:#f0fdf4;font-size:12px;font-weight:700;">' +
          '<td colspan="4" style="padding:8px;text-align:right;color:#064e3b;">Grand Total</td>' +
          '<td style="padding:8px;text-align:right;color:#064e3b;">' + fmt(financialSummary.total_cost) + '</td>' +
        '</tr></tfoot></table></div>';
  }

  // ============================================
  // M.E.S.S.A. DUAL-ENGINE VERDICT
  // ============================================
  let verdictHtml = '';
  const openaiRaw = openaiComplianceFinal?.rawValidation || openaiComplianceFinal?.summary || '';

  const totalTaskCount = tasks.length;
  const completedTaskCount = tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
  const taskCompletionPct = totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0;

  const demoPriceCitExists = citations.some(c => c.cite_type === 'DEMOLITION_PRICE');
  const siteCondHasDemo = citations.find(c => c.cite_type === 'SITE_CONDITION')?.answer === 'demolition';
  const hasDemolitionWork = demoPriceCitExists || siteCondHasDemo;
  const demoTasks = tasks.filter(t => (t as any).phase === 'demolition');
  const demoCompletedCount = demoTasks.filter(t => t.status === 'completed' || t.status === 'done').length;
  const demoBonus = hasDemolitionWork && demoTasks.length > 0
    ? Math.round((demoCompletedCount / demoTasks.length) * 12)
    : hasDemolitionWork ? 6 : 0;

  const baseEffectivePct = totalTaskCount > 0 ? Math.round((pct * 0.5) + (taskCompletionPct * 0.5)) : pct;
  const effectivePct = Math.min(baseEffectivePct + demoBonus, 100);
  let healthGrade: string;
  if (totalTaskCount > 0 && taskCompletionPct < 50) {
    healthGrade = effectivePct >= 50 ? 'C' : effectivePct >= 25 ? 'D' : 'F';
  } else if (totalTaskCount > 0 && taskCompletionPct < 80) {
    healthGrade = effectivePct >= 75 ? 'B' : effectivePct >= 50 ? 'C' : effectivePct >= 25 ? 'D' : 'F';
  } else {
    healthGrade = effectivePct >= 90 ? 'A' : effectivePct >= 75 ? 'B' : effectivePct >= 50 ? 'C' : effectivePct >= 25 ? 'D' : 'F';
  }
  const gradeCapped = totalTaskCount > 0 && taskCompletionPct < 80;
  const demoBonusMsg = demoBonus > 0 ? ' 🔨 Demolition bonus: +' + demoBonus + '%' : '';
  const gradeCapMsg = gradeCapped
    ? (taskCompletionPct < 50 ? '⚠️ Grade capped — task progress ' + taskCompletionPct + '%' + demoBonusMsg : '⚠️ Grade capped at B — tasks ' + taskCompletionPct + '% done' + demoBonusMsg)
    : (demoBonus > 0 ? '🔨 Demolition work bonus: +' + demoBonus + '% applied' : '');
  const gradeColor = effectivePct >= 75 ? '#059669' : effectivePct >= 50 ? '#d97706' : '#dc2626';
  const totalRisks = missingPillars.length + conflictAlerts.length + risks.length;
  const obcPassCount = obcChecklist.filter((item: any) => /pass|compliant|ok|yes/i.test(String(item.status || item.result || ''))).length;

  verdictHtml = '<div class="pdf-section verdict-card" style="margin-top:12px;margin-bottom:6px;border:2px solid #7c3aed;border-radius:6px;overflow:hidden;">' +
    '<div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:10px 14px;color:white;">' +
      '<div style="font-size:13px;font-weight:700;">M.E.S.S.A. Dual-Engine Verdict</div>' +
      '<div style="font-size:9px;opacity:0.8;margin-top:2px;">Multi-Engine Synthesis & Structured Analysis — Final Assessment</div>' +
    '</div>' +
    '<div style="padding:12px 14px;">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e5e7eb;">' +
        '<div style="width:52px;height:52px;border-radius:10px;background:' + gradeColor + ';display:flex;align-items:center;justify-content:center;color:white;font-size:26px;font-weight:800;font-family:monospace;">' + healthGrade + '</div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:11px;font-weight:700;color:#1f2937;margin-bottom:4px;">Project Health Grade: ' + healthGrade + ' (' + effectivePct + '%)</div>' +
          (gradeCapMsg ? '<div style="font-size:9px;color:#d97706;font-weight:600;margin-bottom:4px;">' + gradeCapMsg + '</div>' : '') +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
            '<span style="font-size:9px;color:#6b7280;">✅ ' + passCount + '/9 Pillars Complete</span>' +
            '<span style="font-size:9px;color:#6b7280;">⚠️ ' + totalRisks + ' Risk Factors</span>' +
            (obcChecklist.length > 0 ? '<span style="font-size:9px;color:#6b7280;">⚖️ ' + obcPassCount + '/' + obcChecklist.length + ' OBC Checks Passed</span>' : '') +
            (totalTaskCount > 0 ? '<span style="font-size:9px;color:#6b7280;">📋 Tasks: ' + completedTaskCount + '/' + totalTaskCount + ' (' + taskCompletionPct + '%)</span>' : '') +
            (financialSummary?.total_cost ? '<span style="font-size:9px;color:#6b7280;">💰 Budget: $' + financialSummary.total_cost.toLocaleString() + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      (openaiRaw ? (
        '<div style="margin-bottom:14px;">' +
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">' +
            '<span style="background:#8b5cf6;color:white;font-size:8px;padding:2px 8px;border-radius:10px;font-weight:700;">GPT-5</span>' +
            '<span style="font-size:11px;font-weight:600;color:#374151;">Regulatory Verdict</span>' +
          '</div>' +
          '<p style="font-size:11px;color:#4b5563;line-height:1.6;margin:0;">' + esc(cleanAiText(openaiRaw).slice(0, 400)) + '</p>' +
        '</div>'
      ) : '') +
      '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-top:10px;">' +
        '<div style="font-size:11px;font-weight:600;color:#334155;margin-bottom:6px;">🎯 Recommended Next Steps</div>' +
        '<ul style="margin:0;padding-left:16px;font-size:10px;color:#475569;line-height:1.7;">' +
          (missingPillars.length > 0 ? '<li>Complete missing data pillars: ' + esc(missingPillars.map(p => p.label).slice(0, 3).join(', ')) + '</li>' : '<li>All data pillars are complete — proceed to project activation</li>') +
          (conflictAlerts.length > 0 ? '<li>Resolve ' + conflictAlerts.length + ' visual conflict alert(s) identified by AI vision</li>' : '') +
          (obcChecklist.length > 0 && obcPassCount < obcChecklist.length ? '<li>Address ' + (obcChecklist.length - obcPassCount) + ' non-compliant OBC item(s) before construction begins</li>' : '') +
          (!financialSummary?.total_cost ? '<li>Lock in a finalized budget to complete financial readiness</li>' : '') +
        '</ul>' +
      '</div>' +
    '</div>' +
  '</div>';

  // ============================================
  // ASSEMBLE FULL HTML
  // ============================================
  const { buildUnionPdfHeader, buildUnionPdfFooter } = await import('@/lib/pdfGenerator');

  const header = buildUnionPdfHeader({
    docType: 'M.E.S.S.A. DNA Integrity Report',
    contractorName: profile.company_name || undefined,
    contractorPhone: profile.phone || undefined,
    contractorEmail: userEmail || undefined,
    contractorWebsite: profile.company_website || undefined,
    dateStr: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  });

  const footer = buildUnionPdfFooter({
    contractorName: profile.company_name || undefined,
    docNumber: 'DNA-' + projectId.slice(0, 8).toUpperCase(),
  });

  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '* { margin: 0; padding: 0; box-sizing: border-box; }' +
    'body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #1f2937; padding: 18px 22px; max-width: 800px; margin: 0 auto; font-size: 10.5px; line-height: 1.3; }' +
    '.financial-snapshot-card, .verdict-card, .risk-card { break-inside: avoid !important; page-break-inside: avoid !important; }' +
    '.visual-intel-card, .site-presence-card, .line-item-card, .obc-card { break-inside: auto !important; page-break-inside: auto !important; }' +
    '.section-header-block { break-inside: avoid !important; page-break-inside: avoid !important; break-after: avoid !important; page-break-after: avoid !important; margin-bottom: 2px; }' +
    '.section-header { break-after: avoid !important; page-break-after: avoid !important; }' +
    '.pdf-section { margin-bottom: 3px; margin-top: 1px; }' +
    'table { font-size: 10px; border-spacing: 0; margin-bottom: 1px; }' +
    'tr { break-inside: avoid !important; page-break-inside: avoid !important; }' +
    'thead { display: table-header-group; }' +
    'h2, h3, h4, .section-header { page-break-after: avoid !important; break-after: avoid !important; orphans: 3; widows: 3; font-size: 11px; margin-bottom: 2px; margin-top: 0; }' +
    '.site-presence-card table { font-size: 8.5px !important; }' +
    '.site-presence-card td, .site-presence-card th { padding: 2px 4px !important; }' +
    '.visual-intel-card table { font-size: 9px !important; }' +
    '.visual-intel-card td, .visual-intel-card th { padding: 2px 4px !important; }' +
    '.line-item-card table { font-size: 9px !important; }' +
    '.line-item-card td, .line-item-card th { padding: 2px 5px !important; }' +
    '.obc-card table { font-size: 9px !important; }' +
    '.obc-card td, .obc-card th { padding: 2px 5px !important; }' +
    'div[style*="margin-top:12px"] { margin-top: 3px !important; }' +
    'div[style*="margin-top:8px"] { margin-top: 2px !important; }' +
    'div[style*="margin-bottom:10px"] { margin-bottom: 2px !important; }' +
    'div[style*="margin-bottom:12px"] { margin-bottom: 3px !important; }' +
    'div[style*="margin-bottom:8px"] { margin-bottom: 2px !important; }' +
    'div[style*="padding:10px"] { padding: 5px 8px !important; }' +
    'div[style*="padding:14px"] { padding: 6px 10px !important; }' +
    '</style></head><body>' +
    header +
    '<div class="pdf-section" style="text-align:center;margin-bottom:12px;">' +
      '<div style="font-size:8px;text-transform:uppercase;letter-spacing:0.15em;color:#6b7280;margin-bottom:2px;">M.E.S.S.A. DNA Integrity Report</div>' +
      '<div style="font-size:15px;font-weight:700;color:#064e3b;">' + esc(projName) + '</div>' +
      (projAddr ? '<div style="font-size:9px;color:#9ca3af;margin-top:1px;">' + esc(projAddr) + '</div>' : '') +
      '<div style="font-size:8px;color:#9ca3af;margin-top:1px;">Generated: ' + new Date().toLocaleString() + '</div>' +
    '</div>' +
    execSummaryHtml +
    '<div class="pdf-section" style="background:linear-gradient(135deg,#064e3b,#065f46);color:white;border-radius:6px;padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;">' +
      '<div style="font-size:24px;font-weight:800;font-family:monospace;">' + passCount + '/9</div>' +
      '<div style="flex:1;">' +
        '<div style="font-size:10px;font-weight:600;margin-bottom:3px;">DNA Integrity Score — ' + pct + '%</div>' +
        '<div style="height:5px;background:rgba(255,255,255,0.2);border-radius:999px;overflow:hidden;">' +
          '<div style="height:100%;width:' + pct + '%;background:' + scoreColor + ';border-radius:999px;"></div>' +
        '</div>' +
      '</div>' +
      '<div style="background:rgba(255,255,255,0.15);padding:2px 8px;border-radius:20px;font-size:9px;font-weight:600;">' + scoreLabel + '</div>' +
    '</div>' +
    '<div style="font-size:11px;font-weight:700;color:#1e3a5f;margin-bottom:6px;display:flex;align-items:center;gap:5px;">' +
      '<span style="font-size:13px;">🧬</span> 9-Pillar Validation Matrix' +
    '</div>' +
    pillarRows +
    lineItemHtml +
    financialHtml +
    verdictHtml +
    '<div class="pdf-section" style="margin-top:12px;margin-bottom:8px;padding:10px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;">' +
      '<div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:4px;">⚖️ Disclaimer</div>' +
      '<p style="font-size:9px;color:#78350f;line-height:1.5;margin:0;">This report is for informational purposes only. For detailed OBC compliance and visual site intelligence, generate the MESSA Site Intelligence Report.</p>' +
    '</div>' +
    footer +
  '</body></html>';

  return html;
}

// ============================================
// SITE INTELLIGENCE REPORT HTML BUILDER
// ============================================
export interface SiteIntelHtmlContext {
  projName: string;
  projAddr: string;
  projectId: string;
  aiAnalysisData: any;
  obcDetailedResult: any;
  obcComplianceSections: Array<{
    section_number: string;
    section_title: string;
    content: string;
    relevance_score: number;
    source: string;
  }>;
  tradeCitAnswer: string;
  photoCits: Citation[];
  blueprintCit: Citation | undefined;
  savedPhotoEstimate: any;
  projectDocCount: number;
  namedCheckins: Array<{ user_name: string; checked_in_at: string; checked_out_at: string | null; weather_snapshot: any }>;
  completedTasksByDay: Map<string, { title: string; assignee: string; status: string }[]>;
  profile: { company_name?: string | null; phone?: string | null; company_website?: string | null };
  userEmail: string;
}

export async function buildSiteIntelHTML(ctx: SiteIntelHtmlContext): Promise<string> {
  const {
    projName, projAddr, projectId,
    aiAnalysisData, obcDetailedResult, obcComplianceSections,
    tradeCitAnswer, photoCits, blueprintCit, savedPhotoEstimate,
    projectDocCount, namedCheckins, completedTasksByDay,
    profile, userEmail,
  } = ctx;

  // ---- DUAL ENGINE HEADER ----
  const geminiModel = aiAnalysisData?.engines?.gemini?.model || 'Gemini';
  const openaiModel = aiAnalysisData?.engines?.openai?.model || 'GPT-5';
  const dualEngineUsed = !!aiAnalysisData?.dualEngineUsed || !!obcDetailedResult;

  const dualEngineHeader = '<div class="pdf-section" style="background:linear-gradient(135deg,#1e1b4b,#312e81);color:white;border-radius:8px;padding:14px 18px;margin-bottom:14px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;">' +
      '<div>' +
        '<div style="font-size:14px;font-weight:800;letter-spacing:0.02em;">M.E.S.S.A. Site Intelligence Report</div>' +
        '<div style="font-size:9px;opacity:0.8;margin-top:2px;">Multi-Engine Synthesis & Structured Analysis — Dual AI Validation</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;">' +
        '<div style="background:rgba(59,130,246,0.3);border:1px solid rgba(59,130,246,0.5);padding:4px 10px;border-radius:6px;text-align:center;">' +
          '<div style="font-size:7px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.7;">Visual Engine</div>' +
          '<div style="font-size:10px;font-weight:700;">🔍 ' + esc(String(geminiModel)) + '</div>' +
        '</div>' +
        '<div style="background:rgba(139,92,246,0.3);border:1px solid rgba(139,92,246,0.5);padding:4px 10px;border-radius:6px;text-align:center;">' +
          '<div style="font-size:7px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.7;">Regulatory Engine</div>' +
          '<div style="font-size:10px;font-weight:700;">⚖️ ' + esc(String(openaiModel)) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  // ---- OBC COMPLIANCE SECTION ----
  let obcHtml = '';
  if (obcComplianceSections.length > 0) {
    const obcRows = obcComplianceSections.slice(0, 15).map(s => {
      const relevance = Math.round((s.relevance_score || 0) * 100);
      const relColor = relevance >= 70 ? '#059669' : relevance >= 40 ? '#d97706' : '#6b7280';
      const contentPreview = esc((s.content || '').slice(0, 180));
      return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
        '<td style="padding:5px 8px;font-weight:600;color:#1e40af;white-space:nowrap;">§ ' + esc(s.section_number) + '</td>' +
        '<td style="padding:5px 8px;color:#374151;">' + esc(s.section_title) + '</td>' +
        '<td style="padding:5px 8px;color:#6b7280;font-size:10px;max-width:300px;overflow:hidden;text-overflow:ellipsis;">' + contentPreview + '</td>' +
        '<td style="padding:5px 8px;text-align:center;"><span style="color:' + relColor + ';font-weight:600;font-size:10px;">' + relevance + '%</span></td>' +
      '</tr>';
    }).join('');

    obcHtml = '<div class="pdf-section" style="margin-bottom:10px;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<span style="font-size:15px;">⚖️</span>' +
        '<div style="font-size:13px;font-weight:700;color:#1e3a5f;">OBC 2024 Part 9 — Compliance Matrix</div>' +
        '<span style="background:rgba(139,92,246,0.15);color:#7c3aed;font-size:8px;padding:2px 8px;border-radius:10px;font-weight:700;margin-left:auto;">OPENAI ENGINE</span>' +
      '</div>' +
      '<div style="font-size:10px;color:#6b7280;margin-bottom:6px;">Trade-specific regulatory requirements retrieved via RAG pipeline (' + esc(tradeCitAnswer) + ')</div>' +
      '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
        '<thead><tr style="background:#eff6ff;font-size:9px;text-transform:uppercase;color:#3b82f6;letter-spacing:0.05em;">' +
          '<th style="padding:6px 8px;text-align:left;">Section</th>' +
          '<th style="padding:6px 8px;text-align:left;">Title</th>' +
          '<th style="padding:6px 8px;text-align:left;">Excerpt</th>' +
          '<th style="padding:6px 8px;text-align:center;">Relevance</th>' +
        '</tr></thead>' +
        '<tbody>' + obcRows + '</tbody>' +
      '</table>' +
    '</div>';
  }

  // ---- OBC DETAILED CHECKLIST ----
  let obcChecklistHtml = '';
  const obcChecklist: any[] = obcDetailedResult?.complianceChecklist || [];
  const obcOverallStatus = obcDetailedResult?.overallStatus || '';
  const obcRecommendations: string[] = obcDetailedResult?.recommendations || [];
  const obcPermitStatus = obcDetailedResult?.permitStatus || null;
  const obcMaterialChecks: any[] = obcDetailedResult?.materialChecks || [];
  const obcSafetyChecks: any[] = obcDetailedResult?.safetyChecks || [];

  if (obcChecklist.length > 0 || obcOverallStatus || obcPermitStatus) {
    const checklistRows = obcChecklist.slice(0, 15).map((item: any) => {
      const status = item.status || item.result || 'N/A';
      const isPass = /pass|compliant|ok|yes/i.test(String(status));
      const isFail = /fail|non.?compliant|no/i.test(String(status));
      const statusIcon = isPass ? '✅' : isFail ? '❌' : '⚠️';
      const statusColor = isPass ? '#059669' : isFail ? '#dc2626' : '#d97706';

      let detailBlock = '';
      if (!isPass) {
        const details: string[] = [];
        if (item.issueDescription) details.push('⚠️ ' + esc(item.issueDescription));
        if (item.actionRequired) details.push('📋 Action: ' + esc(item.actionRequired));
        if (item.contactInfo) details.push('📞 Contact: ' + esc(item.contactInfo));
        if (item.timeline) details.push('⏱️ Timeline: ' + esc(item.timeline));
        if (item.penalty) details.push('💰 Penalty: ' + esc(item.penalty));
        if (details.length > 0) {
          detailBlock = '<tr style="font-size:10px;background:#fefce8;border-bottom:1px solid #fde68a;"><td colspan="5" style="padding:6px 12px;color:#78350f;line-height:1.6;">' + details.join('<br/>') + '</td></tr>';
        }
      }

      return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
        '<td style="padding:5px 8px;">' + statusIcon + '</td>' +
        '<td style="padding:5px 8px;font-weight:600;color:#1e40af;">' + esc(item.code || item.section || '—') + '</td>' +
        '<td style="padding:5px 8px;">' + esc(item.requirement || item.description || '—') + '</td>' +
        '<td style="padding:5px 8px;text-align:center;"><span style="color:' + statusColor + ';font-weight:700;">' + esc(String(status)) + '</span></td>' +
      '</tr>' + detailBlock;
    }).join('');

    // Permit status block
    let permitHtml = '';
    if (obcPermitStatus) {
      const obtained = obcPermitStatus.obtained;
      permitHtml = '<div style="margin-top:8px;padding:8px 12px;background:' + (obtained ? '#f0fdf4' : '#fef2f2') + ';border:1px solid ' + (obtained ? '#bbf7d0' : '#fecaca') + ';border-radius:6px;">' +
        '<div style="font-size:11px;font-weight:700;color:' + (obtained ? '#166534' : '#991b1b') + ';">' + (obtained ? '✅ Building Permit Obtained' : '❌ Building Permit NOT Obtained') + '</div>' +
        (obcPermitStatus.permitSection ? '<div style="font-size:9px;color:#6b7280;margin-top:2px;">OBC ' + esc(obcPermitStatus.permitSection) + '</div>' : '') +
        (obcPermitStatus.penalty ? '<div style="font-size:9px;color:#dc2626;margin-top:2px;">💰 Penalty: ' + esc(obcPermitStatus.penalty) + '</div>' : '') +
      '</div>';
    }

    // Material checks
    let materialCheckHtml = '';
    if (obcMaterialChecks.length > 0) {
      const matRows = obcMaterialChecks.slice(0, 10).map((m: any) => {
        const isOk = /pass|ok|compliant/i.test(m.status || '');
        return '<tr style="font-size:10px;border-bottom:1px solid #f0f0f0;">' +
          '<td style="padding:4px 8px;">' + (isOk ? '✅' : '⚠️') + '</td>' +
          '<td style="padding:4px 8px;font-weight:600;">' + esc(m.material || m.name || '—') + '</td>' +
          '<td style="padding:4px 8px;color:#6b7280;">' + esc(m.obcRequirement || m.requirement || '—') + '</td>' +
          '<td style="padding:4px 8px;color:' + (isOk ? '#059669' : '#d97706') + ';font-weight:600;">' + esc(m.status || '—') + '</td>' +
        '</tr>';
      }).join('');
      materialCheckHtml = '<div style="margin-top:10px;">' +
        '<div style="font-size:11px;font-weight:700;color:#1e3a5f;margin-bottom:4px;">🧱 Material Compliance Checks</div>' +
        '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">' +
          '<thead><tr style="background:#f9fafb;font-size:8px;text-transform:uppercase;color:#6b7280;">' +
            '<th style="padding:4px 8px;width:30px;">✓</th><th style="padding:4px 8px;text-align:left;">Material</th><th style="padding:4px 8px;text-align:left;">OBC Requirement</th><th style="padding:4px 8px;text-align:left;">Status</th>' +
          '</tr></thead><tbody>' + matRows + '</tbody></table>' +
      '</div>';
    }

    // Safety checks
    let safetyCheckHtml = '';
    if (obcSafetyChecks.length > 0) {
      const safeRows = obcSafetyChecks.slice(0, 8).map((s: any) => {
        const isOk = /pass|ok/i.test(s.status || '');
        return '<tr style="font-size:10px;border-bottom:1px solid #f0f0f0;">' +
          '<td style="padding:4px 8px;">' + (isOk ? '✅' : '❌') + '</td>' +
          '<td style="padding:4px 8px;font-weight:600;">' + esc(s.category || '—') + '</td>' +
          '<td style="padding:4px 8px;color:#6b7280;">' + esc(s.regulation || '—') + ' — ' + esc(s.requirement || '') + '</td>' +
          '<td style="padding:4px 8px;color:' + (isOk ? '#059669' : '#dc2626') + ';font-weight:600;">' + esc(s.status || '—') + '</td>' +
        '</tr>';
      }).join('');
      safetyCheckHtml = '<div style="margin-top:10px;">' +
        '<div style="font-size:11px;font-weight:700;color:#1e3a5f;margin-bottom:4px;">🛡️ Safety Compliance Checks</div>' +
        '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">' +
          '<thead><tr style="background:#fef2f2;font-size:8px;text-transform:uppercase;color:#dc2626;">' +
            '<th style="padding:4px 8px;width:30px;">✓</th><th style="padding:4px 8px;text-align:left;">Category</th><th style="padding:4px 8px;text-align:left;">Regulation & Requirement</th><th style="padding:4px 8px;text-align:left;">Status</th>' +
          '</tr></thead><tbody>' + safeRows + '</tbody></table>' +
      '</div>';
    }

    // Recommendations
    let recsHtml = '';
    if (obcRecommendations.length > 0) {
      recsHtml = '<div style="margin-top:10px;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;">' +
        '<div style="font-size:10px;font-weight:700;color:#166534;margin-bottom:4px;">📋 Recommendations</div>' +
        '<ul style="margin:0;padding-left:16px;font-size:10px;color:#374151;line-height:1.6;">' +
        obcRecommendations.slice(0, 8).map(r => '<li>' + esc(r) + '</li>').join('') +
        '</ul></div>';
    }

    const obcPassCount = obcChecklist.filter((item: any) => /pass|compliant|ok|yes/i.test(String(item.status || item.result || ''))).length;

    obcChecklistHtml = '<div class="pdf-section" style="margin-bottom:10px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">' +
      '<div style="background:linear-gradient(135deg,#312e81,#4338ca);padding:10px 14px;color:white;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
          '<div>' +
            '<div style="font-size:12px;font-weight:700;">OBC Compliance Checklist — Detailed Analysis</div>' +
            '<div style="font-size:9px;opacity:0.8;margin-top:2px;">' + obcPassCount + '/' + obcChecklist.length + ' checks passed · Status: ' + esc(obcOverallStatus || 'Analyzing') + '</div>' +
          '</div>' +
          '<span style="background:rgba(139,92,246,0.3);border:1px solid rgba(139,92,246,0.5);padding:2px 8px;border-radius:10px;font-size:8px;font-weight:700;">⚖️ OPENAI ENGINE</span>' +
        '</div>' +
      '</div>' +
      '<div style="padding:10px 14px;">' +
        (checklistRows ? '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">' +
          '<thead><tr style="background:#f9fafb;font-size:9px;text-transform:uppercase;color:#6b7280;">' +
            '<th style="padding:5px 8px;width:30px;">✓</th><th style="padding:5px 8px;text-align:left;">Code</th><th style="padding:5px 8px;text-align:left;">Requirement</th><th style="padding:5px 8px;text-align:center;">Status</th>' +
          '</tr></thead><tbody>' + checklistRows + '</tbody></table>' : '') +
        permitHtml + materialCheckHtml + safetyCheckHtml + recsHtml +
      '</div>' +
    '</div>';
  }

  // ---- FILES & CONTRACTS SECTION ----
  let visualHtml = '';
  const geminiVisual = aiAnalysisData?.engines?.gemini?.analysis?.visualAnalysis || (savedPhotoEstimate as any)?.visual_analysis?.gemini_findings?.visualAnalysis || null;
  const imagesAnalyzedCount = aiAnalysisData?.engines?.gemini?.imagesAnalyzed || (savedPhotoEstimate as any)?.visual_analysis?.images_analyzed || 0;
  const conflictAlerts = aiAnalysisData?.conflictAlerts || (savedPhotoEstimate as any)?.visual_analysis?.conflict_alerts || [];

  // Conflict HTML
  let conflictHtml = '';
  if (conflictAlerts.length > 0) {
    const conflictRows = conflictAlerts.map((c: any) =>
      '<tr style="font-size:11px;border-bottom:1px solid #fecaca;">' +
        '<td style="padding:5px 8px;font-weight:700;color:#dc2626;">🔴 ' + (c.type || 'MISMATCH') + '</td>' +
        '<td style="padding:5px 8px;">' + (c.visual_value?.toLocaleString() || '?') + '</td>' +
        '<td style="padding:5px 8px;">' + (c.db_value?.toLocaleString() || '?') + '</td>' +
        '<td style="padding:5px 8px;font-weight:700;color:#dc2626;">+' + (c.deviation_pct || 0) + '%</td>' +
      '</tr>'
    ).join('');
    conflictHtml = '<div class="pdf-section" style="margin-bottom:10px;border:2px solid #dc2626;border-radius:6px;overflow:hidden;">' +
      '<div style="background:#fef2f2;padding:10px 14px;border-bottom:1px solid #fecaca;">' +
        '<div style="font-size:13px;font-weight:700;color:#991b1b;">⚠️ CONFLICT DETECTED — Visual vs Database</div>' +
        '<div style="font-size:9px;color:#dc2626;margin-top:2px;">Automatic conflict detection by Gemini Files & Contracts Engine</div>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;">' +
        '<thead><tr style="background:#fff5f5;font-size:9px;text-transform:uppercase;color:#dc2626;">' +
          '<th style="padding:6px 8px;text-align:left;">Conflict</th><th style="padding:6px 8px;">Visual</th><th style="padding:6px 8px;">DB</th><th style="padding:6px 8px;">Deviation</th>' +
        '</tr></thead><tbody>' + conflictRows + '</tbody></table></div>';
  }

  // Photo evidence table
  if (photoCits.length > 0 || blueprintCit || projectDocCount > 0) {
    const geminiSiteFindings: any[] = geminiVisual?.sitePhotoFindings || (savedPhotoEstimate as any)?.engines?.gemini?.analysis?.visualAnalysis?.sitePhotoFindings || [];

    const photoRows = photoCits.slice(0, 12).map((pc, i) => {
      const ts = pc.timestamp ? new Date(pc.timestamp).toLocaleDateString() : '—';
      const cId = pc.id?.slice(0, 8) || '—';
      const desc = esc((pc.answer || '').slice(0, 80));
      const matchedFinding = geminiSiteFindings[i];

      let aiVisionText = '';
      if (matchedFinding) {
        const obs = (matchedFinding.observations || []).slice(0, 3).join('; ');
        const stage = matchedFinding.stage || '';
        const trades = (matchedFinding.tradesVisible || []).join(', ');
        const quality = matchedFinding.qualityScore ? `Quality: ${matchedFinding.qualityScore}/100` : '';
        aiVisionText = [obs, stage ? `Stage: ${stage}` : '', trades ? `Trades: ${trades}` : '', quality].filter(Boolean).join(' · ').slice(0, 200) || '✓ Analyzed';
      } else {
        aiVisionText = '⏳ Pending';
      }

      return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
        '<td style="padding:5px 8px;color:#6b7280;">' + (pc.cite_type === 'VISUAL_VERIFICATION' ? '🔍' : '📷') + ' #' + (i + 1) + '</td>' +
        '<td style="padding:5px 8px;font-family:monospace;font-size:10px;color:#059669;">cite:' + cId + '</td>' +
        '<td style="padding:5px 8px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + desc + '</td>' +
        '<td style="padding:5px 8px;color:#7c3aed;font-size:10px;max-width:250px;line-height:1.4;white-space:normal;">' + esc(aiVisionText) + '</td>' +
        '<td style="padding:5px 8px;color:#9ca3af;font-size:10px;">' + ts + '</td>' +
      '</tr>';
    }).join('');

    // AI Vision summary
    let aiVisionSummaryHtml = '';
    if (geminiVisual && imagesAnalyzedCount > 0) {
      let bpRows = '';
      if ((geminiVisual.blueprintFindings || []).length > 0) {
        bpRows = '<div style="margin-top:8px;"><div style="font-size:11px;color:#0891b2;font-weight:700;margin-bottom:4px;">📐 Blueprint Analysis</div>' +
          '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;"><thead><tr style="background:#f0fdfa;font-size:9px;text-transform:uppercase;color:#0d9488;"><th style="padding:4px 8px;">File</th><th style="padding:4px 8px;">Type</th><th style="padding:4px 8px;">Dimensions</th><th style="padding:4px 8px;">Observations</th></tr></thead><tbody>' +
          (geminiVisual.blueprintFindings || []).map((bp: any) =>
            '<tr style="font-size:10px;border-bottom:1px solid #f0f0f0;"><td style="padding:4px 8px;font-weight:600;">' + esc(bp.fileName || 'Blueprint') + '</td>' +
            '<td style="padding:4px 8px;">' + esc(bp.type || 'Drawing') + '</td>' +
            '<td style="padding:4px 8px;">' + esc(bp.dimensions || '—') + '</td>' +
            '<td style="padding:4px 8px;">' + esc((bp.observations || []).slice(0, 3).join('; ')) + '</td></tr>'
          ).join('') + '</tbody></table></div>';
      }
      aiVisionSummaryHtml = '<div style="margin-top:10px;padding:8px 12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
          '<span style="font-size:12px;">🔍</span>' +
          '<div style="font-size:11px;font-weight:700;color:#0c4a6e;">AI Files & Contracts Summary</div>' +
          '<span style="background:#06b6d4;color:white;font-size:8px;padding:2px 8px;border-radius:10px;font-weight:700;margin-left:auto;">' + imagesAnalyzedCount + ' images analyzed</span>' +
        '</div>' +
        (geminiVisual.overallVisualScore ? '<div style="font-size:10px;color:#374151;">Overall Visual Score: <strong style="color:' + ((geminiVisual.overallVisualScore || 0) >= 70 ? '#16a34a' : '#ca8a04') + ';">' + geminiVisual.overallVisualScore + '/100</strong></div>' : '') +
        bpRows +
      '</div>';
    }

    visualHtml = '<div class="pdf-section" style="margin-bottom:10px;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<span style="font-size:15px;">📁</span>' +
        '<div style="font-size:13px;font-weight:700;color:#1e3a5f;">Files & Contracts Audit</div>' +
        '<span style="background:rgba(59,130,246,0.15);color:#3b82f6;font-size:8px;padding:2px 8px;border-radius:10px;font-weight:700;margin-left:auto;">🔍 GEMINI ENGINE</span>' +
      '</div>' +
      '<div style="font-size:10px;color:#6b7280;margin-bottom:6px;">' + photoCits.length + ' visual asset(s) · ' + (blueprintCit ? '1 blueprint' : 'No blueprint') + ' · ' + projectDocCount + ' doc(s) in storage' + (imagesAnalyzedCount > 0 ? ' · <span style="color:#06b6d4;font-weight:600;">' + imagesAnalyzedCount + ' AI-analyzed</span>' : '') + '</div>' +
      conflictHtml +
      (photoRows ? '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
        '<thead><tr style="background:#f0fdf4;font-size:9px;text-transform:uppercase;color:#059669;">' +
          '<th style="padding:6px 8px;">Asset</th><th style="padding:6px 8px;">Citation</th><th style="padding:6px 8px;">Description</th><th style="padding:6px 8px;">AI Vision Analysis</th><th style="padding:6px 8px;">Date</th>' +
        '</tr></thead><tbody>' + photoRows + '</tbody></table>' : '') +
      aiVisionSummaryHtml +
    '</div>';
  }

  // ---- SITE PRESENCE LOG ----
  let sitePresenceHtml = '';
  if (namedCheckins.length > 0) {
    const { format } = await import('date-fns');
    const checkinRows = namedCheckins.slice(0, 15).map((c: any) => {
      const inTime = new Date(c.checked_in_at);
      const outTime = c.checked_out_at ? new Date(c.checked_out_at) : null;
      const durationMs = (outTime || new Date()).getTime() - inTime.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const mins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      const weather = c.weather_snapshot || {};
      const weatherStr = weather.temp != null ? `${Math.round(weather.temp)}° ${weather.description || ''}` : '—';
      const statusBg = !c.checked_out_at ? '#dcfce7' : '#f9fafb';
      const statusColor = !c.checked_out_at ? '#166534' : '#6b7280';
      const statusText = !c.checked_out_at ? '● ACTIVE' : '✓ Completed';

      const checkinDay = format(inTime, 'yyyy-MM-dd');
      const dayTasks = completedTasksByDay.get(checkinDay) || [];

      let taskSubRow = '';
      if (dayTasks.length > 0) {
        const taskItems = dayTasks.slice(0, 4).map(t =>
          '<span style="display:inline-block;background:#dcfce7;color:#166534;padding:1px 6px;border-radius:8px;font-size:8px;margin:1px 2px;">✓ ' + esc(t.title) + '</span>'
        ).join('');
        const extraCount = dayTasks.length > 4 ? ` <span style="font-size:8px;color:#6b7280;">+${dayTasks.length - 4} more</span>` : '';
        taskSubRow = '<tr style="background:#f0fdf4;border-bottom:1px solid #bbf7d0;">' +
          '<td colspan="6" style="padding:3px 8px;font-size:8px;color:#166534;">📋 Tasks completed this day: ' + taskItems + extraCount + '</td>' +
        '</tr>';
      }

      return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
        '<td style="padding:5px 8px;font-weight:600;">' + esc(c.user_name) + '</td>' +
        '<td style="padding:5px 8px;color:#6b7280;">' + format(inTime, 'MMM d, HH:mm') + '</td>' +
        '<td style="padding:5px 8px;color:#6b7280;">' + (outTime ? format(outTime, 'HH:mm') : '—') + '</td>' +
        '<td style="padding:5px 8px;font-weight:600;">' + duration + '</td>' +
        '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">' + esc(weatherStr) + '</td>' +
        '<td style="padding:5px 8px;text-align:center;"><span style="background:' + statusBg + ';color:' + statusColor + ';font-size:9px;padding:2px 8px;border-radius:10px;font-weight:600;">' + statusText + '</span></td>' +
      '</tr>' + taskSubRow;
    }).join('');

    const totalSessions = namedCheckins.length;
    const uniqueWorkers = new Set(namedCheckins.map((c: any) => c.user_name)).size;
    const totalTasksDone = Array.from(completedTasksByDay.values()).reduce((s, arr) => s + arr.length, 0);

    sitePresenceHtml = '<div class="pdf-section" style="margin-bottom:10px;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<span style="font-size:15px;">👷</span>' +
        '<div style="font-size:13px;font-weight:700;color:#1e3a5f;">Site Presence Log</div>' +
      '</div>' +
      '<div style="font-size:10px;color:#6b7280;margin-bottom:6px;">' + totalSessions + ' sessions · ' + uniqueWorkers + ' worker(s) · ' + totalTasksDone + ' task(s) completed</div>' +
      '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
        '<thead><tr style="background:#ecfdf5;font-size:9px;text-transform:uppercase;color:#059669;">' +
          '<th style="padding:6px 8px;">Worker</th><th style="padding:6px 8px;">In</th><th style="padding:6px 8px;">Out</th><th style="padding:6px 8px;">Duration</th><th style="padding:6px 8px;">Weather</th><th style="padding:6px 8px;text-align:center;">Status</th>' +
        '</tr></thead><tbody>' + checkinRows + '</tbody></table>' +
    '</div>';
  }

  // ---- ASSEMBLE HTML ----
  const { buildUnionPdfHeader, buildUnionPdfFooter } = await import('@/lib/pdfGenerator');
  const header = buildUnionPdfHeader({
    docType: 'M.E.S.S.A. Site Intelligence Report',
    contractorName: profile.company_name || undefined,
    contractorPhone: profile.phone || undefined,
    contractorEmail: userEmail || undefined,
    contractorWebsite: profile.company_website || undefined,
    dateStr: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  });
  const footer = buildUnionPdfFooter({
    contractorName: profile.company_name || undefined,
    docNumber: 'SI-' + projectId.slice(0, 8).toUpperCase(),
  });

  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '* { margin: 0; padding: 0; box-sizing: border-box; }' +
    'body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #1f2937; padding: 18px 22px; max-width: 800px; margin: 0 auto; font-size: 10.5px; line-height: 1.3; }' +
    '.pdf-section { margin-bottom: 3px; margin-top: 1px; }' +
    'table { font-size: 10px; border-spacing: 0; margin-bottom: 1px; }' +
    'tr { break-inside: avoid !important; page-break-inside: avoid !important; }' +
    'thead { display: table-header-group; }' +
    '</style></head><body>' +
    header +
    '<div class="pdf-section" style="text-align:center;margin-bottom:14px;">' +
      '<div style="font-size:15px;font-weight:700;color:#1e1b4b;">' + esc(projName) + '</div>' +
      (projAddr ? '<div style="font-size:9px;color:#9ca3af;margin-top:1px;">' + esc(projAddr) + '</div>' : '') +
      '<div style="font-size:8px;color:#9ca3af;margin-top:1px;">Generated: ' + new Date().toLocaleString() + '</div>' +
    '</div>' +
    dualEngineHeader +
    obcHtml +
    obcChecklistHtml +
    visualHtml +
    sitePresenceHtml +
    '<div class="pdf-section" style="margin-top:12px;margin-bottom:8px;padding:10px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;">' +
      '<div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:4px;">⚖️ Building Code Alignment Notice</div>' +
      '<p style="font-size:9px;color:#78350f;line-height:1.5;margin:0;">This automated analysis is for informational purposes only. BuildUnion/MESSA does not replace professional engineering review or municipal building inspector approval. Users are responsible for ensuring full alignment with all applicable building codes, safety regulations, and obtaining required permits before commencing work.</p>' +
    '</div>' +
    footer +
  '</body></html>';

  return html;
}
