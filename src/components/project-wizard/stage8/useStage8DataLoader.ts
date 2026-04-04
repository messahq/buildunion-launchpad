// ============================================
// STAGE 8: DATA LOADER HOOK
// Extracted from Stage8FinalReview.tsx — Phase 6 refactor
// Handles: project data load, citations, team, tasks, documents, contracts, profiles
// ============================================

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Citation } from "@/types/citation";
import {
  restoreProjectFromLocalStorage,
  syncCitationsToLocalStorage,
  logCriticalError,
} from "@/lib/projectPersistence";
import type { TaskWithChecklist, DocumentWithCategory, DocumentCategory } from "./types";
import { DOCUMENT_CATEGORIES } from "./constants";

interface UseStage8DataLoaderProps {
  projectId: string;
  userId: string;
  userRole: string;
}

interface DataLoaderResult {
  isLoading: boolean;
  projectData: { name: string; address: string; status: string; trade: string | null; user_id?: string } | null;
  citations: Citation[];
  setCitations: React.Dispatch<React.SetStateAction<Citation[]>>;
  teamMembers: { id: string; role: string; name: string; userId: string; primary_trade?: string; hst_number?: string }[];
  setTeamMembers: React.Dispatch<React.SetStateAction<{ id: string; role: string; name: string; userId: string; primary_trade?: string; hst_number?: string }[]>>;
  tasks: TaskWithChecklist[];
  setTasks: React.Dispatch<React.SetStateAction<TaskWithChecklist[]>>;
  documents: DocumentWithCategory[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentWithCategory[]>>;
  contracts: { id: string; contract_number: string; status: string; total_amount: number | null; share_token?: string | null; project_name?: string | null; client_name?: string | null; client_email?: string | null; contractor_name?: string | null; contractor_email?: string | null; start_date?: string | null; estimated_end_date?: string | null; contractor_signature?: unknown; client_signature?: unknown; client_signed_at?: string | null; sent_to_client_at?: string | null; client_viewed_at?: string | null }[];
  setContracts: React.Dispatch<React.SetStateAction<any[]>>;
  financialSummary: { material_cost: number | null; labor_cost: number | null; total_cost: number | null } | null;
  setFinancialSummary: React.Dispatch<React.SetStateAction<{ material_cost: number | null; labor_cost: number | null; total_cost: number | null } | null>>;
  userProfile: { company_name: string | null; phone: string | null; email: string | null; service_area: string | null } | null;
  ownerProfile: { full_name: string | null; company_name: string | null; phone: string | null; email: string | null; service_area: string | null } | null;
  dataSource: 'supabase' | 'localStorage' | 'mixed';
  isFinancialLocked: boolean;
  setIsFinancialLocked: React.Dispatch<React.SetStateAction<boolean>>;
  categorizeDocument: (fileName: string, filePath?: string, uploadedByRole?: string | null) => DocumentCategory;
  weatherData: { temp?: number; condition?: string; alerts?: string[] } | null;
  setWeatherData: React.Dispatch<React.SetStateAction<{ temp?: number; condition?: string; alerts?: string[] } | null>>;
}

// ── Invoice-aligned keyword classification helpers ──
const isLaborByKeyword = (desc: string): boolean => {
  const d = desc.toLowerCase();
  return d.includes('labor') || d.includes('installation') || d.includes('preparation') ||
    d.includes('cleanup') || d.includes('grinding') ||
    d.includes('floor preparation') || d.includes('prep work') || d.includes('site prep');
};
const isDemoByKeyword = (desc: string): boolean => {
  const d = desc.toLowerCase();
  return d.includes('demolition') || d.includes('demo ') || d.includes('removal');
};

// Recalculate financials from item arrays
function recalcFinancials(items: any[]): { mat: number; lab: number; total: number } {
  let mat = 0, lab = 0;
  for (const item of items) {
    const t = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) || Number(item.total) || Number(item.totalPrice) || 0;
    const desc = item.name || item.description || '';
    if (isDemoByKeyword(desc)) { /* skip demo from mat/lab split */ }
    else if (isLaborByKeyword(desc)) lab += t;
    else mat += t;
  }
  return { mat, lab, total: mat + lab };
}

