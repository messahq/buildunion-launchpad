// ============================================
// STAGE 8: Report Generation Handlers (extracted)
// Handles: MESSA Synthesis, DNA Report, Site Intel,
//          Invoice, Summary generation
// ============================================

import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Citation } from "@/types/citation";
import { InvoiceData } from "@/lib/invoiceGenerator";
import { buildMessaSynthesisHTML as buildMessaSynthesisHTMLFn, buildSummaryHTML, buildDnaReportHTML, buildSiteIntelHTML } from "./htmlBuilders";
import type { DnaPillar } from "./htmlBuilders";
import type { DocumentCategory, DocumentWithCategory, TaskWithChecklist } from "./types";

// ============================================
// HOOK PARAMS
// ============================================
export interface UseStage8ReportsParams {
  projectId: string;
  userId: string;
  userRole: string;
  citations: Citation[];
  projectData: { name: string; address: string; status: string; trade: string | null } | null;
  financialSummary: { material_cost: number | null; labor_cost: number | null; total_cost: number | null } | null;
  teamMembers: { id: string; role: string; name: string; userId: string; primary_trade?: string; hst_number?: string }[];
  tasks: TaskWithChecklist[];
  documents: DocumentWithCategory[];
  contracts: { id: string; contract_number: string; status: string; total_amount: number | null; share_token?: string | null; project_name?: string | null; client_name?: string | null; client_email?: string | null; contractor_name?: string | null; contractor_email?: string | null; start_date?: string | null; estimated_end_date?: string | null; contractor_signature?: unknown; client_signature?: unknown; client_signed_at?: string | null; sent_to_client_at?: string | null; client_viewed_at?: string | null }[];
  obcComplianceResults: {
    sections: Array<{ section_number: string; section_title: string; content: string; relevance_score: number; source: string }>;
    loading: boolean;
    error: string | null;
    lastCheckedAt: string | null;
  };
  canGenerateInvoice: () => boolean;
  getUpgradeMessage: (feature: string) => string;

  // State setters
  setIsGeneratingAI: (v: boolean) => void;
  setIsGeneratingSummary: (v: boolean) => void;
  setIsGeneratingDnaReport: (v: boolean) => void;
  setIsGeneratingSiteIntel: (v: boolean) => void;
  setIsGeneratingInvoice: (v: boolean) => void;
  setMessaSynthesisData: (v: any) => void;
  setMessaPreviewHtml: (v: string) => void;
  setShowMessaPreview: (v: boolean) => void;
  setSummaryPreviewHtml: (v: string) => void;
  setShowSummaryPreview: (v: boolean) => void;
  setDnaReportHtml: (v: string) => void;
  setDnaReportBlobUrl: (v: string | null) => void;
  setDnaReportFilename: (v: string) => void;
  setShowDnaPreviewDialog: (v: boolean) => void;
  setDnaScannedPillars: (v: React.SetStateAction<Set<number>>) => void;
  setDnaScanningPillar: (v: number | null) => void;
  setActiveOrbitalPanel: (v: string) => void;
  setSiteIntelHtml: (v: string) => void;
  setSiteIntelBlobUrl: (v: string | null) => void;
  setSiteIntelFilename: (v: string) => void;
  setShowSiteIntelPreviewDialog: (v: boolean) => void;
  setInvoicePreviewData: (v: InvoiceData | null) => void;
  setInvoicePreviewHtml: (v: string) => void;
  setShowInvoicePreview: (v: boolean) => void;
  setCitations: React.Dispatch<React.SetStateAction<Citation[]>>;
  setDocuments: React.Dispatch<React.SetStateAction<DocumentWithCategory[]>>;

  // DNA email state
  dnaEmailClientEmail: string;
  dnaEmailClientName: string;
  setIsSendingDnaEmail: (v: boolean) => void;
  setShowDnaEmailDialog: (v: boolean) => void;
  setDnaEmailClientName: (v: string) => void;
  setDnaEmailClientEmail: (v: string) => void;
}

