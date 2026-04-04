// ============================================
// useStage8Realtime — Realtime subscriptions for Stage 8
// Extracted from Stage8FinalReview.tsx
// ============================================

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Citation } from "@/types/citation";

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  role: string;
}

interface TaskWithChecklist {
  id: string;
  title: string;
  status: string;
  priority: string;
  phase: string;
  assigned_to: string;
  due_date?: string | null;
  created_at?: string | null;
  checklist: Array<{ id: string; text: string; done: boolean }>;
  isSubTask?: boolean;
  templateItemCost?: number;
}

interface FinancialSummary {
  material_cost: number;
  labor_cost: number;
  total_cost: number;
}

interface UseStage8RealtimeParams {
  projectId: string;
  userId: string;
  activeOrbitalPanel: string;
  teamMembers: TeamMember[];
  setTasks: React.Dispatch<React.SetStateAction<TaskWithChecklist[]>>;
  setCitations: React.Dispatch<React.SetStateAction<Citation[]>>;
  setFinancialSummary: React.Dispatch<React.SetStateAction<FinancialSummary>>;
}

export function useStage8Realtime({
  projectId,
  userId,
  activeOrbitalPanel,
  teamMembers,
  setTasks,
  setCitations,
  setFinancialSummary,
}: UseStage8RealtimeParams) {
  // ═══ Delivery Logs ═══
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchDeliveryLogs = async () => {
      const { data } = await supabase
        .from('site_logs')
        .select('id, notes, created_at, report_name, tasks_data')
        .eq('project_id', projectId)
        .eq('template_type', 'delivery')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setDeliveryLogs(data);
    };
    fetchDeliveryLogs();

    const channel = supabase
      .channel(`delivery-logs-${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'site_logs',
        filter: `project_id=eq.${projectId}`,
      }, (payload) => {
        if ((payload.new as any)?.template_type === 'delivery') {
          setDeliveryLogs(prev => [payload.new as any, ...prev]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  // ═══ Task Realtime ═══
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`tasks-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('[Stage8] ✓ Realtime task update received:', payload);

          if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as { id: string; status: string; assigned_to: string; title: string; priority: string };
            setTasks(prev => prev.map(t =>
              t.id === updatedTask.id
                ? { ...t, status: updatedTask.status, assigned_to: updatedTask.assigned_to }
                : t
            ));
            if (payload.old && (payload.old as any).status !== updatedTask.status) {
              const teamMember = teamMembers.find(m => m.userId === updatedTask.assigned_to);
              toast.info(`Task "${updatedTask.title}" ${updatedTask.status === 'completed' ? 'completed' : 'reopened'}`, {
                description: teamMember ? `By ${teamMember.name}` : undefined,
              });
            }
          } else if (payload.eventType === 'INSERT') {
            const newTask = payload.new as { id: string; title: string; status: string; priority: string; assigned_to: string };
            let phase = 'installation';
            const titleLower = newTask.title.toLowerCase();
            if (titleLower.includes('demo') || titleLower.includes('remove')) phase = 'demolition';
            else if (titleLower.includes('prep') || titleLower.includes('setup')) phase = 'preparation';
            else if (titleLower.includes('finish') || titleLower.includes('qc')) phase = 'finishing';

            setTasks(prev => [...prev, {
              id: newTask.id,
              title: newTask.title,
              status: newTask.status,
              priority: newTask.priority,
              phase,
              assigned_to: newTask.assigned_to,
              due_date: (newTask as any).due_date || null,
              created_at: (newTask as any).created_at || null,
              checklist: [
                { id: `${newTask.id}-start`, text: 'Task started', done: newTask.status !== 'pending' },
                { id: `${newTask.id}-complete`, text: 'Task completed', done: newTask.status === 'completed' },
                { id: `${newTask.id}-verify`, text: 'Verification photo', done: false },
              ],
            }]);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setTasks(prev => prev.filter(t => t.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        console.log('[Stage8] Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, teamMembers]);

  // ═══ Summary Realtime ═══
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`summaries-sync-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_summaries',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          console.log('[Stage8] ✓ Realtime project_summaries update received');

          if (updated.verified_facts && Array.isArray(updated.verified_facts)) {
            setCitations(updated.verified_facts as unknown as Citation[]);
          }

          // ── STRICT DYNAMIC LINKING: Recalculate from the freshest item-level data ──
          const liveLineItems: any[] = Array.isArray(updated.line_items) ? updated.line_items : [];
          const liveTemplateItems: any[] = Array.isArray(updated.template_items) ? updated.template_items : [];
          const recalcSource = liveLineItems.length > 0 ? liveLineItems : liveTemplateItems;

          let rtMat: number;
          let rtLab: number;
          let rtTot: number;

          if (recalcSource.length > 0) {
            const rtIsLaborByKeyword = (desc: string): boolean => {
              const d = desc.toLowerCase();
              return d.includes('labor') || d.includes('installation') || d.includes('preparation') ||
                d.includes('cleanup') || d.includes('grinding') ||
                d.includes('floor preparation') || d.includes('prep work') || d.includes('site prep');
            };
            const rtIsDemoByKeyword = (desc: string): boolean => {
              const d = desc.toLowerCase();
              return d.includes('demolition') || d.includes('demo ') || d.includes('removal');
            };

            rtMat = 0;
            rtLab = 0;
            let rtDemo = 0;
            for (const item of recalcSource) {
              const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) || Number(item.total) || Number(item.totalPrice) || 0;
              const desc = item.description || item.name || '';
              if (rtIsDemoByKeyword(desc)) {
                rtDemo += itemTotal;
              } else if (rtIsLaborByKeyword(desc)) {
                rtLab += itemTotal;
              } else {
                rtMat += itemTotal;
              }
            }
            rtTot = rtMat + rtLab;
            console.log('[Stage8] ✓ Financials recalculated from items (realtime):', { rtMat, rtLab, rtDemo, rtTot, source: liveLineItems.length > 0 ? 'line_items' : 'template_items', itemCount: recalcSource.length });
          } else {
            rtMat = updated.material_cost ?? 0;
            rtLab = updated.labor_cost ?? 0;
            rtTot = updated.total_cost ?? (rtMat + rtLab);
          }

          setFinancialSummary({ material_cost: rtMat, labor_cost: rtLab, total_cost: rtTot });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // ═══ Unread Chat Counter ═══
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const lastSeenChatRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    lastSeenChatRef.current = new Date().toISOString();

    const chatChannel = supabase
      .channel(`chat-unread-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_chat_messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const msg = payload.new as { user_id: string };
          if (msg.user_id !== userId) {
            if (activeOrbitalPanel === 'panel-4-team') {
              lastSeenChatRef.current = new Date().toISOString();
            } else {
              setUnreadChatCount(prev => prev + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [projectId, userId]);

  // Reset unread count when Team panel becomes active
  const resetUnreadChat = useCallback(() => {
    setUnreadChatCount(0);
    lastSeenChatRef.current = new Date().toISOString();
  }, []);

  return {
    deliveryLogs,
    unreadChatCount,
    resetUnreadChat,
  };
}