export function useStage8DataLoader({ projectId, userId, userRole }: UseStage8DataLoaderProps): DataLoaderResult {
  const [isLoading, setIsLoading] = useState(true);
  const [projectData, setProjectData] = useState<DataLoaderResult['projectData']>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [teamMembers, setTeamMembers] = useState<DataLoaderResult['teamMembers']>([]);
  const [tasks, setTasks] = useState<TaskWithChecklist[]>([]);
  const [documents, setDocuments] = useState<DocumentWithCategory[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<DataLoaderResult['financialSummary']>(null);
  const [userProfile, setUserProfile] = useState<DataLoaderResult['userProfile']>(null);
  const [ownerProfile, setOwnerProfile] = useState<DataLoaderResult['ownerProfile']>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'localStorage' | 'mixed'>('supabase');
  const [isFinancialLocked, setIsFinancialLocked] = useState(true);
  const [weatherData, setWeatherData] = useState<DataLoaderResult['weatherData']>(null);

  // Categorize document based on file name, file path, AND uploader role
  const categorizeDocument = useCallback((fileName: string, filePath?: string, uploadedByRole?: string | null): DocumentCategory => {
    const lowerName = fileName.toLowerCase();
    const lowerPath = (filePath || '').toLowerCase();
    
    if (lowerPath.includes('/pending/obc-') || lowerName.includes('(pending)') || lowerName.includes('⏳')) return 'obc_pending';
    if (uploadedByRole && uploadedByRole !== 'owner') return 'verification';
    if (lowerPath.includes('/chat/')) return 'verification';
    if (lowerPath.includes('/verification/')) return 'verification';
    if (lowerName.includes('verification') || lowerName.includes('inspect') || lowerName.includes('qc')) return 'verification';
    if (lowerName.includes('contract') || lowerName.includes('legal') || lowerName.includes('agreement')) return 'legal';
    if (lowerName.includes('blueprint') || lowerName.includes('plan') || lowerName.includes('drawing') || lowerName.includes('dna') || lowerName.includes('audit') || lowerName.match(/\.pdf$/i)) return 'technical';
    if (lowerName.match(/\.(jpg|jpeg|png|gif|webp|heic|bmp|tiff|svg)$/i)) return 'visual';
    return 'technical';
  }, []);

  // ── Fetch weather ──
  const fetchWeather = useCallback(async (address: string) => {
    try {
      const response = await supabase.functions.invoke('get-weather', {
        body: { location: address, days: 5 }
      });
      if (response.data?.current) {
        const weatherInfo = {
          temp: response.data.current.temp,
          condition: response.data.current.description,
          alerts: response.data.alerts || [],
        };
        setWeatherData(weatherInfo);

        // Generate WEATHER_ALERT citation
        setCitations(prev => {
          if (prev.some(c => c.cite_type === 'WEATHER_ALERT')) return prev;
          const alertText = weatherInfo.alerts.length > 0
            ? `${weatherInfo.alerts.length} alert(s): ${weatherInfo.alerts.join(', ')}`
            : `${weatherInfo.temp}°C — ${weatherInfo.condition}`;
          const weatherCitation: Citation = {
            id: `cite_weather_${Date.now()}`,
            cite_type: 'WEATHER_ALERT' as any,
            question_key: 'weather_alert',
            answer: alertText,
            value: weatherInfo,
            timestamp: new Date().toISOString(),
            metadata: {
              temp: weatherInfo.temp,
              condition: weatherInfo.condition,
              alerts: weatherInfo.alerts,
              source: 'openweathermap',
              checked_at: new Date().toISOString(),
            },
          };
          const updated = [...prev, weatherCitation];
          supabase.from('project_summaries')
            .select('id, verified_facts')
            .eq('project_id', projectId)
            .maybeSingle()
            .then(({ data: sumData }) => {
              if (sumData?.id) {
                const currentFacts = Array.isArray(sumData.verified_facts) ? sumData.verified_facts : [];
                if (!currentFacts.some((f: any) => f.cite_type === 'WEATHER_ALERT')) {
                  supabase.from('project_summaries')
                    .update({ verified_facts: [...currentFacts, weatherCitation as unknown as Record<string, unknown>] as unknown as null })
                    .eq('id', sumData.id)
                    .then(() => console.log('[Stage8] ✓ WEATHER_ALERT citation persisted'));
                }
              }
            });
          return updated;
        });
      }
    } catch (err) {
      console.error('[Stage8] Weather fetch failed:', err);
    }
  }, [projectId]);

  // ── MAIN DATA LOAD ──
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      let usedLocalStorage = false;

      try {
        // 1. Load project
        const { data: project } = await supabase
          .from('projects')
          .select('name, address, status, trade, user_id')
          .eq('id', projectId)
          .single();

        if (project) {
          setProjectData(project);
          if (project.address) fetchWeather(project.address);
        }

        const projectTrade = project?.trade || null;

        // 2. Load citations AND financial data
        const { data: summary } = await supabase
          .from('project_summaries')
          .select('verified_facts, material_cost, labor_cost, total_cost, line_items, template_items, project_start_date, project_end_date')
          .eq('project_id', projectId)
          .maybeSingle();

        // Compute financial summary
        if (summary) {
          const liveLineItems: any[] = Array.isArray(summary.line_items) ? summary.line_items as any[] : [];
          const liveTemplateItems: any[] = Array.isArray(summary.template_items) ? summary.template_items as any[] : [];
          const recalcSource = liveLineItems.length > 0 ? liveLineItems : liveTemplateItems;

          if (recalcSource.length > 0) {
            const { mat, lab, total } = recalcFinancials(recalcSource);
            setFinancialSummary({ material_cost: mat, labor_cost: lab, total_cost: total });

            // Persist if different
            const storedTotal = Number(summary.total_cost) || 0;
            const storedMat = Number(summary.material_cost) || 0;
            const storedLab = Number(summary.labor_cost) || 0;
            if (Math.abs(total - storedTotal) > 0.01 || Math.abs(mat - storedMat) > 0.01 || Math.abs(lab - storedLab) > 0.01) {
              supabase.from('project_summaries')
                .update({ material_cost: mat, labor_cost: lab, total_cost: total })
                .eq('project_id', projectId)
                .then(({ error }) => {
                  if (error) console.error('[Stage8] Failed to persist corrected financials:', error);
                });
            }
          } else {
            setFinancialSummary({
              material_cost: Number(summary.material_cost) || 0,
              labor_cost: Number(summary.labor_cost) || 0,
              total_cost: Number(summary.total_cost) || 0,
            });
          }
        }

        // Process citations
        let loadedCitations: Citation[] = [];

        if (summary?.verified_facts) {
          const facts = Array.isArray(summary.verified_facts)
            ? (summary.verified_facts as unknown as Citation[])
            : [];

          loadedCitations = facts.map((fact: any) => {
            if (fact.cite_type) return fact as Citation;
            const questionKey = fact.questionKey || fact.question_key;
            let citeType: string = 'PROJECT_NAME';
            switch (questionKey) {
              case 'project_name': citeType = 'PROJECT_NAME'; break;
              case 'project_address': citeType = 'LOCATION'; break;
              case 'work_type': citeType = 'WORK_TYPE'; break;
              case 'gfa': case 'gross_floor_area': citeType = 'GFA_LOCK'; break;
              case 'trade_selection': case 'trade': citeType = 'TRADE_SELECTION'; break;
              case 'template_lock': citeType = 'TEMPLATE_LOCK'; break;
              case 'team_member_invite': citeType = 'TEAM_MEMBER_INVITE'; break;
              case 'team_structure': citeType = 'TEAM_STRUCTURE'; break;
              case 'timeline': case 'start_date': citeType = 'TIMELINE'; break;
              case 'end_date': citeType = 'END_DATE'; break;
              default: citeType = fact.elementType?.toUpperCase() || 'PROJECT_NAME';
            }
            return { ...fact, cite_type: citeType, question_key: questionKey } as Citation;
          });
        }

        // Fallback: localStorage
        if (loadedCitations.length === 0) {
          const localState = restoreProjectFromLocalStorage(projectId);
          if (localState?.citations && localState.citations.length > 0) {
            loadedCitations = localState.citations;
            usedLocalStorage = true;
            toast.info('Data restored from local backup', { duration: 3000 });
            try {
              await supabase.from('project_summaries').upsert({
                project_id: projectId, user_id: userId,
                verified_facts: loadedCitations as any, status: 'active',
              });
            } catch (syncErr) {
              logCriticalError('[Stage8] Failed to sync localStorage to Supabase', syncErr);
            }
          }
        }

        // Synthetic TRADE_SELECTION from projects.trade
        if (!loadedCitations.some(c => c.cite_type === 'TRADE_SELECTION') && projectTrade) {
          const tradeLabel = projectTrade.charAt(0).toUpperCase() + projectTrade.slice(1).replace(/_/g, ' ');
          const syntheticTradeCitation: Citation = {
            id: `synthetic_trade_${Date.now()}`,
            cite_type: 'TRADE_SELECTION',
            question_key: 'trade_selection',
            answer: tradeLabel,
            value: projectTrade,
            timestamp: new Date().toISOString(),
            metadata: { trade_key: projectTrade, source: 'projects.trade_fallback' },
          };
          loadedCitations.push(syntheticTradeCitation);
          try {
            const { data: currentSummary } = await supabase
              .from('project_summaries')
              .select('id, verified_facts')
              .eq('project_id', projectId)
              .maybeSingle();
            if (currentSummary?.id) {
              const currentFacts = Array.isArray(currentSummary.verified_facts) ? currentSummary.verified_facts : [];
              await supabase.from('project_summaries')
                .update({ verified_facts: [...currentFacts, syntheticTradeCitation as unknown as Record<string, unknown>] as unknown as null })
                .eq('id', currentSummary.id);
            }
          } catch (persistErr) {
            console.error('[Stage8] Failed to persist synthetic citation:', persistErr);
          }
        }

        // TIMELINE & END_DATE from project_summaries fields
        if (!loadedCitations.some(c => c.cite_type === 'TIMELINE') && summary?.project_start_date) {
          loadedCitations.push({
            id: `db_timeline_${Date.now()}`, cite_type: 'TIMELINE', question_key: 'timeline',
            answer: summary.project_start_date, value: 'scheduled',
            timestamp: new Date().toISOString(),
            metadata: { start_date: summary.project_start_date, source: 'project_summaries' },
          });
        }
        if (!loadedCitations.some(c => c.cite_type === 'END_DATE') && summary?.project_end_date) {
          loadedCitations.push({
            id: `db_end_date_${Date.now()}`, cite_type: 'END_DATE', question_key: 'end_date',
            answer: summary.project_end_date, value: summary.project_end_date,
            timestamp: new Date().toISOString(),
            metadata: { end_date: summary.project_end_date, source: 'project_summaries' },
          });
        }

        // Fallback to task due_dates
        if (!loadedCitations.some(c => c.cite_type === 'TIMELINE') || !loadedCitations.some(c => c.cite_type === 'END_DATE')) {
          try {
            const { data: taskDates } = await supabase
              .from('project_tasks')
              .select('due_date')
              .eq('project_id', projectId)
              .is('archived_at', null)
              .order('due_date', { ascending: true });

            if (taskDates && taskDates.length > 0) {
              const validDates = taskDates.filter(t => t.due_date).map(t => new Date(t.due_date!));
              if (!loadedCitations.some(c => c.cite_type === 'TIMELINE') && validDates[0]) {
                loadedCitations.push({
                  id: `synthetic_timeline_${Date.now()}`, cite_type: 'TIMELINE', question_key: 'timeline',
                  answer: validDates[0].toISOString().split('T')[0], value: 'scheduled',
                  timestamp: new Date().toISOString(),
                  metadata: { start_date: validDates[0].toISOString().split('T')[0], source: 'tasks_fallback' },
                });
              }
              if (!loadedCitations.some(c => c.cite_type === 'END_DATE') && validDates[validDates.length - 1]) {
                const latest = validDates[validDates.length - 1];
                loadedCitations.push({
                  id: `synthetic_end_date_${Date.now()}`, cite_type: 'END_DATE', question_key: 'end_date',
                  answer: latest.toISOString().split('T')[0], value: latest.toISOString().split('T')[0],
                  timestamp: new Date().toISOString(),
                  metadata: { end_date: latest.toISOString().split('T')[0], source: 'tasks_fallback' },
                });
              }
            }
          } catch (err) {
            console.error('[Stage8] Failed to recover timeline from tasks:', err);
          }
        }

        setCitations(loadedCitations);
        setDataSource(usedLocalStorage ? 'localStorage' : 'supabase');

        // 3. Load team members
        const { data: members } = await supabase
          .from('project_members')
          .select('id, user_id, role')
          .eq('project_id', projectId);

        let teamData: { id: string; userId: string; role: string; name: string; primary_trade?: string; hst_number?: string }[] = [];

        const { data: ownerProfileData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('user_id', userId)
          .maybeSingle();

        if (ownerProfileData) {
          teamData.push({ id: `owner-${userId}`, userId, role: 'owner', name: ownerProfileData.full_name || 'Owner' });
        }

        if (members && members.length > 0) {
          const userIds = members.map(m => m.user_id).filter(id => id !== userId);
          if (userIds.length > 0) {
            const [{ data: profiles }, { data: buProfiles }] = await Promise.all([
              supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
              supabase.from('bu_profiles').select('user_id, primary_trade, hst_number').in('user_id', userIds),
            ]);
            const memberData = members.filter(m => m.user_id !== userId).map(m => {
              const profile = profiles?.find(p => p.user_id === m.user_id);
              const buProfile = buProfiles?.find(p => p.user_id === m.user_id);
              return {
                id: m.id, userId: m.user_id, role: m.role,
                name: profile?.full_name || 'Team Member',
                primary_trade: buProfile?.primary_trade || undefined,
                hst_number: (buProfile as any)?.hst_number || undefined,
              };
            });
            teamData = [...teamData, ...memberData];
          }
        }

        // Pending invitations
        const { data: pendingInvites } = await supabase
          .from('team_invitations')
          .select('id, email, role, status')
          .eq('project_id', projectId);

        if (pendingInvites && pendingInvites.length > 0) {
          pendingInvites.forEach(invite => {
            const alreadyJoined = teamData.some(m => m.userId === invite.id);
            if (!alreadyJoined && invite.status === 'pending') {
              const emailName = invite.email.split('@')[0];
              const displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
              teamData.push({
                id: `invite-${invite.id}`, userId: invite.id,
                role: invite.role || 'member', name: `${displayName} (Pending)`,
              });
            }
          });
        }

        setTeamMembers(teamData);

        // Generate TEAM_MEMBER_INVITE citations
        const existingTeamInviteCits = loadedCitations.filter(c => c.cite_type === 'TEAM_MEMBER_INVITE');
        const existingTeamMemberIds = new Set(existingTeamInviteCits.map(c => (c.metadata as any)?.member_id || (c.metadata as any)?.userId));
        const newTeamCitations: Citation[] = [];

        teamData.forEach(member => {
          if (member.role === 'owner') return;
          const memberId = member.userId || member.id;
          if (existingTeamMemberIds.has(memberId)) return;
          newTeamCitations.push({
            id: `cite_team_member_${memberId.slice(0, 8)}_${Date.now()}`,
            cite_type: 'TEAM_MEMBER_INVITE', question_key: 'team_member',
            answer: `${member.name} — ${member.role}`, value: member.name,
            timestamp: new Date().toISOString(),
            metadata: {
              member_id: memberId, role: member.role, name: member.name,
              source: member.id.startsWith('invite-') ? 'email_invitation' : 'platform_member',
            },
          });
        });

        if (pendingInvites) {
          pendingInvites.forEach(invite => {
            if (invite.status !== 'pending') return;
            if (existingTeamMemberIds.has(invite.id)) return;
            if (newTeamCitations.some(c => (c.metadata as any)?.member_id === invite.id)) return;
            const emailName = invite.email.split('@')[0];
            const displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
            newTeamCitations.push({
              id: `cite_team_invite_${invite.id.slice(0, 8)}_${Date.now()}`,
              cite_type: 'TEAM_MEMBER_INVITE', question_key: 'team_member',
              answer: `${displayName} (${invite.email}) — ${invite.role || 'member'} [Pending]`,
              value: invite.email,
              timestamp: new Date().toISOString(),
              metadata: {
                member_id: invite.id, email: invite.email, role: invite.role || 'member',
                name: displayName, status: 'pending', source: 'email_invitation',
              },
            });
          });
        }

        if (newTeamCitations.length > 0) {
          loadedCitations.push(...newTeamCitations);
          setCitations([...loadedCitations]);
          try {
            const { data: sumData } = await supabase
              .from('project_summaries')
              .select('id, verified_facts')
              .eq('project_id', projectId)
              .maybeSingle();
            if (sumData?.id) {
              const currentFacts = Array.isArray(sumData.verified_facts) ? sumData.verified_facts : [];
              await supabase.from('project_summaries')
                .update({ verified_facts: [...currentFacts, ...newTeamCitations.map(c => c as unknown as Record<string, unknown>)] as unknown as null })
                .eq('id', sumData.id);
            }
          } catch (persistErr) {
            console.error('[Stage8] Failed to persist team citations:', persistErr);
          }
        }

        // Compute effective financial values
        let effectiveMatCost = Number(summary?.material_cost || 0);
        let effectiveLabCost = Number(summary?.labor_cost || 0);
        let effectiveTotalCost = Number(summary?.total_cost || 0);
        if (effectiveTotalCost === 0 && Array.isArray(summary?.template_items) && summary!.template_items.length > 0) {
          const items = summary!.template_items as any[];
          effectiveMatCost = items.filter(i => i.category === 'material').reduce((s: number, i: any) => s + (Number(i.totalPrice) || 0), 0);
          effectiveLabCost = items.filter(i => i.category === 'labor').reduce((s: number, i: any) => s + (Number(i.totalPrice) || 0), 0);
          effectiveTotalCost = effectiveMatCost + effectiveLabCost;
        }

        // BUDGET citation
        if (!loadedCitations.some(c => c.cite_type === 'BUDGET') && summary && effectiveTotalCost > 0) {
          loadedCitations.push({
            id: `cite_budget_${Date.now()}`, cite_type: 'BUDGET' as any,
            question_key: 'total_budget',
            answer: `$${effectiveTotalCost.toLocaleString()}`,
            value: effectiveTotalCost, timestamp: new Date().toISOString(),
            metadata: {
              material_cost: effectiveMatCost, labor_cost: effectiveLabCost,
              total_cost: effectiveTotalCost, source: 'project_summaries',
            },
          });
        }

        // TEMPLATE_LOCK synthetic
        if (!loadedCitations.some(c => c.cite_type === 'TEMPLATE_LOCK') && summary && (effectiveMatCost > 0 || effectiveLabCost > 0)) {
          const dbTemplateItems = Array.isArray(summary.template_items) && summary.template_items.length > 0
            ? summary.template_items : undefined;
          loadedCitations.push({
            id: `synthetic_template_lock_${Date.now()}`, cite_type: 'TEMPLATE_LOCK',
            question_key: 'template_lock',
            answer: `Materials: $${effectiveMatCost.toLocaleString()} · Labor: $${effectiveLabCost.toLocaleString()}`,
            value: 'locked', timestamp: new Date().toISOString(),
            metadata: {
              material_cost: effectiveMatCost, labor_cost: effectiveLabCost,
              total_cost: effectiveTotalCost, source: 'financial_recovery',
              ...(dbTemplateItems ? { items: dbTemplateItems } : {}),
            },
          });
        }

        // 4. Load tasks
        let { data: tasksData } = await supabase
          .from('project_tasks')
          .select('id, title, status, priority, description, assigned_to, due_date, created_at, total_cost, unit_price, quantity')
          .eq('project_id', projectId)
          .is('archived_at', null);

        // Auto-generate tasks if none exist
        if (!tasksData || tasksData.length === 0) {
          const timelineCit = loadedCitations.find(c => c.cite_type === 'TIMELINE');
          const endDateCit = loadedCitations.find(c => c.cite_type === 'END_DATE');
          const siteCondCit = loadedCitations.find(c => c.cite_type === 'SITE_CONDITION');

          const startStr = (timelineCit?.metadata as any)?.start_date || (summary as any)?.project_start_date;
          const endStr = endDateCit?.value || (endDateCit?.metadata as any)?.end_date || (summary as any)?.project_end_date;

          const fallbackStart = new Date();
          const fallbackEnd = new Date(fallbackStart.getTime() + 30 * 86400000);

          const startD = startStr ? new Date(startStr as string) : fallbackStart;
          const endD = endStr ? new Date(endStr as string) : fallbackEnd;
          const totalDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));
          const hasDemolition = siteCondCit?.value === 'demolition';

          const phases = [
            ...(hasDemolition ? [{ id: 'demolition', name: 'Demolition Work', pct: 15, pri: 'critical' }] : []),
            { id: 'preparation', name: 'Preparation Work', pct: 25, pri: 'high' },
            { id: 'installation', name: 'Installation Work', pct: 45, pri: 'medium' },
            { id: 'finishing', name: 'Finishing & QC', pct: 15, pri: 'medium' },
          ];
          const totalPct = phases.reduce((s, p) => s + p.pct, 0);

          const templateLockCitAuto = loadedCitations.find(c => c.cite_type === 'TEMPLATE_LOCK');
          const templateItemsAuto = (templateLockCitAuto?.metadata as any)?.items as any[] | undefined;

          const categorizeName = (name: string): string => {
            const n = name.toLowerCase();
            if (n.includes('demolition') || n.includes('demo') || n.includes('removal')) return 'demolition';
            if (n.includes('prep') || n.includes('primer') || n.includes('underlayment') ||
                n.includes('tape') || n.includes('compound') || n.includes('mesh') ||
                n.includes('rebar') || n.includes('forming')) return 'preparation';
            if (n.includes('finish') || n.includes('baseboard') || n.includes('trim') ||
                n.includes('transition') || n.includes('touch') || n.includes('qc')) return 'finishing';
            return 'installation';
          };

          const itemsByPhase: Record<string, any[]> = {};
          if (templateItemsAuto) {
            templateItemsAuto.forEach((item: any) => {
              const phaseId = categorizeName(item.name || '');
              if (!itemsByPhase[phaseId]) itemsByPhase[phaseId] = [];
              itemsByPhase[phaseId].push(item);
            });
          }

          const phaseNames: Record<string, string> = {
            demolition: 'Demolition', preparation: 'Preparation',
            installation: 'Installation', finishing: 'Finishing & QC',
          };

          let curDate = startD;
          const autoTasks: { title: string; description: string; priority: string; due_date: string; unit_price?: number; quantity?: number }[] = [];

          for (const phase of phases) {
            const days = Math.max(1, Math.round((phase.pct / totalPct) * totalDays));
            const phaseEnd = new Date(curDate.getTime() + days * 86400000);
            const phaseItems = itemsByPhase[phase.id] || [];
            if (phaseItems.length === 0) {
              autoTasks.push({ title: phase.name, description: `Phase: ${phase.id}`, priority: phase.pri, due_date: phaseEnd.toISOString() });
            }
            phaseItems.forEach((item: any) => {
              autoTasks.push({
                title: item.name || 'Template Item',
                description: `Template sub-task: ${phaseNames[phase.id] || 'Installation'}`,
                priority: 'medium', due_date: phaseEnd.toISOString(),
                unit_price: item.unitPrice || item.unit_price || item.totalPrice || item.total_price || 0,
                quantity: item.quantity || 1,
              });
            });
            autoTasks.push({
              title: `${phase.id.charAt(0).toUpperCase() + phase.id.slice(1)} Verification`,
              description: `Verification checkpoint: ${phase.id}`,
              priority: 'critical', due_date: phaseEnd.toISOString(),
            });
            curDate = phaseEnd;
          }

          const insertRows = autoTasks.map(t => ({ project_id: projectId, assigned_to: userId, assigned_by: userId, status: 'pending', ...t }));
          const { data: insertedTasks, error: insertErr } = await supabase
            .from('project_tasks')
            .insert(insertRows)
            .select('id, title, status, priority, description, assigned_to, due_date, created_at, total_cost, unit_price, quantity');
          if (!insertErr && insertedTasks) tasksData = insertedTasks;
        }

        // Template sub-task recovery
        if (tasksData && tasksData.length > 0) {
          const hasTemplateSubTasks = tasksData.some(t => t.description?.startsWith('Template sub-task:'));
          if (!hasTemplateSubTasks) {
            const templateLockCit = loadedCitations.find(c => c.cite_type === 'TEMPLATE_LOCK');
            const templateItems = (templateLockCit?.metadata as any)?.items as any[] | undefined;
            if (templateItems && templateItems.length > 0) {
              const categorize = (name: string): string => {
                const n = name.toLowerCase();
                if (n.includes('demolition') || n.includes('demo') || n.includes('removal')) return 'demolition';
                if (n.includes('prep') || n.includes('primer') || n.includes('underlayment') ||
                    n.includes('tape') || n.includes('compound') || n.includes('mesh') ||
                    n.includes('rebar') || n.includes('forming')) return 'preparation';
                if (n.includes('finish') || n.includes('baseboard') || n.includes('trim') ||
                    n.includes('transition') || n.includes('touch') || n.includes('qc')) return 'finishing';
                return 'installation';
              };
              const phaseNames: Record<string, string> = {
                demolition: 'Demolition', preparation: 'Preparation',
                installation: 'Installation', finishing: 'Finishing & QC',
              };
              const fallbackDueDate = tasksData.find(t => t.due_date)?.due_date || new Date().toISOString();
              const subTaskRows = templateItems.map((item: any) => {
                const phase = categorize(item.name || '');
                return {
                  project_id: projectId, title: item.name || 'Template Item',
                  description: `Template sub-task: ${phaseNames[phase] || 'Installation'}`,
                  assigned_to: userId, assigned_by: userId, priority: 'medium', status: 'pending',
                  due_date: fallbackDueDate,
                  unit_price: item.unitPrice || item.unit_price || item.totalPrice || item.total_price || 0,
                  quantity: item.quantity || 1,
                };
              });
              const { data: insertedSubTasks, error: subErr } = await supabase
                .from('project_tasks')
                .insert(subTaskRows)
                .select('id, title, status, priority, description, assigned_to, due_date, created_at, total_cost, unit_price, quantity');
              if (!subErr && insertedSubTasks) tasksData = [...tasksData, ...insertedSubTasks];
            }
          }
        }

        // Transform tasks to checklist format
        if (tasksData && tasksData.length > 0) {
          const taskPhotoIds = new Set<string>();
          loadedCitations.forEach((c: Citation) => {
            if (c?.metadata?.taskId && (c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION')) {
              taskPhotoIds.add(c.metadata.taskId as string);
            }
          });

          const tasksWithChecklist: TaskWithChecklist[] = tasksData.map(task => {
            let phase = 'installation';
            const descLower = (task.description || '').toLowerCase();
            const titleLower = task.title.toLowerCase();
            if (descLower.includes('demolition') || descLower.includes('phase: demolition')) phase = 'demolition';
            else if (descLower.includes('preparation') || descLower.includes('phase: preparation')) phase = 'preparation';
            else if (descLower.includes('finishing') || descLower.includes('phase: finishing')) phase = 'finishing';
            else if (titleLower.includes('demo') || titleLower.includes('removal')) phase = 'demolition';
            else if (titleLower.includes('prep') || titleLower.includes('primer') || titleLower.includes('setup')) phase = 'preparation';
            else if (titleLower.includes('finish') || titleLower.includes('baseboard') || titleLower.includes('trim') || titleLower.includes('qc')) phase = 'finishing';

            const isSubTask = descLower.startsWith('template sub-task:');
            const isVerification = titleLower.includes('verification');

            const templateLockCit = loadedCitations.find(c => c.cite_type === 'TEMPLATE_LOCK');
            const tplItems = (templateLockCit?.metadata as any)?.items as any[] | undefined;
            const matchedItem = isSubTask ? tplItems?.find((item: any) => item.name === task.title) : undefined;
            const templateItemCost = matchedItem
              ? (matchedItem.quantity || 0) * (matchedItem.unitPrice || 0)
              : task.total_cost ? Number(task.total_cost)
              : (task.unit_price && task.quantity) ? Number(task.unit_price) * Number(task.quantity) : undefined;

            const hasVerificationPhoto = taskPhotoIds.has(task.id);

            return {
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              phase,
              assigned_to: task.assigned_to,
              due_date: task.due_date || undefined,
              isSubTask,
              isVerification,
              templateItemCost,
              checklist: [
                { id: `${task.id}-start`, text: 'Work started', done: task.status === 'in_progress' || task.status === 'completed' },
                { id: `${task.id}-complete`, text: 'Work completed', done: task.status === 'completed' },
                { id: `${task.id}-verify`, text: 'Verification photo', done: hasVerificationPhoto },
              ],
            };
          });
          setTasks(tasksWithChecklist);
        }

        // 5. Load documents
        const { data: docsData } = await supabase
          .from('project_documents')
          .select('id, file_name, file_path, uploaded_at, uploaded_by_name, uploaded_by_role, ai_analysis_status, ai_analysis_result')
          .eq('project_id', projectId);

        let docsWithCategory: DocumentWithCategory[] = [];
        const docCitations = loadedCitations.filter(c =>
          ['BLUEPRINT_UPLOAD', 'SITE_PHOTO', 'VISUAL_VERIFICATION'].includes(c.cite_type)
        );
        const citationMap = new Map<string, { citation: Citation; category: DocumentCategory }>();
        docCitations.forEach(c => {
          const fileName = c.metadata?.fileName as string;
          if (fileName) {
            const category: DocumentCategory =
              (c.metadata?.category as DocumentCategory) ||
              (c.cite_type === 'BLUEPRINT_UPLOAD' ? 'technical' :
               c.cite_type === 'VISUAL_VERIFICATION' ? 'verification' : 'visual');
            citationMap.set(fileName.toLowerCase(), { citation: c, category });
          }
        });

        if (docsData) {
          docsWithCategory = docsData.map(doc => {
            const citationMatch = citationMap.get(doc.file_name.toLowerCase());
            return {
              id: doc.id, file_name: doc.file_name, file_path: doc.file_path,
              category: citationMatch?.category || categorizeDocument(doc.file_name, doc.file_path, doc.uploaded_by_role),
              citationId: citationMatch?.citation.id,
              uploadedAt: doc.uploaded_at,
              uploaded_by_name: doc.uploaded_by_name || undefined,
              uploaded_by_role: doc.uploaded_by_role || undefined,
              ai_analysis_status: doc.ai_analysis_status,
              ai_analysis_result: doc.ai_analysis_result as any,
            };
          });
        }

        // Add docs from citations not in DB
        docCitations.forEach(c => {
          const fileName = c.metadata?.fileName as string;
          if (fileName && !docsWithCategory.some(d => d.file_name.toLowerCase() === fileName.toLowerCase())) {
            const category: DocumentCategory =
              (c.metadata?.category as DocumentCategory) ||
              (c.cite_type === 'BLUEPRINT_UPLOAD' ? 'technical' :
               c.cite_type === 'VISUAL_VERIFICATION' ? 'verification' : 'visual');
            docsWithCategory.push({
              id: c.id, file_name: fileName,
              file_path: typeof c.value === 'string' ? c.value : '',
              category, citationId: c.id, uploadedAt: c.timestamp,
            });
          }
        });

        // Auto-generate template document
        const hasTemplateDoc = docsWithCategory.some(d => d.file_name.includes('materials-labor'));
        if (!hasTemplateDoc) {
          const tradeCit = loadedCitations.find(c => c.cite_type === 'TRADE_SELECTION');
          const templateLockCit = loadedCitations.find(c => c.cite_type === 'TEMPLATE_LOCK');
          const tradeName = (tradeCit?.answer || tradeCit?.value || 'custom') as string;
          const normalizedTrade = tradeName.toLowerCase().replace(/\s+/g, '_');
          const expectedFileName = `materials-labor-${normalizedTrade}.txt`;
          const expectedFilePath = `${projectId}/${expectedFileName}`;

          const { data: storageCheck } = await supabase.storage
            .from('project-documents')
            .list(projectId, { search: 'materials-labor' });

          if (storageCheck && storageCheck.length > 0) {
            const oldFiles = storageCheck.filter(f => f.name !== expectedFileName);
            if (oldFiles.length > 0) {
              await supabase.storage.from('project-documents').remove(oldFiles.map(f => `${projectId}/${f.name}`));
            }
          }

          const templateItems = (templateLockCit?.metadata as any)?.items as any[] | undefined;
          const matCost = Number(summary?.material_cost || (templateLockCit?.metadata as any)?.material_total || 0);
          const labCost = Number(summary?.labor_cost || (templateLockCit?.metadata as any)?.labor_total || 0);

          if ((templateItems && templateItems.length > 0) || matCost > 0 || labCost > 0) {
            const materials = (templateItems || []).filter((i: any) => i.category === 'material');
            const labor = (templateItems || []).filter((i: any) => i.category === 'labor');
            const documentSnapshot = {
              generated_at: new Date().toISOString(),
              trade: tradeName,
              gfa_sqft: Number((loadedCitations.find(c => c.cite_type === 'GFA_LOCK')?.value) || 0),
              waste_percent: (templateLockCit?.metadata as any)?.waste_percent || 0,
              markup_percent: (templateLockCit?.metadata as any)?.markup_percent || 0,
              demolition_cost: (templateLockCit?.metadata as any)?.demolition_cost || 0,
              source: 'stage8_auto',
              materials: materials.map((m: any) => ({
                name: m.name, category: m.category, quantity: m.quantity,
                baseQuantity: m.baseQuantity, unit: m.unit,
                unitPrice: m.unitPrice, totalPrice: m.totalPrice, wasteApplied: m.applyWaste,
              })),
              labor: labor.map((l: any) => ({
                name: l.name, category: l.category, quantity: l.quantity,
                unit: l.unit, unitPrice: l.unitPrice, totalPrice: l.totalPrice,
              })),
              summary: {
                material_total: matCost, labor_total: labCost,
                subtotal: (templateLockCit?.metadata as any)?.subtotal || (matCost + labCost),
                markup_amount: (templateLockCit?.metadata as any)?.markup_amount || 0,
                net_total: Number(summary?.total_cost || templateLockCit?.value || 0),
              },
            };
            const jsonBlob = new Blob([JSON.stringify(documentSnapshot, null, 2)], { type: 'text/plain' });
            await supabase.storage.from('project-documents').remove([expectedFilePath]);
            const { error: uploadErr } = await supabase.storage
              .from('project-documents')
              .upload(expectedFilePath, jsonBlob, { contentType: 'text/plain', upsert: true });

            if (!uploadErr) {
              const { data: oldDocs } = await supabase
                .from('project_documents')
                .select('id, file_name')
                .eq('project_id', projectId)
                .ilike('file_name', 'materials-labor%');
              if (oldDocs && oldDocs.length > 0) {
                await supabase.from('project_documents').delete().in('id', oldDocs.map(d => d.id));
              }
              const { data: newDoc } = await supabase
                .from('project_documents')
                .insert({ project_id: projectId, file_name: expectedFileName, file_path: expectedFilePath, file_size: jsonBlob.size })
                .select('id, file_name, file_path, uploaded_at')
                .single();
              if (newDoc) {
                docsWithCategory.push({
                  id: newDoc.id, file_name: newDoc.file_name, file_path: newDoc.file_path,
                  category: 'financial' as DocumentCategory, uploadedAt: newDoc.uploaded_at,
                });
              }
            }
          }
        }

        setDocuments(docsWithCategory);

        // 6. Load contracts
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('id, contract_number, status, total_amount, share_token, project_name, client_name, client_email, contractor_name, contractor_email, start_date, estimated_end_date, contractor_signature, client_signature, client_signed_at, sent_to_client_at, client_viewed_at')
          .eq('project_id', projectId)
          .is('archived_at', null);

        if (contractsData) {
          setContracts(contractsData);
          const existingContractCits = loadedCitations.filter(c => c.cite_type === 'CONTRACT');
          const existingContractIds = new Set(existingContractCits.map(c => (c.metadata as any)?.contract_id));
          contractsData.forEach((contract, idx) => {
            if (!existingContractIds.has(contract.id)) {
              const sigStatus = contract.client_signature && contract.contractor_signature ? 'Fully Signed'
                : contract.client_signature ? 'Client Signed'
                : contract.contractor_signature ? 'Contractor Signed'
                : 'Unsigned';
              loadedCitations.push({
                id: `cite_contract_${contract.id.slice(0, 8)}`,
                cite_type: 'CONTRACT' as any, question_key: `contract_${idx + 1}`,
                answer: `#${contract.contract_number} — ${contract.status.toUpperCase()} — ${sigStatus}${contract.total_amount ? ` — $${contract.total_amount.toLocaleString()}` : ''}`,
                value: contract.status, timestamp: new Date().toISOString(),
                metadata: {
                  contract_id: contract.id, contract_number: contract.contract_number,
                  status: contract.status, total_amount: contract.total_amount,
                  client_name: contract.client_name, contractor_name: contract.contractor_name,
                  client_signed: !!contract.client_signature, contractor_signed: !!contract.contractor_signature,
                  client_signed_at: contract.client_signed_at, sent_at: contract.sent_to_client_at,
                  source: 'contract_engine',
                },
              });
            }
          });
        }

        // Financial lock
        if (userRole === 'owner') {
          const hasFinancialData = loadedCitations.some(c =>
            ['BUDGET', 'MATERIAL', 'DEMOLITION_PRICE'].includes(c.cite_type)
          ) || (contractsData && contractsData.length > 0);
          setIsFinancialLocked(!hasFinancialData);
        } else {
          setIsFinancialLocked(true);
        }

        // 7. Load user profile for contracts
        const { data: profile } = await supabase
          .from('bu_profiles')
          .select('company_name, phone, service_area')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile) {
          const { data: { user } } = await supabase.auth.getUser();
          setUserProfile({
            company_name: profile.company_name, phone: profile.phone,
            email: user?.email || null, service_area: profile.service_area,
          });
        }

        // Owner profile
        if (project) {
          const projectOwnerId = project.user_id;
          const { data: ownerBuProfile } = await supabase
            .from('bu_profiles')
            .select('company_name, phone, service_area')
            .eq('user_id', projectOwnerId)
            .maybeSingle();
          const { data: ownerBasicProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', projectOwnerId)
            .maybeSingle();
          const ownerEmail = projectOwnerId === userId
            ? (await supabase.auth.getUser()).data.user?.email || null
            : null;
          setOwnerProfile({
            full_name: ownerBasicProfile?.full_name || null,
            company_name: ownerBuProfile?.company_name || null,
            phone: ownerBuProfile?.phone || null,
            email: ownerEmail,
            service_area: ownerBuProfile?.service_area || null,
          });
        }

      } catch (err) {
        console.error('[Stage8] Failed to load data:', err);
        logCriticalError('[Stage8] Data load failed', err);
        const localState = restoreProjectFromLocalStorage(projectId);
        if (localState?.citations) {
          setCitations(localState.citations);
          setDataSource('localStorage');
          toast.warning('Loaded from offline backup - connection issue detected');
        } else {
          toast.error('Failed to load project data');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId, userId, userRole, categorizeDocument, fetchWeather]);

  // Sync citations to localStorage
  useEffect(() => {
    if (projectId && citations.length > 0) {
      const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
      const gfaValue = typeof gfaCitation?.value === 'number'
        ? gfaCitation.value
        : typeof gfaCitation?.metadata?.gfa_value === 'number'
          ? gfaCitation.metadata.gfa_value
          : 0;
      syncCitationsToLocalStorage(projectId, citations, 8, gfaValue);
    }
  }, [projectId, citations]);

  return {
    isLoading,
    projectData,
    citations, setCitations,
    teamMembers, setTeamMembers,
    tasks, setTasks,
    documents, setDocuments,
    contracts, setContracts,
    financialSummary, setFinancialSummary,
    userProfile, ownerProfile,
    dataSource,
    isFinancialLocked, setIsFinancialLocked,
    categorizeDocument,
    weatherData, setWeatherData,
  };
}