// ============================================
// HOOK
// ============================================
export function useStage8Reports(params: UseStage8ReportsParams) {
  const {
    projectId, userId, userRole,
    citations, projectData, financialSummary, teamMembers, tasks, documents, contracts,
    obcComplianceResults,
    canGenerateInvoice, getUpgradeMessage,
    setIsGeneratingAI, setIsGeneratingSummary, setIsGeneratingDnaReport, setIsGeneratingSiteIntel, setIsGeneratingInvoice,
    setMessaSynthesisData, setMessaPreviewHtml, setShowMessaPreview,
    setSummaryPreviewHtml, setShowSummaryPreview,
    setDnaReportHtml, setDnaReportBlobUrl, setDnaReportFilename, setShowDnaPreviewDialog,
    setDnaScannedPillars, setDnaScanningPillar, setActiveOrbitalPanel,
    setSiteIntelHtml, setSiteIntelBlobUrl, setSiteIntelFilename, setShowSiteIntelPreviewDialog,
    setInvoicePreviewData, setInvoicePreviewHtml, setShowInvoicePreview,
    setCitations, setDocuments,
    dnaEmailClientEmail, dnaEmailClientName,
    setIsSendingDnaEmail, setShowDnaEmailDialog, setDnaEmailClientName, setDnaEmailClientEmail,
  } = params;

  // ============================================
  // BUILD MESSA SYNTHESIS HTML (memoized helper)
  // ============================================
  const buildMessaSynthesisHTMLMemo = useCallback((data: any) => {
    return buildMessaSynthesisHTMLFn(data, { citations, tasks });
  }, [citations, tasks]);

  // ============================================
  // M.E.S.S.A. SYNTHESIS HANDLER
  // ============================================
  const handleMessaSynthesis = useCallback(async () => {
    setIsGeneratingAI(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Please sign in to use M.E.S.S.A. Synthesis');
        return;
      }
      
      toast.loading('M.E.S.S.A. Synthesis in progress...', { id: 'messa-synth', description: 'Dual Engine Analysis with GPT-5 + Gemini Pro' });
      
      const { data, error } = await supabase.functions.invoke('ai-project-analysis', {
        body: {
          projectId,
          analysisType: 'synthesis',
        },
      });
      
      if (error) {
        if (error.message?.includes('Rate limit')) {
          toast.error('AI rate limit reached. Please try again in a few minutes.', { id: 'messa-synth' });
        } else if (error.message?.includes('credits')) {
          toast.error('AI credits exhausted. Please add credits to continue.', { id: 'messa-synth' });
        } else {
          throw error;
        }
        return;
      }
      
      if (data) {
        const html = buildMessaSynthesisHTMLMemo(data);
        setMessaSynthesisData(data);
        setMessaPreviewHtml(html);
        setShowMessaPreview(true);
        
        toast.success('M.E.S.S.A. Synthesis Complete!', { 
          id: 'messa-synth',
          description: data.dualEngineUsed ? '✓ Dual Engine (GPT-5 + Gemini Pro)' : 'Single Engine Analysis',
          duration: 5000,
        });
        
        console.log('[M.E.S.S.A. Synthesis Result]', data);
      }
    } catch (err) {
      console.error('[Stage8] M.E.S.S.A. Synthesis failed:', err);
      toast.error('M.E.S.S.A. Synthesis failed. Please try again.', { id: 'messa-synth' });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [projectId, buildMessaSynthesisHTMLMemo, setIsGeneratingAI, setMessaSynthesisData, setMessaPreviewHtml, setShowMessaPreview]);

  // Legacy alias
  const handleAIAnalysis = handleMessaSynthesis;

  // ============================================
  // DNA REPORT PDF GENERATION
  // ============================================
  const handleDnaReportPdf = useCallback(async () => {
    setIsGeneratingDnaReport(true);
    
    // STEP 0: Knight Rider Radar Scanner
    setDnaScannedPillars(new Set());
    setDnaScanningPillar(0);
    
    const pillarKeys = ['basics', 'area', 'trade', 'team', 'timeline', 'docs', 'weather', 'financial', 'compliance'];
    
    setActiveOrbitalPanel('messa-deep-audit');
    
    let aiAnalysisData: any = null;
    let obcDetailedResult: any = null;
    try {
      toast.loading('Step 1/4 — Fetching project images...', { id: 'dna-analysis', description: 'Scanning Project Basics & Area Dimensions' });
      
      await new Promise(r => setTimeout(r, 800));
      setDnaScannedPillars(prev => new Set([...prev, 0]));
      setDnaScanningPillar(1);
      
      await new Promise(r => setTimeout(r, 600));
      setDnaScannedPillars(prev => new Set([...prev, 1]));
      setDnaScanningPillar(2);
      
      toast.loading('Step 2/4 — AI Visual Analysis running...', { id: 'dna-analysis', description: 'Scanning Trade & Team Architecture' });

      const analysisPromise = supabase.functions.invoke('ai-project-analysis', {
        body: { projectId, analysisType: 'synthesis' },
      });
      
      const tradeCitForObc = citations.find(c => c.cite_type === 'TRADE_SELECTION');
      const workTypeCitForObc = citations.find(c => c.cite_type === 'WORK_TYPE');
      const gfaCitForObc = citations.find(c => c.cite_type === 'GFA_LOCK');
      const locationCitForObc = citations.find(c => c.cite_type === 'LOCATION');
      const templateCitForObc = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      
      const templateMeta = templateCitForObc?.metadata as any;
      const materialsForObc = Array.isArray(templateMeta?.items)
        ? templateMeta.items.slice(0, 15).map((it: any) => ({ name: it.name || it.item_name || 'Unknown' }))
        : [];
      
      const obcCheckPromise = supabase.functions.invoke('obc-status-check', {
        body: {
          projectData: {
            project_type: workTypeCitForObc?.answer || 'Renovation',
            scope_of_work: workTypeCitForObc?.answer || '',
            confirmed_area_sqft: gfaCitForObc?.answer ? parseFloat(String(gfaCitForObc.answer)) : 0,
            materials: materialsForObc,
            blueprint_status: citations.some(c => c.cite_type === 'BLUEPRINT_UPLOAD') ? 'uploaded' : 'none',
            location: locationCitForObc?.answer || 'Ontario, Canada',
            trade_type: tradeCitForObc?.answer || 'general_contractor',
          }
        }
      });
      
      await new Promise(r => setTimeout(r, 700));
      setDnaScannedPillars(prev => new Set([...prev, 2]));
      setDnaScanningPillar(3);
      
      await new Promise(r => setTimeout(r, 700));
      setDnaScannedPillars(prev => new Set([...prev, 3]));
      setDnaScanningPillar(4);
      
      const [analysisRes, obcRes] = await Promise.allSettled([analysisPromise, obcCheckPromise]);
      
      const analysisResult = analysisRes.status === 'fulfilled' ? analysisRes.value?.data : null;
      const analysisError = analysisRes.status === 'fulfilled' ? analysisRes.value?.error : analysisRes.reason;
      
      if (obcRes.status === 'fulfilled' && obcRes.value?.data?.result) {
        obcDetailedResult = obcRes.value.data.result;
        console.log('[DNA Report] OBC detailed result:', obcDetailedResult);
      } else {
        console.warn('[DNA Report] OBC check failed:', obcRes.status === 'rejected' ? obcRes.reason : obcRes.value?.error);
      }
      
      setDnaScannedPillars(prev => new Set([...prev, 4]));
      setDnaScanningPillar(5);
      
      if (analysisError) {
        console.warn('[DNA Report] AI analysis error:', analysisError);
        toast.loading('Step 3/4 — Compiling report data...', { id: 'dna-analysis', description: 'Scanning Documents & Weather' });
      } else if (analysisResult) {
        aiAnalysisData = analysisResult;
        toast.loading('Step 3/4 — Compiling report data...', { id: 'dna-analysis', description: 'Scanning Documents & Weather' });
      }
      
      await new Promise(r => setTimeout(r, 600));
      setDnaScannedPillars(prev => new Set([...prev, 5]));
      setDnaScanningPillar(6);
      
      await new Promise(r => setTimeout(r, 600));
      setDnaScannedPillars(prev => new Set([...prev, 6]));
      setDnaScanningPillar(7);
      
      toast.loading('Step 4/4 — Generating PDF...', { id: 'dna-analysis', description: 'Scanning Financial Summary & Building Code Alignment' });
      
      await new Promise(r => setTimeout(r, 700));
      setDnaScannedPillars(prev => new Set([...prev, 7]));
      setDnaScanningPillar(8);
      
      await new Promise(r => setTimeout(r, 600));
      setDnaScannedPillars(prev => new Set([...prev, 8]));
      setDnaScanningPillar(null);
    } catch (analysisErr) {
      console.warn('[DNA Report] AI analysis skipped:', analysisErr);
      setDnaScannedPillars(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]));
      setDnaScanningPillar(null);
      toast.loading('Generating PDF...', { id: 'dna-analysis', description: 'AI analysis unavailable, building report from project data' });
    }
    try {
      const nameCit = citations.find(c => c.cite_type === 'PROJECT_NAME');
      const locationCit = citations.find(c => c.cite_type === 'LOCATION');
      const workTypeCit = citations.find(c => c.cite_type === 'WORK_TYPE');
      const gfaCit = citations.find(c => c.cite_type === 'GFA_LOCK');
      const blueprintCit = citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD');
      const siteCondCit = citations.find(c => c.cite_type === 'SITE_CONDITION');
      const tradeCit = citations.find(c => c.cite_type === 'TRADE_SELECTION');
      const templateCit = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      const execModeCit = citations.find(c => c.cite_type === 'EXECUTION_MODE');
      const teamStructCit = citations.find(c => c.cite_type === 'TEAM_STRUCTURE');
      const teamInviteCit = citations.find(c => c.cite_type === 'TEAM_MEMBER_INVITE');
      const teamPermCit = citations.find(c => c.cite_type === 'TEAM_PERMISSION_SET');
      const teamSizeCit = citations.find(c => c.cite_type === 'TEAM_SIZE');
      let timelineCit = citations.find(c => c.cite_type === 'TIMELINE');
      let endDateCit = citations.find(c => c.cite_type === 'END_DATE');
      const dnaCit = citations.find(c => c.cite_type === 'DNA_FINALIZED');
      const photoCits = citations.filter(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION');

      // Contract dates take priority (Operational Truth)
      let freshContracts = contracts;
      try {
        const { data: freshContractData } = await supabase
          .from('contracts')
          .select('id, contract_number, status, start_date, estimated_end_date')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        if (freshContractData && freshContractData.length > 0) {
          freshContracts = freshContractData as any;
          console.log('[DNA Report] ✓ Fresh contracts fetched:', freshContractData.length);
        }
      } catch (_) { /* fallback to state */ }
      
      const activeContract = freshContracts.find(c => c.status !== 'cancelled' && (c.start_date || c.estimated_end_date));
      if (activeContract) {
        if (activeContract.start_date) {
          timelineCit = {
            id: `contract_timeline_${Date.now()}`, cite_type: 'TIMELINE', question_key: 'timeline',
            answer: activeContract.start_date, value: 'scheduled', timestamp: new Date().toISOString(),
            metadata: { start_date: activeContract.start_date, source: 'contracts' },
          } as Citation;
        }
        if (activeContract.estimated_end_date) {
          endDateCit = {
            id: `contract_end_date_${Date.now()}`, cite_type: 'END_DATE', question_key: 'end_date',
            answer: activeContract.estimated_end_date, value: activeContract.estimated_end_date,
            timestamp: new Date().toISOString(),
            metadata: { end_date: activeContract.estimated_end_date, source: 'contracts' },
          } as Citation;
        }
        console.log('[DNA Report] ✓ Timeline overridden from contracts:', activeContract.start_date, '→', activeContract.estimated_end_date);
      }

      // Cap photo citation timestamps
      const reportGeneratedAt = new Date();
      const cappedPhotoCits = photoCits.map(pc => {
        if (pc.timestamp) {
          const citDate = new Date(pc.timestamp);
          if (citDate > reportGeneratedAt) {
            return { ...pc, timestamp: reportGeneratedAt.toISOString() };
          }
        }
        return pc;
      });
      const weatherCit = citations.find(c => c.cite_type === 'WEATHER_ALERT');
      const demoPriceCit = citations.find(c => c.cite_type === 'DEMOLITION_PRICE');
      const budgetCit = citations.find(c => c.cite_type === 'BUDGET');
      const allTeamInviteCits = citations.filter(c => c.cite_type === 'TEAM_MEMBER_INVITE');
      const sitePresenceCits = citations.filter(c => c.cite_type === 'SITE_PRESENCE');

      // Fetch site check-in records AND completed tasks
      let siteCheckins: any[] = [];
      let completedTasksByDay: Map<string, { title: string; assignee: string; status: string }[]> = new Map();
      let allProjectTasks: any[] = [];
      try {
        const [checkinRes, tasksRes] = await Promise.all([
          supabase
            .from('site_checkins')
            .select('id, user_id, checked_in_at, checked_out_at, weather_snapshot')
            .eq('project_id', projectId)
            .order('checked_in_at', { ascending: false })
            .limit(20),
          supabase
            .from('project_tasks')
            .select('id, title, status, assigned_to, updated_at, due_date')
            .eq('project_id', projectId)
            .is('archived_at', null)
        ]);
        
        allProjectTasks = tasksRes.data || [];
        
        if (checkinRes.data) {
          const allUserIds = [...new Set([
            ...checkinRes.data.map(c => c.user_id),
            ...allProjectTasks.map(t => t.assigned_to)
          ])];
          const { data: checkinProfiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', allUserIds);
          const nameMap = new Map(checkinProfiles?.map(p => [p.user_id, p.full_name]) || []);
          siteCheckins = checkinRes.data.map(c => ({
            ...c,
            user_name: nameMap.get(c.user_id) || 'Unknown',
          }));
          
          const completedTasks = allProjectTasks.filter(t => t.status === 'completed' || t.status === 'done');
          for (const task of completedTasks) {
            const dayKey = format(new Date(task.updated_at), 'yyyy-MM-dd');
            if (!completedTasksByDay.has(dayKey)) completedTasksByDay.set(dayKey, []);
            completedTasksByDay.get(dayKey)!.push({
              title: task.title,
              assignee: nameMap.get(task.assigned_to) || 'Unassigned',
              status: task.status,
            });
          }
        }
      } catch (_) { /* ignore */ }

      // Fetch user profile
      let profile: { company_name?: string | null; phone?: string | null; company_website?: string | null } = {};
      try {
        const { data: bp } = await supabase
          .from('bu_profiles')
          .select('company_name, phone, company_website')
          .eq('user_id', userId)
          .maybeSingle();
        if (bp) profile = bp;
      } catch (_) { /* ignore */ }

      // Fetch saved AI visual analysis + line items
      let savedPhotoEstimate: any = null;
      let savedLineItems: any[] = [];
      let savedTemplateItems: any[] = [];
      try {
        const { data: summaryRow } = await supabase
          .from('project_summaries')
          .select('photo_estimate, line_items, template_items')
          .eq('project_id', projectId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (summaryRow?.photo_estimate) savedPhotoEstimate = summaryRow.photo_estimate;
        if (Array.isArray(summaryRow?.line_items)) savedLineItems = summaryRow.line_items as any[];
        if (Array.isArray(summaryRow?.template_items)) savedTemplateItems = summaryRow.template_items as any[];
      } catch (_) { /* ignore */ }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userEmail = authUser?.email || '';

      const pillars: DnaPillar[] = [
        { label: '1 — Project Basics', sub: 'Name × Location × Work Type', icon: '🏗️', color: '#10b981', status: !!nameCit && !!locationCit && !!workTypeCit, sources: [
          { label: 'Project Name', cit: nameCit, field: 'PROJECT_NAME' },
          { label: 'Location', cit: locationCit, field: 'LOCATION' },
          { label: 'Work Type', cit: workTypeCit, field: 'WORK_TYPE' },
        ]},
        { label: '2 — Area & Dimensions', sub: 'GFA Lock × Blueprint × Site', icon: '📐', color: '#3b82f6', status: !!gfaCit, sources: [
          { label: 'GFA Lock', cit: gfaCit, field: 'GFA_LOCK' },
          { label: 'Blueprint Upload', cit: blueprintCit, field: 'BLUEPRINT_UPLOAD' },
          { label: 'Site Condition', cit: siteCondCit, field: 'SITE_CONDITION' },
        ]},
        { label: '3 — Trade & Template', sub: 'PDF RAG × Materials Table', icon: '🔬', color: '#f97316', status: !!tradeCit && !!templateCit, sources: [
          { label: 'Trade Selection', cit: tradeCit, field: 'TRADE_SELECTION' },
          { label: 'Template Lock', cit: templateCit, field: 'TEMPLATE_LOCK' },
          { label: 'Execution Mode', cit: execModeCit, field: 'EXECUTION_MODE' },
        ]},
        { label: '4 — Team Architecture', sub: 'Structure × Roles × Permissions', icon: '👥', color: '#14b8a6', status: !!teamStructCit || !!teamSizeCit || teamMembers.length > 0, sources: [
          { label: 'Team Structure', cit: teamStructCit, field: 'TEAM_STRUCTURE' },
          { label: 'Team Size', cit: teamSizeCit, field: 'TEAM_SIZE' },
          ...allTeamInviteCits.map((tc, i) => ({ label: `Member: ${tc.answer?.split('—')[0]?.trim() || `#${i+1}`}`, cit: tc, field: 'TEAM_MEMBER_INVITE' })),
          ...(allTeamInviteCits.length === 0 ? [{ label: 'Member Invites', cit: teamInviteCit, field: 'TEAM_MEMBER_INVITE' }] : []),
          { label: 'Permission Set', cit: teamPermCit, field: 'TEAM_PERMISSION_SET' },
        ]},
        { label: '5 — Execution Timeline', sub: 'Start × End × DNA Finalized', icon: '📅', color: '#6366f1', status: !!timelineCit && !!endDateCit, sources: [
          { label: 'Timeline (Start)', cit: timelineCit, field: 'TIMELINE' },
          { label: 'End Date', cit: endDateCit, field: 'END_DATE' },
          { label: 'DNA Finalized', cit: dnaCit, field: 'DNA_FINALIZED' },
        ]},
        { label: '6 — Files & Contracts', sub: 'Site Photos × AI Vision × Blueprint', icon: '📁', color: '#0ea5e9', status: cappedPhotoCits.length > 0 || !!blueprintCit, sources: [
          ...cappedPhotoCits.slice(0, 5).map((pc, i) => ({ label: `Photo ${i + 1}`, cit: pc, field: pc.cite_type || 'SITE_PHOTO' })),
          ...(cappedPhotoCits.length === 0 ? [{ label: 'Site Photo / Visual', cit: undefined as Citation | undefined, field: 'SITE_PHOTO' }] : []),
          { label: 'Blueprint', cit: blueprintCit, field: 'BLUEPRINT_UPLOAD' },
        ]},
        { label: '7 — Site Log & Location', sub: 'Alerts × Site Readiness × Presence', icon: '🌦️', color: '#06b6d4', status: siteCheckins.length > 0 || sitePresenceCits.length > 0, sources: [
          { label: 'Weather Alert', cit: weatherCit, field: 'WEATHER_ALERT' },
          { label: 'Site Condition', cit: siteCondCit, field: 'SITE_CONDITION' },
          ...sitePresenceCits.slice(0, 3).map((sp, i) => ({ label: `Site Presence #${i + 1}`, cit: sp, field: 'SITE_PRESENCE' })),
          ...(sitePresenceCits.length === 0 && siteCheckins.length === 0 ? [{ label: '⚠️ MISSING SITE LOG', cit: undefined as Citation | undefined, field: 'SITE_PRESENCE' }] : []),
        ]},
        { label: '8 — Financial Summary', sub: 'Budget × Costs × Demolition', icon: '💰', color: '#f59e0b', status: (financialSummary?.total_cost ?? 0) > 0, sources: [
          { label: 'Material Cost', cit: undefined as Citation | undefined, field: 'MATERIAL_COST' },
          { label: 'Labor Cost', cit: undefined as Citation | undefined, field: 'LABOR_COST' },
          { label: 'Demolition', cit: demoPriceCit, field: 'DEMOLITION_PRICE' },
          { label: 'Budget', cit: budgetCit, field: 'BUDGET' },
        ]},
        { label: '9 — Building Code Alignment', sub: 'OBC 2024 × Permits × Fire', icon: '⚖️', color: '#dc2626', status: (() => {
          const verifiedDocs = documents.filter(d => d.ai_analysis_status === 'verified_regulatory');
          const rejectedDocs = documents.filter(d => d.ai_analysis_status === 'rejected_non_regulatory');
          const pendingDocs = documents.filter(d => d.ai_analysis_status === 'pending');
          
          if (rejectedDocs.length > 0 && verifiedDocs.length === 0) return false;
          if (pendingDocs.length > 0 && verifiedDocs.length === 0) return false;
          
          const geminiObcStatus = aiAnalysisData?.obcCompliance?.status as string | undefined;
          const geminiObcDocsCount: number = aiAnalysisData?.obcCompliance?.documentsDetected ?? -1;
          
          if (geminiObcStatus === 'PASS') return true;
          if (geminiObcStatus === 'FAIL') return false;
          if (geminiObcStatus === 'PENDING') return false;
          if (geminiObcDocsCount === 0) return false;
          
          const hasObcData = obcComplianceResults.sections.length > 0 || !!obcDetailedResult;
          const obcStatusFail = obcDetailedResult?.obc_status === 'FAIL' || obcDetailedResult?.obc_status === 'fail';
          const permitNotObtained = obcDetailedResult?.permitStatus?.obtained === false;
          const missingSources = [
            !obcDetailedResult?.obc_status || obcStatusFail,
            permitNotObtained,
            !templateCit,
          ].filter(Boolean).length;
          return hasObcData && !obcStatusFail && !permitNotObtained && missingSources === 0;
        })(), sources: [
          ...(() => {
            const pendingDocs = documents.filter(d => d.ai_analysis_status === 'pending');
            return pendingDocs.length > 0 ? [{
              label: `🔄 ${pendingDocs.length} doc(s) being scanned by AI...`,
              cit: undefined as Citation | undefined,
              field: 'DOC_SCANNING'
            }] : [];
          })(),
          ...(() => {
            const rejectedDocs = documents.filter(d => d.ai_analysis_status === 'rejected_non_regulatory');
            return rejectedDocs.map(d => ({
              label: `🚫 REJECTED: "${d.file_name}" — ${(d.ai_analysis_result as any)?.doc_type || 'Not regulatory'} (${(d.ai_analysis_result as any)?.confidence || 'N/A'} confidence)`,
              cit: undefined as Citation | undefined,
              field: 'DOC_AUTHENTICITY'
            }));
          })(),
          ...(() => {
            const verifiedDocs = documents.filter(d => d.ai_analysis_status === 'verified_regulatory');
            return verifiedDocs.map(d => ({
              label: `✅ ${d.file_name} — AI Verified: ${(d.ai_analysis_result as any)?.doc_type || 'Regulatory'} (${(d.ai_analysis_result as any)?.confidence || ''})`,
              cit: undefined as Citation | undefined,
              field: 'OBC_COMPLIANCE'
            }));
          })(),
          ...(aiAnalysisData?.obcCompliance ? [{ 
            label: `Gemini OBC Scan: ${aiAnalysisData.obcCompliance.status} (${aiAnalysisData.obcCompliance.documentsDetected} doc${aiAnalysisData.obcCompliance.documentsDetected !== 1 ? 's' : ''} found)`, 
            cit: undefined as Citation | undefined, 
            field: 'OBC_STATUS' 
          }] : []),
          ...(aiAnalysisData?.obcCompliance?.documentNames?.slice(0, 3).map((n: string) => ({ 
            label: `📄 ${n}`, cit: undefined as Citation | undefined, field: 'OBC_COMPLIANCE' 
          })) || []),
          ...(obcComplianceResults.sections.slice(0, 3).map(s => ({ label: `§ ${s.section_number} — ${s.section_title}`, cit: undefined as Citation | undefined, field: 'OBC_COMPLIANCE' }))),
          ...(obcComplianceResults.sections.length === 0 && !obcDetailedResult && !aiAnalysisData?.obcCompliance ? [{ label: '⚠️ No OBC / permit documents found', cit: undefined as Citation | undefined, field: 'OBC_COMPLIANCE' }] : []),
          ...(obcDetailedResult?.obc_status ? [{ label: `OBC Status: ${obcDetailedResult.obc_status}`, cit: undefined as Citation | undefined, field: 'OBC_STATUS' }] : []),
          { label: 'Material Specifications', cit: templateCit, field: 'TEMPLATE_LOCK' },
          { label: obcDetailedResult?.permitStatus?.obtained ? 'Building Permit ✓' : 'Building Permit ❌ NOT OBTAINED', cit: undefined as Citation | undefined, field: 'BUILDING_PERMIT' },
          { label: 'Fire Resistance Rating', cit: undefined as Citation | undefined, field: 'FIRE_RESISTANCE' },
        ]},
      ];

      const passCount = pillars.filter(p => p.status).length;
      const totalPillarCount = 9;
      const pct = Math.round((passCount / totalPillarCount) * 100);
      const scoreColor = passCount === totalPillarCount ? '#10b981' : passCount >= 5 ? '#f59e0b' : '#ef4444';
      const nowStr = new Date().toISOString();
      const projName = projectData?.name || 'Project';
      const projAddr = projectData?.address || '';
      const scoreLabel = passCount === totalPillarCount ? 'PERFECT' : passCount >= 5 ? 'PARTIAL' : 'CRITICAL';

      const locationCitLocal = citations.find(c => c.cite_type === 'LOCATION');
      const demolitionCitLocal = citations.find(c => c.cite_type === 'DEMOLITION_PRICE');
      const demolitionCost = demolitionCitLocal?.metadata ? Number((demolitionCitLocal.metadata as any).price || 0) : 0;
      const gfaValue = gfaCit?.metadata ? (gfaCit.metadata as any).gfa_value || 0 : 0;

      let projectDocCount = 0;
      try {
        const { count } = await supabase
          .from('project_documents')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId);
        projectDocCount = count || 0;
      } catch (_) { /* ignore */ }

      const html = await buildDnaReportHTML({
        pillars: pillars as DnaPillar[],
        passCount,
        pct,
        scoreColor,
        scoreLabel,
        projName,
        projAddr,
        projectId,
        obcSections: obcComplianceResults.sections,
        obcDetailedResult,
        tradeCitAnswer: tradeCit?.answer || '',
        financialSummary,
        savedLineItems,
        savedTemplateItems,
        locationCitAnswer: locationCitLocal?.answer || '',
        demolitionCost,
        gfaValue,
        photoCits: cappedPhotoCits,
        blueprintCit,
        projectDocCount,
        aiAnalysisData,
        savedPhotoEstimate,
        siteCheckins,
        completedTasksByDay,
        allProjectTasks,
        geminiExecSummary: aiAnalysisData?.gemini?.exec_summary || '',
        geminiRiskFactors: aiAnalysisData?.gemini?.risk_factors || '',
        openaiCompliance: aiAnalysisData?.openai?.compliance || '',
        tasks,
        documents,
        citations,
        profile,
        userEmail,
      });

      const { generatePDFBlob } = await import('@/lib/pdfGenerator');
      const filename = 'dna-integrity-' + (projectData?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'export') + '.pdf';
      
      const blob = await generatePDFBlob(html, {
        filename,
        pageFormat: 'letter',
      });

      setDnaReportHtml(html);
      const blobUrl = URL.createObjectURL(blob);
      setDnaReportBlobUrl(blobUrl);
      setDnaReportFilename(filename);

      // Auto-save to project documents
      let savedToDocuments = false;
      const reportTimestamp = new Date().toISOString();
      const reportDateLabel = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      if (projectId) {
        try {
          const storagePath = `${projectId}/dna-report-latest.pdf`;
          await supabase.storage.from('project-documents').remove([storagePath]);
          const { error: uploadErr } = await supabase.storage
            .from('project-documents')
            .upload(storagePath, blob, { contentType: 'application/pdf' });
          
          if (uploadErr) {
            console.warn('[DNA Report] Storage upload error:', uploadErr);
          } else {
            const { data: existingDocs } = await supabase
              .from('project_documents')
              .select('id, file_name, uploaded_at')
              .eq('project_id', projectId)
              .eq('file_name', 'DNA Audit Report.pdf')
              .limit(1);

            if (existingDocs && existingDocs.length > 0) {
              const archiveDate = new Date(existingDocs[0].uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              await supabase.from('project_documents')
                .update({ file_name: `DNA Report — ${archiveDate} (archived)` })
                .eq('id', existingDocs[0].id);
            }
            
            const { error: insertErr } = await supabase.from('project_documents').insert({
              project_id: projectId,
              file_name: 'DNA Audit Report.pdf',
              file_path: storagePath,
              file_size: blob.size,
              mime_type: 'application/pdf',
              uploaded_by: userId,
              uploaded_by_name: profile?.company_name || 'Owner',
              uploaded_by_role: 'owner',
            });
            
            if (!insertErr) {
              savedToDocuments = true;
              setDocuments(prev => {
                const updated = prev.map(d => 
                  d.file_name === 'DNA Audit Report.pdf' 
                    ? { ...d, file_name: `DNA Report — archived` }
                    : d
                );
                return [...updated, {
                  id: crypto.randomUUID(),
                  file_name: 'DNA Audit Report.pdf',
                  file_path: storagePath,
                  category: 'technical' as DocumentCategory,
                }];
              });
            }
          }
        } catch (saveErr) {
          console.warn('[DNA Report] Auto-save to documents failed:', saveErr);
        }
      }

      let versionNumber = 1;
      const prevDnaCits = citations.filter(c => c.cite_type === 'DNA_FINALIZED');
      versionNumber = prevDnaCits.length + 1;

      const dnaCitation: Citation = {
        id: `cite-dna-finalized-${Date.now()}`,
        cite_type: 'DNA_FINALIZED',
        question_key: 'dna_report',
        answer: `DNA Audit Report v${versionNumber} — ${reportDateLabel}`,
        value: `DNA Report v${versionNumber} generated on ${reportDateLabel}`,
        timestamp: reportTimestamp,
        metadata: {
          filename,
          savedToDocuments,
          generatedAt: reportTimestamp,
          version: versionNumber,
          previousVersions: prevDnaCits.map(c => ({
            id: c.id,
            timestamp: c.timestamp,
            version: c.metadata?.version || 1,
          })),
        },
      };
      
      setCitations(prev => {
        const updated = [...prev, dnaCitation];
        supabase.from('project_summaries')
          .update({ verified_facts: updated as any })
          .eq('project_id', projectId)
          .then(() => {});
        return updated;
      });

      setShowDnaPreviewDialog(true);
      toast.dismiss('dna-analysis');
      toast.success('DNA Audit Report ready');
    } catch (err) {
      console.error('[DNA Report] Error:', err);
      toast.dismiss('dna-analysis');
      toast.error('Failed to generate DNA report');
    } finally {
      setIsGeneratingDnaReport(false);
    }
  }, [citations, projectData, financialSummary, teamMembers, obcComplianceResults, userId, projectId, contracts,
      setIsGeneratingDnaReport, setDnaScannedPillars, setDnaScanningPillar, setActiveOrbitalPanel,
      setDnaReportHtml, setDnaReportBlobUrl, setDnaReportFilename, setShowDnaPreviewDialog, setCitations, setDocuments, documents, tasks]);

  // ============================================
  // SEND DNA REPORT VIA EMAIL
  // ============================================
  const handleSendDnaReportEmail = useCallback(async () => {
    if (!dnaEmailClientEmail || !dnaEmailClientName) {
      toast.error('Please enter client name and email');
      return;
    }
    setIsSendingDnaEmail(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Please sign in to send reports');
        return;
      }

      const nameCit = citations.find(c => c.cite_type === 'PROJECT_NAME');
      const locationCit = citations.find(c => c.cite_type === 'LOCATION');
      const workTypeCit = citations.find(c => c.cite_type === 'WORK_TYPE');
      const gfaCit = citations.find(c => c.cite_type === 'GFA_LOCK');
      const tradeCit = citations.find(c => c.cite_type === 'TRADE_SELECTION');
      const templateCit = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      const teamStructCit = citations.find(c => c.cite_type === 'TEAM_STRUCTURE');
      const teamSizeCit = citations.find(c => c.cite_type === 'TEAM_SIZE');
      const timelineCit = citations.find(c => c.cite_type === 'TIMELINE');
      const endDateCit = citations.find(c => c.cite_type === 'END_DATE');
      const photoCits = citations.filter(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION');
      const blueprintCit = citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD');
      const weatherCit = citations.find(c => c.cite_type === 'WEATHER_ALERT');
      const siteCondCit = citations.find(c => c.cite_type === 'SITE_CONDITION');

      const pillars = [
        { label: '1 — Project Basics', icon: '🏗️', status: !!nameCit && !!locationCit && !!workTypeCit, sourceSummary: [nameCit?.answer, locationCit?.answer].filter(Boolean).join(' · ').slice(0, 60) },
        { label: '2 — Area & Dimensions', icon: '📐', status: !!gfaCit, sourceSummary: gfaCit?.answer?.slice(0, 60) || '' },
        { label: '3 — Trade & Template', icon: '🔬', status: !!tradeCit && !!templateCit, sourceSummary: tradeCit?.answer?.slice(0, 60) || '' },
        { label: '4 — Team Architecture', icon: '👥', status: !!teamStructCit || !!teamSizeCit || teamMembers.length > 0, sourceSummary: `${teamMembers.length} members` },
        { label: '5 — Execution Timeline', icon: '📅', status: !!timelineCit && !!endDateCit, sourceSummary: [timelineCit?.answer, endDateCit?.answer].filter(Boolean).join(' → ').slice(0, 60) },
        { label: '6 — Files & Contracts', icon: '📁', status: photoCits.length > 0 || !!blueprintCit, sourceSummary: `${photoCits.length} photos${blueprintCit ? ' + blueprint' : ''}` },
        { label: '7 — Site Log & Location', icon: '🌦️', status: !!weatherCit || !!siteCondCit || citations.some(c => c.cite_type === 'SITE_PRESENCE'), sourceSummary: citations.filter(c => c.cite_type === 'SITE_PRESENCE').length > 0 ? `${citations.filter(c => c.cite_type === 'SITE_PRESENCE').length} presence log(s)` : (weatherCit?.answer?.slice(0, 60) || siteCondCit?.answer?.slice(0, 60) || '') },
        { label: '8 — Financial Summary', icon: '💰', status: (financialSummary?.total_cost ?? 0) > 0, sourceSummary: financialSummary?.total_cost ? `$${financialSummary.total_cost.toLocaleString()}` : '' },
        { label: '9 — Building Code Alignment', icon: '⚖️', status: obcComplianceResults.sections.length > 0, sourceSummary: obcComplianceResults.sections.length > 0 ? `${obcComplianceResults.sections.length} OBC sections` : 'Pending' },
      ];

      const passCount = pillars.filter(p => p.status).length;
      const pct = Math.round((passCount / 9) * 100);

      let profile: { company_name?: string | null; phone?: string | null; company_website?: string | null } = {};
      try {
        const { data: bp } = await supabase.from('bu_profiles').select('company_name, phone, company_website').eq('user_id', userId).maybeSingle();
        if (bp) profile = bp;
      } catch (_) { /* ignore */ }

      const { data: { user: authUser } } = await supabase.auth.getUser();

      const response = await supabase.functions.invoke('send-dna-report', {
        body: {
          clientEmail: dnaEmailClientEmail,
          clientName: dnaEmailClientName,
          projectName: projectData?.name || 'Project',
          projectAddress: projectData?.address || '',
          projectId,
          dnaScore: pct,
          dnaPassCount: passCount,
          pillars,
          contractorName: profile.company_name || undefined,
          contractorPhone: profile.phone || undefined,
          contractorEmail: authUser?.email || undefined,
          contractorWebsite: profile.company_website || undefined,
          financialSummary: financialSummary || undefined,
        },
      });

      if (response.error) throw new Error(response.error.message || 'Failed to send email');

      toast.success(`DNA Report sent to ${dnaEmailClientEmail}`);
      setShowDnaEmailDialog(false);
      setDnaEmailClientName('');
      setDnaEmailClientEmail('');
    } catch (err: any) {
      console.error('[DNA Email] Error:', err);
      toast.error(err.message || 'Failed to send DNA report email');
    } finally {
      setIsSendingDnaEmail(false);
    }
  }, [dnaEmailClientEmail, dnaEmailClientName, citations, projectData, financialSummary, teamMembers, userId, projectId, obcComplianceResults,
      setIsSendingDnaEmail, setShowDnaEmailDialog, setDnaEmailClientName, setDnaEmailClientEmail]);

  // ============================================
  // SITE INTELLIGENCE REPORT
  // ============================================
  const handleSiteIntelligenceReport = useCallback(async () => {
    setIsGeneratingSiteIntel(true);
    toast.loading('Generating Site Intelligence Report...', { id: 'site-intel', description: 'Running dual-engine analysis' });
    
    let aiAnalysisData: any = null;
    let obcDetailedResult: any = null;
    
    try {
      const tradeCit = citations.find(c => c.cite_type === 'TRADE_SELECTION');
      const workTypeCit = citations.find(c => c.cite_type === 'WORK_TYPE');
      const gfaCit = citations.find(c => c.cite_type === 'GFA_LOCK');
      const locationCit = citations.find(c => c.cite_type === 'LOCATION');
      const templateCit = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      const blueprintCit = citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD');
      const photoCits = citations.filter(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION');
      const weatherCit = citations.find(c => c.cite_type === 'WEATHER_ALERT');
      const siteCondCit = citations.find(c => c.cite_type === 'SITE_CONDITION');
      const sitePresenceCits = citations.filter(c => c.cite_type === 'SITE_PRESENCE');
      
      const templateMeta = templateCit?.metadata as any;
      const materialsForObc = Array.isArray(templateMeta?.items)
        ? templateMeta.items.slice(0, 15).map((it: any) => ({ name: it.name || it.item_name || 'Unknown' }))
        : [];
      
      toast.loading('Step 1/3 — Running Gemini Visual + OpenAI Regulatory...', { id: 'site-intel' });
      
      const [analysisRes, obcRes] = await Promise.allSettled([
        supabase.functions.invoke('ai-project-analysis', {
          body: { projectId, analysisType: 'synthesis' },
        }),
        supabase.functions.invoke('obc-status-check', {
          body: {
            projectData: {
              project_type: workTypeCit?.answer || 'Renovation',
              scope_of_work: workTypeCit?.answer || '',
              confirmed_area_sqft: gfaCit?.answer ? parseFloat(String(gfaCit.answer)) : 0,
              materials: materialsForObc,
              blueprint_status: blueprintCit ? 'uploaded' : 'none',
              location: locationCit?.answer || 'Ontario, Canada',
              trade_type: tradeCit?.answer || 'general_contractor',
            }
          }
        }),
      ]);
      
      if (analysisRes.status === 'fulfilled' && analysisRes.value?.data) {
        aiAnalysisData = analysisRes.value.data;
      }
      if (obcRes.status === 'fulfilled' && obcRes.value?.data?.result) {
        obcDetailedResult = obcRes.value.data.result;
      }
      
      toast.loading('Step 2/3 — Compiling site data...', { id: 'site-intel' });
      
      const [checkinRes, tasksRes, docCountRes, profileRes, summaryRes] = await Promise.all([
        supabase.from('site_checkins').select('id, user_id, checked_in_at, checked_out_at, weather_snapshot').eq('project_id', projectId).order('checked_in_at', { ascending: false }).limit(20),
        supabase.from('project_tasks').select('id, title, status, assigned_to, updated_at, due_date').eq('project_id', projectId).is('archived_at', null),
        supabase.from('project_documents').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('bu_profiles').select('company_name, phone, company_website').eq('user_id', userId).maybeSingle(),
        supabase.from('project_summaries').select('photo_estimate, line_items, template_items').eq('project_id', projectId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      
      const allProjectTasks = tasksRes.data || [];
      const projectDocCount = docCountRes.count || 0;
      const profile = profileRes.data || {} as { company_name?: string; phone?: string; company_website?: string };
      const savedPhotoEstimate = summaryRes.data?.photo_estimate;
      
      const siteCheckins = checkinRes.data || [];
      const allUserIds = [...new Set([
        ...siteCheckins.map(c => c.user_id),
        ...allProjectTasks.map(t => t.assigned_to)
      ])];
      const { data: checkinProfiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', allUserIds);
      const nameMap = new Map(checkinProfiles?.map(p => [p.user_id, p.full_name]) || []);
      
      const namedCheckins = siteCheckins.map(c => ({ ...c, user_name: nameMap.get(c.user_id) || 'Unknown' }));
      
      const completedTasksByDay = new Map<string, { title: string; assignee: string; status: string }[]>();
      const completedTasks = allProjectTasks.filter(t => t.status === 'completed' || t.status === 'done');
      for (const task of completedTasks) {
        const dayKey = format(new Date(task.updated_at), 'yyyy-MM-dd');
        if (!completedTasksByDay.has(dayKey)) completedTasksByDay.set(dayKey, []);
        completedTasksByDay.get(dayKey)!.push({
          title: task.title,
          assignee: nameMap.get(task.assigned_to) || 'Unassigned',
          status: task.status,
        });
      }
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userEmail = authUser?.email || '';
      
      toast.loading('Step 3/3 — Building PDF...', { id: 'site-intel' });
      
      const tradeCitLocal = citations.find(c => c.cite_type === 'TRADE_SELECTION');
      const photoCitsLocal = citations.filter(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION');
      const blueprintCitLocal = citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD');
      const projName = projectData?.name || 'Project';
      const projAddr = projectData?.address || '';

      const html = await buildSiteIntelHTML({
        projName,
        projAddr,
        projectId,
        aiAnalysisData,
        obcDetailedResult,
        obcComplianceSections: obcComplianceResults.sections,
        tradeCitAnswer: tradeCitLocal?.answer || '',
        photoCits: photoCitsLocal,
        blueprintCit: blueprintCitLocal,
        savedPhotoEstimate,
        projectDocCount,
        namedCheckins,
        completedTasksByDay,
        profile,
        userEmail,
      });
      
      const { generatePDFBlob } = await import('@/lib/pdfGenerator');
      const filename = 'site-intelligence-' + (projectData?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'export') + '.pdf';
      const blob = await generatePDFBlob(html, { filename, pageFormat: 'letter' });
      
      setSiteIntelHtml(html);
      const blobUrl = URL.createObjectURL(blob);
      setSiteIntelBlobUrl(blobUrl);
      setSiteIntelFilename(filename);
      
      // Auto-save to project documents
      if (projectId) {
        try {
          const storagePath = `${projectId}/site-intelligence-latest.pdf`;
          await supabase.storage.from('project-documents').remove([storagePath]);
          const { error: uploadErr } = await supabase.storage.from('project-documents').upload(storagePath, blob, { contentType: 'application/pdf' });
          if (!uploadErr) {
            const { data: existingDocs } = await supabase.from('project_documents').select('id').eq('project_id', projectId).eq('file_name', 'Site Intelligence Report.pdf').limit(1);
            if (existingDocs && existingDocs.length > 0) {
              await supabase.from('project_documents').update({ file_name: `Site Intel — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (archived)` }).eq('id', existingDocs[0].id);
            }
            await supabase.from('project_documents').insert({
              project_id: projectId,
              file_name: 'Site Intelligence Report.pdf',
              file_path: storagePath,
              file_size: blob.size,
              mime_type: 'application/pdf',
              uploaded_by: userId,
              uploaded_by_name: profile?.company_name || 'Owner',
              uploaded_by_role: 'owner',
            });
            setDocuments(prev => [...prev, {
              id: crypto.randomUUID(),
              file_name: 'Site Intelligence Report.pdf',
              file_path: storagePath,
              category: 'technical' as DocumentCategory,
            }]);
          }
        } catch (_) { /* ignore */ }
      }
      
      setShowSiteIntelPreviewDialog(true);
      toast.dismiss('site-intel');
      toast.success('Site Intelligence Report ready');
    } catch (err) {
      console.error('[Site Intel] Error:', err);
      toast.dismiss('site-intel');
      toast.error('Failed to generate Site Intelligence report');
    } finally {
      setIsGeneratingSiteIntel(false);
    }
  }, [citations, projectData, obcComplianceResults, userId, projectId, teamMembers, tasks, documents,
      setIsGeneratingSiteIntel, setSiteIntelHtml, setSiteIntelBlobUrl, setSiteIntelFilename, setShowSiteIntelPreviewDialog, setDocuments]);

  // ============================================
  // INVOICE GENERATION
  // ============================================
  const handleGenerateInvoice = useCallback(async () => {
    if (!canGenerateInvoice()) {
      toast.error(getUpgradeMessage('invoiceGenerationEnabled'), {
        action: { label: 'Upgrade', onClick: () => window.location.href = '/buildunion/pricing' },
      });
      return;
    }
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Please sign in to generate invoices');
        return;
      }
      
      setIsGeneratingInvoice(true);
      toast.loading('Preparing invoice preview...', { id: 'invoice-gen' });
      
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: {
          projectId,
          notes: `Invoice for ${projectData?.name || 'Project'}`,
        },
      });
      
      if (error) throw error;
      
      if (data) {
        const { buildInvoiceHTML } = await import('@/lib/invoiceGenerator');
        const html = buildInvoiceHTML(data);
        
        setInvoicePreviewData(data);
        setInvoicePreviewHtml(html);
        setShowInvoicePreview(true);
        
        toast.success('Invoice ready — edit fields then download', { id: 'invoice-gen' });
      }
    } catch (err) {
      console.error('[Stage8] Invoice generation failed:', err);
      toast.error('Failed to generate invoice', { id: 'invoice-gen' });
    } finally {
      setIsGeneratingInvoice(false);
    }
  }, [projectId, projectData, canGenerateInvoice, getUpgradeMessage,
      setIsGeneratingInvoice, setInvoicePreviewData, setInvoicePreviewHtml, setShowInvoicePreview]);

  // ============================================
  // PROJECT SUMMARY GENERATION
  // ============================================
  const handleGenerateSummary = useCallback(async () => {
    setIsGeneratingSummary(true);
    try {
      toast.loading('Generating Comprehensive Project Summary...', { id: 'summary-gen', description: 'Dual AI + Weather + OBC Analysis' });
      
      const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
      const tradeCitation = citations.find(c => c.cite_type === 'TRADE_SELECTION');
      const locationCitation = citations.find(c => c.cite_type === 'LOCATION');
      const workTypeCitation = citations.find(c => c.cite_type === 'WORK_TYPE');
      const projectNameCitation = citations.find(c => c.cite_type === 'PROJECT_NAME');
      const templateCitation = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      const executionModeCitation = citations.find(c => c.cite_type === 'EXECUTION_MODE');
      const siteConditionCitation = citations.find(c => c.cite_type === 'SITE_CONDITION');
      const demolitionCitation = citations.find(c => c.cite_type === 'DEMOLITION_PRICE');
      const timelineCitation = citations.find(c => c.cite_type === 'TIMELINE');
      const endDateCitation = citations.find(c => c.cite_type === 'END_DATE');
      const teamCitations = citations.filter(c => c.cite_type === 'TEAM_MEMBER_INVITE' || c.cite_type === 'TEAM_STRUCTURE' || c.cite_type === 'TEAM_SIZE');
      const docCitations = citations.filter(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'BLUEPRINT_UPLOAD' || c.cite_type === 'VISUAL_VERIFICATION');
      const dnaFinalizedCitation = citations.find(c => c.cite_type === 'DNA_FINALIZED');
      
      const gfaValue = typeof gfaCitation?.value === 'number' ? gfaCitation.value : (typeof gfaCitation?.metadata?.gfa_value === 'number' ? gfaCitation.metadata.gfa_value : 0);
      const trade = tradeCitation?.answer || projectData?.trade || 'Not set';
      const address = locationCitation?.answer || projectData?.address || '';
      const workType = workTypeCitation?.answer || (workTypeCitation?.metadata as any)?.work_type_key || 'Not set';
      const executionMode = executionModeCitation?.answer || 'Solo';
      const siteCondition = siteConditionCitation?.answer || 'Not assessed';
      const hasDemolition = demolitionCitation && (typeof demolitionCitation.value === 'number' && demolitionCitation.value > 0);
      const startDate = timelineCitation?.answer || '';
      const endDate = endDateCitation?.answer || '';
      
      const wastePercent = typeof templateCitation?.metadata?.waste_percent === 'number' ? templateCitation.metadata.waste_percent : 10;
      const grossArea = gfaValue > 0 ? Math.round(gfaValue * (1 + wastePercent / 100)) : 0;
      
      // Fetch weather
      let weatherData: any = null;
      let weatherAlerts: any[] = [];
      if (address && address.length > 5) {
        try {
          const { data: weatherResult } = await supabase.functions.invoke('get-weather', {
            body: { location: address, days: 5 }
          });
          if (weatherResult && !weatherResult.error) {
            weatherData = weatherResult;
            weatherAlerts = weatherResult.current?.alerts || [];
          }
        } catch (err) {
          console.log('[Summary] Weather fetch skipped:', err);
        }
      }
      
      // AI assessment
      let aiInsights: any = null;
      try {
        const { data: aiResult } = await supabase.functions.invoke('ai-project-analysis', {
          body: { projectId, analysisType: 'synthesis' },
        });
        if (aiResult && !aiResult.error) {
          aiInsights = aiResult;
        }
      } catch (err) {
        console.log('[Summary] AI assessment skipped:', err);
      }
      
      const geminiInsight = aiInsights?.engines?.gemini?.analysis || {};
      const openaiInsight = aiInsights?.engines?.openai?.analysis || {};
      const obcStatus = openaiInsight?.obcCompliance || geminiInsight?.obcCompliance || 'Pending Review';
      const riskLevel = openaiInsight?.riskLevel || geminiInsight?.riskLevel || 'Medium';
      const aiRecommendations = geminiInsight?.recommendations || openaiInsight?.recommendations || [];
      const conflictStatus = geminiInsight?.conflictStatus || 'No conflicts detected';
      const materialCount = geminiInsight?.materialCount || templateCitation?.metadata?.materials_count || 0;
      
      // 8-PILLAR STATUS
      const pillars = [
        {
          id: 1, name: 'Project Basics', icon: '🏗️', color: '#059669',
          status: (!!projectNameCitation && !!locationCitation && !!workTypeCitation) ? 'COMPLETE' : (!!projectNameCitation || !!locationCitation) ? 'PARTIAL' : 'MISSING',
          items: [
            { label: 'Project Name', value: projectData?.name || '—', ok: !!projectNameCitation || !!projectData?.name },
            { label: 'Location', value: address ? address.split(',').slice(0, 2).join(',') : '—', ok: !!locationCitation },
            { label: 'Work Type', value: workType, ok: !!workTypeCitation },
          ],
        },
        {
          id: 2, name: 'Area & Dimensions', icon: '📐', color: '#2563eb',
          status: (!!gfaCitation && gfaValue > 0) ? 'COMPLETE' : 'MISSING',
          items: [
            { label: 'GFA Locked', value: gfaValue > 0 ? `${gfaValue.toLocaleString()} sq ft` : '—', ok: !!gfaCitation && gfaValue > 0 },
            { label: 'Gross Area (+' + wastePercent + '% waste)', value: grossArea > 0 ? `${grossArea.toLocaleString()} sq ft` : '—', ok: grossArea > 0 },
            { label: 'Site Condition', value: siteCondition, ok: !!siteConditionCitation },
          ],
        },
        {
          id: 3, name: 'Trade & Template', icon: '🔨', color: '#ea580c',
          status: (!!tradeCitation && !!templateCitation) ? 'COMPLETE' : (!!tradeCitation || !!templateCitation) ? 'PARTIAL' : 'MISSING',
          items: [
            { label: 'Trade', value: trade, ok: !!tradeCitation },
            { label: 'Template', value: templateCitation ? 'Locked' : '—', ok: !!templateCitation },
            { label: 'Execution Mode', value: executionMode, ok: !!executionModeCitation },
          ],
        },
        {
          id: 4, name: 'Team Architecture', icon: '👥', color: '#0d9488',
          status: (teamMembers.length > 0 || teamCitations.length > 0) ? 'COMPLETE' : executionMode === 'Solo' ? 'N/A' : 'MISSING',
          items: [
            { label: 'Team Size', value: `${teamMembers.length} member(s)`, ok: teamMembers.length > 0 || executionMode === 'Solo' },
            { label: 'Invitations', value: `${teamCitations.filter(c => c.cite_type === 'TEAM_MEMBER_INVITE').length} sent`, ok: true },
            { label: 'Mode', value: executionMode, ok: true },
          ],
        },
        {
          id: 5, name: 'Execution Timeline', icon: '📅', color: '#6366f1',
          status: (!!timelineCitation && !!endDateCitation && tasks.length > 0) ? 'COMPLETE' : (!!timelineCitation || tasks.length > 0) ? 'PARTIAL' : 'MISSING',
          items: [
            { label: 'Start Date', value: startDate || '—', ok: !!timelineCitation },
            { label: 'End Date', value: endDate || '—', ok: !!endDateCitation },
            { label: 'Tasks', value: `${tasks.filter(t => t.status === 'completed' || t.status === 'done').length}/${tasks.length} complete`, ok: tasks.length > 0 },
          ],
        },
        {
          id: 6, name: 'Documents & Contracts', icon: '📁', color: '#0284c7',
          status: (documents.length > 0 && contracts.length > 0) ? 'COMPLETE' : (documents.length > 0 || contracts.length > 0) ? 'PARTIAL' : 'MISSING',
          items: [
            { label: 'Documents', value: `${documents.length} file(s)`, ok: documents.length > 0 },
            { label: 'Contracts', value: `${contracts.length} created`, ok: contracts.length > 0 },
            { label: 'Site Photos', value: `${docCitations.filter(c => c.cite_type === 'SITE_PHOTO').length} uploaded`, ok: docCitations.filter(c => c.cite_type === 'SITE_PHOTO').length > 0 },
          ],
        },
        {
          id: 7, name: 'Site Log & Location', icon: '🌤️', color: '#0ea5e9',
          status: address ? 'ACTIVE' : 'MISSING',
          items: [
            { label: 'Location Set', value: address ? 'Yes' : 'No', ok: !!address },
            { label: 'Demolition', value: hasDemolition ? 'Required' : 'None', ok: true },
            { label: 'Site Hazards', value: siteCondition === 'Clear Site' ? 'None' : siteCondition, ok: true },
          ],
        },
        {
          id: 8, name: 'Financial Summary', icon: '💰', color: '#dc2626',
          status: (financialSummary?.total_cost && financialSummary.total_cost > 0) ? 'COMPLETE' : 'MISSING',
          items: [
            { label: 'Material Cost', value: financialSummary?.material_cost ? '$' + financialSummary.material_cost.toLocaleString() : '—', ok: !!(financialSummary?.material_cost && financialSummary.material_cost > 0) },
            { label: 'Labor Cost', value: financialSummary?.labor_cost ? '$' + financialSummary.labor_cost.toLocaleString() : '—', ok: !!(financialSummary?.labor_cost && financialSummary.labor_cost > 0) },
            { label: 'Total Budget', value: financialSummary?.total_cost ? '$' + financialSummary.total_cost.toLocaleString() : '—', ok: !!(financialSummary?.total_cost && financialSummary.total_cost > 0) },
          ],
        },
      ];

      const pillarComplete = pillars.filter(p => p.status === 'COMPLETE' || p.status === 'ACTIVE' || p.status === 'N/A').length;
      const pillarTotal = pillars.filter(p => p.status !== 'N/A').length;
      
      const checkpoints = [
        { name: 'Project Name', completed: !!projectNameCitation || !!projectData?.name, phase: 'Definition', priority: 'Required' },
        { name: 'Location Verified', completed: !!locationCitation, phase: 'Definition', priority: 'Required' },
        { name: 'Work Type', completed: !!workTypeCitation, phase: 'Definition', priority: 'Required' },
        { name: 'GFA Locked', completed: !!gfaCitation && gfaValue > 0, phase: 'Scope', priority: 'Critical' },
        { name: 'Trade Selection', completed: !!tradeCitation, phase: 'Scope', priority: 'Critical' },
        { name: 'Template Locked', completed: !!templateCitation, phase: 'Scope', priority: 'Important' },
        { name: 'Execution Mode', completed: !!executionModeCitation, phase: 'Execution', priority: 'Required' },
        { name: 'Site Condition', completed: !!siteConditionCitation, phase: 'Execution', priority: 'Required' },
        { name: 'Timeline Set', completed: !!timelineCitation && !!endDateCitation, phase: 'Execution', priority: 'Critical' },
        { name: 'DNA Finalized', completed: !!dnaFinalizedCitation, phase: 'Execution', priority: 'Important' },
        { name: 'Team Invited', completed: teamCitations.length > 0 || teamMembers.length > 0, phase: 'Team', priority: executionMode === 'Team' ? 'Required' : 'Optional' },
        { name: 'Tasks Created', completed: tasks.length > 0, phase: 'Team', priority: 'Important' },
        { name: 'Site Photos', completed: docCitations.filter(c => c.cite_type === 'SITE_PHOTO').length > 0, phase: 'Documentation', priority: 'Required' },
        { name: 'Blueprints Uploaded', completed: docCitations.filter(c => c.cite_type === 'BLUEPRINT_UPLOAD').length > 0, phase: 'Documentation', priority: 'Important' },
        { name: 'Budget Set', completed: !!(financialSummary?.total_cost && financialSummary.total_cost > 0), phase: 'Financial', priority: 'Critical' },
        { name: 'Contract Created', completed: contracts.length > 0, phase: 'Financial', priority: 'Critical' },
      ];
      
      const completedCount = checkpoints.filter(c => c.completed).length;
      const criticalCheckpoints = checkpoints.filter(c => c.priority === 'Critical');
      const criticalCompleted = criticalCheckpoints.filter(c => c.completed).length;
      const completionPercent = Math.round((completedCount / checkpoints.length) * 100);
      const criticalPercent = Math.round((criticalCompleted / criticalCheckpoints.length) * 100);
      const operationalReadiness = Math.round((completionPercent * 0.6) + (criticalPercent * 0.4));
      const readinessGrade = operationalReadiness >= 85 ? 'OPERATIONAL' : operationalReadiness >= 60 ? 'PARTIAL' : 'INCOMPLETE';
      
      // Weather section HTML
      const weatherHtml = weatherData ? `
        <div class="section">
           <div class="section-header"><span class="section-number">3.</span> WEATHER CONDITIONS</div>
          <div class="weather-grid">
            <div class="weather-current">
              <div class="weather-temp">${Math.round(weatherData.current?.temp || 0)}°C</div>
              <div class="weather-desc">${weatherData.current?.description || 'N/A'}</div>
              <div class="weather-details">
                <span>💨 ${Math.round(weatherData.current?.wind_speed || 0)} km/h</span>
                <span>💧 ${weatherData.current?.humidity || 0}%</span>
              </div>
            </div>
            <div class="forecast-mini">
              ${(weatherData.forecast || []).slice(0, 5).map((day: any) => `
                <div class="forecast-day">
                  <div class="forecast-date">${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div class="forecast-temps">${Math.round(day.temp_max)}° / ${Math.round(day.temp_min)}°</div>
                  ${(day.alerts?.length || 0) > 0 ? '<div class="forecast-alert">⚠️</div>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
          ${weatherAlerts.length > 0 ? `
            <div class="alert-box warning">
              <strong>⚠️ Construction Alerts:</strong>
              ${weatherAlerts.map((a: any) => `<div>• ${a.message}</div>`).join('')}
            </div>
          ` : '<div class="status-good">✓ No weather alerts - conditions favorable for construction</div>'}
        </div>
      ` : '<div class="section"><div class="section-header"><span class="section-number">3.</span> WEATHER CONDITIONS</div><div class="status-pending">Location required for weather data</div></div>';
      
      // OBC section HTML
      const obcHtml = `
        <div class="section">
          <div class="section-header"><span class="section-number">4.</span> REGULATORY COMPLIANCE (OBC 2024)</div>
          <table>
            <tr><th>Requirement</th><th>Status</th><th>Notes</th></tr>
            <tr>
              <td>Ontario Building Code</td>
              <td class="${obcStatus === 'Compliant' || obcStatus === 'Pass' ? 'status-pass' : 'status-review'}">${obcStatus}</td>
              <td>Based on project scope and trade selection</td>
            </tr>
            <tr>
              <td>Permit Requirements</td>
              <td class="${gfaValue > 500 ? 'status-review' : 'status-pass'}">${gfaValue > 500 ? 'Likely Required' : 'Check Local'}</td>
              <td>${gfaValue > 500 ? 'Projects >500 sq ft typically require permits' : 'Minor work may be exempt'}</td>
            </tr>
            <tr>
              <td>WSIB Coverage</td>
              <td class="status-review">Verify</td>
              <td>Required for all construction workers in Ontario</td>
            </tr>
            <tr>
              <td>Safety Protocols</td>
              <td class="${hasDemolition ? 'status-review' : 'status-pass'}">${hasDemolition ? 'Enhanced Required' : 'Standard'}</td>
              <td>${hasDemolition ? 'Demolition work requires additional safety measures' : 'Standard PPE protocols apply'}</td>
            </tr>
          </table>
        </div>
      `;
      
      // AI section HTML
      const aiHtml = aiInsights ? `
        <div class="section">
           <div class="section-header"><span class="section-number">5.</span> AI ENGINE ANALYSIS</div>
          <div class="dual-engine-status">
            <div class="engine-badge gemini">🔷 Gemini Pro</div>
            <div class="engine-badge openai">🟢 GPT-5</div>
            <div class="engine-status ${aiInsights.dualEngineUsed ? 'active' : 'single'}">
              ${aiInsights.dualEngineUsed ? '✓ Dual Engine Verified' : 'Single Engine'}
            </div>
          </div>
          <table>
            <tr><th>Assessment</th><th>Result</th><th>Confidence</th></tr>
            <tr>
              <td>Risk Level</td>
              <td class="${riskLevel === 'Low' ? 'status-pass' : riskLevel === 'Medium' ? 'status-review' : 'status-fail'}">${riskLevel}</td>
              <td>${aiInsights.dualEngineUsed ? 'High (dual verified)' : 'Medium'}</td>
            </tr>
            <tr>
              <td>Conflict Check</td>
              <td class="${conflictStatus.includes('No conflict') ? 'status-pass' : 'status-review'}">${conflictStatus}</td>
              <td>Automated</td>
            </tr>
            <tr>
              <td>Material Estimation</td>
              <td>${materialCount > 0 ? materialCount + ' items' : 'Pending'}</td>
              <td>${materialCount > 0 ? 'High' : 'N/A'}</td>
            </tr>
          </table>
          ${aiRecommendations.length > 0 ? `
            <div class="recommendations">
              <strong>AI Recommendations:</strong>
              <ul>
                ${aiRecommendations.slice(0, 3).map((r: string) => `<li>${r}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      ` : '<div class="section"><div class="section-header"><span class="section-number">5.</span> AI ENGINE ANALYSIS</div><div class="status-pending">AI analysis will run on project activation</div></div>';
      
      const html = buildSummaryHTML(
        { projectData, financialSummary, citations, teamMembers, tasks, documents, contracts },
        {
          pillars, pillarComplete, pillarTotal, operationalReadiness, readinessGrade,
          gfaValue, grossArea, wastePercent, address, trade, workType, executionMode,
          siteCondition, hasDemolition: !!hasDemolition, startDate, endDate,
          weatherHtml, obcHtml, aiHtml,
        }
      );
      
      setSummaryPreviewHtml(html);
      setShowSummaryPreview(true);
      toast.success('Project Summary Generated!', { id: 'summary-gen', description: `${pillarComplete}/${pillarTotal} pillars complete • ${operationalReadiness}% readiness` });
    } catch (err) {
      console.error('[Stage8] Summary generation failed:', err);
      toast.error('Failed to generate summary', { id: 'summary-gen' });
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [projectId, citations, projectData, financialSummary, teamMembers, tasks, documents, contracts,
      setIsGeneratingSummary, setSummaryPreviewHtml, setShowSummaryPreview]);

  return {
    handleMessaSynthesis,
    handleAIAnalysis,
    handleDnaReportPdf,
    handleSendDnaReportEmail,
    handleSiteIntelligenceReport,
    handleGenerateInvoice,
    handleGenerateSummary,
    buildMessaSynthesisHTMLMemo,
  };
}
