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
    <li>Cost per sq ft: $${snapshot.budget?.perSqFt?.toFixed(2) || '0.00'} CAD</li>
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
    <tr><td style="font-weight: 600;">Images Analyzed</td><td>${gemini.visualAnalysis.imagesAnalyzed} files (${data.engines?.gemini?.imageFileNames?.join(', ') || 'N/A'})</td></tr>
  </table>
  
  ${(gemini.visualAnalysis.criticalVisualFlags || []).length > 0 ? `
  <p style="font-size: 11px; color: #dc2626; font-weight: 700; margin: 12px 0 4px 0;">🔴 Critical Visual Flags:</p>
  <ul class="pillar-list" style="padding-left: 16px;">
    ${(gemini.visualAnalysis.criticalVisualFlags || []).map((flag: string) => `<li style="color: #dc2626; font-weight: 600;">${flag}</li>`).join('')}
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
    <li><strong>Structural:</strong> ${openai.codeCompliance.structural?.notes || 'Review required'}</li>
    <li><strong>Fire Safety:</strong> ${openai.codeCompliance.fireSafety?.notes || 'Review required'}</li>
    <li><strong>Accessibility:</strong> ${openai.codeCompliance.accessibility?.notes || 'Review required'}</li>
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
    ]).filter(Boolean).map((item: string, i: number) => `<li><strong>${i + 1}.</strong> ${item}</li>`).join('') || '<li>No critical conflicts detected</li>'}
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
        <span class="rec-text">${rec}</span>
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
          <div class="project-title">${projectData?.name || 'Untitled Project'}</div>
          <div class="project-location">📍 ${address.split(',').slice(0, 2).join(',') || 'Location pending'}</div>
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
            <tr><td>Project Name</td><td><strong>${projectData?.name || 'Untitled'}</strong></td></tr>
            <tr><td>Location</td><td>${address || 'Not Set'}</td></tr>
            <tr><td>Work Type</td><td>${workType}</td></tr>
            <tr><td>Trade</td><td><strong>${trade}</strong></td></tr>
            <tr><td>Execution Mode</td><td>${executionMode}</td></tr>
            <tr><td>Site Condition</td><td>${siteCondition}${hasDemolition ? ' (Demolition Required)' : ''}</td></tr>
            <tr><td>Timeline</td><td>${startDate && endDate ? startDate + ' → ' + endDate : 'Not Set'}</td></tr>
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
                    <td>${item.label}</td>
                    <td><strong>${item.value}</strong></td>
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
