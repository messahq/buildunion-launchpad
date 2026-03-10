// ============================================
// PANEL 4: Team Architecture (Card + Fullscreen)
// Extracted from Stage8FinalReview.tsx
// ============================================

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, ChevronDown, ChevronRight, UserPlus, MessageCircle,
} from "lucide-react";
import type { Citation } from "@/types/citation";
import { TeamChatPanel } from "@/components/project-wizard/TeamChatPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DocumentCategory, DocumentWithCategory } from "./types";

// ============================================
// PROPS
// ============================================
export interface Panel4Props {
  mode: 'card' | 'fullscreen';
  citations: Citation[];
  panelCitations: Citation[];
  teamMembers: { id: string; role: string; name: string; userId: string; primary_trade?: string; hst_number?: string }[];
  projectId: string;
  userId: string;
  userRole: string;
  canEdit: boolean;
  collapsedPanels: Set<string>;
  setCollapsedPanels: React.Dispatch<React.SetStateAction<Set<string>>>;
  activeOrbitalPanel?: string;
  renderCitationValue: (citation: Citation) => React.ReactNode;
  categorizeDocument: (fileName: string, filePath: string) => DocumentCategory;
  setDocuments: React.Dispatch<React.SetStateAction<DocumentWithCategory[]>>;
}

// ============================================
// COMPONENT
// ============================================
export const Panel4Team: React.FC<Panel4Props> = ({
  mode,
  citations,
  panelCitations,
  teamMembers,
  projectId,
  userId,
  userRole,
  canEdit,
  collapsedPanels,
  setCollapsedPanels,
  activeOrbitalPanel,
  renderCitationValue,
  categorizeDocument,
  setDocuments,
}) => {
  const teamSizeCitation = citations.find(c => c.cite_type === 'TEAM_SIZE') || citations.find(c => c.cite_type === 'TEAM_STRUCTURE');
  const teamInviteCitation = citations.find(c => c.cite_type === 'TEAM_MEMBER_INVITE');

  const refreshDocuments = async () => {
    const { data: newDocs } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false });
    if (newDocs) {
      setDocuments(newDocs.map(doc => ({
        id: doc.id,
        file_name: doc.file_name,
        file_path: doc.file_path,
        category: categorizeDocument(doc.file_name, doc.file_path),
        uploadedAt: doc.uploaded_at,
      })));
    }
  };

  // ======= CARD MODE =======
  if (mode === 'card') {
    return (
      <div className="space-y-2.5">
        {/* Team Size Citation */}
        {teamSizeCitation && (
          <div className="p-2.5 rounded-xl border-2 border-indigo-200 dark:border-indigo-700 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-bold">Team Size</span>
              <span className="text-[8px] text-indigo-400 dark:text-indigo-500 font-mono">[{teamSizeCitation.id.slice(0, 8)}]</span>
            </div>
            <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200 mt-0.5">{renderCitationValue(teamSizeCitation)}</p>
          </div>
        )}

        {/* Member Cards */}
        {teamMembers.length === 0 ? (
          <div className="p-4 rounded-xl border-2 border-dashed border-teal-300 dark:border-teal-700 text-center bg-teal-50/50 dark:bg-teal-950/20">
            <Users className="h-6 w-6 text-teal-400 mx-auto mb-1.5" />
            <p className="text-[10px] text-teal-600 dark:text-teal-400">No team members added</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {teamMembers.map((member, idx) => {
              const roleColors: Record<string, string> = {
                owner: 'from-amber-500 to-orange-600', foreman: 'from-emerald-500 to-teal-600',
                worker: 'from-blue-500 to-indigo-600', inspector: 'from-violet-500 to-purple-600',
                subcontractor: 'from-cyan-500 to-blue-600', member: 'from-gray-500 to-slate-600',
              };
              const rowBgs = [
                'border-emerald-200 dark:border-emerald-700/30 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 dark:from-emerald-950/20 dark:to-teal-950/20',
                'border-cyan-200 dark:border-cyan-700/30 bg-gradient-to-r from-cyan-50/80 to-sky-50/60 dark:from-cyan-950/20 dark:to-sky-950/20',
                'border-amber-200 dark:border-amber-700/30 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-950/20 dark:to-orange-950/20',
                'border-violet-200 dark:border-violet-700/30 bg-gradient-to-r from-violet-50/80 to-indigo-50/60 dark:from-violet-950/20 dark:to-indigo-950/20',
                'border-lime-200 dark:border-lime-700/30 bg-gradient-to-r from-lime-50/80 to-green-50/60 dark:from-lime-950/20 dark:to-green-950/20',
              ];
              const gradient = roleColors[member.role] || roleColors.member;
              const rowBg = rowBgs[idx % rowBgs.length];
              return (
                <motion.div key={member.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                  className={cn("flex items-center justify-between p-2 rounded-xl border-2 transition-colors group hover:shadow-md", rowBg)}>
                  <div className="flex items-center gap-2">
                    <div className={cn("h-7 w-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold shadow-md", gradient)}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-800 dark:text-gray-100">{member.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-teal-600 dark:text-teal-400 capitalize font-medium">{member.role}</span>
                        {teamInviteCitation && idx === 0 && (
                          <span className="text-[7px] text-teal-500/60 dark:text-teal-400/50 font-mono">[{teamInviteCitation.id.slice(0, 6)}]</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* In-Panel Project Chat */}
        {teamMembers.length > 0 && (
          <TeamChatPanel projectId={projectId} userId={userId} teamMembers={teamMembers} compact={true} defaultCollapsed={true} onDocumentAdded={refreshDocuments} />
        )}

        {/* Citations - Collapsible */}
        {panelCitations.length > 0 && (
          <div className="pt-2 border-t border-indigo-200 dark:border-indigo-700/30">
            <button
              onClick={() => setCollapsedPanels(prev => {
                const next = new Set(prev);
                const key = `citations-${activeOrbitalPanel}`;
                next.has(key) ? next.delete(key) : next.add(key);
                return next;
              })}
              className="w-full flex items-center justify-between mb-1 hover:opacity-80 transition-opacity"
            >
              <p className="text-[9px] text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-bold">Citations ({panelCitations.length})</p>
              {collapsedPanels.has(`citations-${activeOrbitalPanel}`) ? (
                <ChevronRight className="h-3 w-3 text-indigo-400" />
              ) : (
                <ChevronDown className="h-3 w-3 text-indigo-400" />
              )}
            </button>
            <AnimatePresence>
              {!collapsedPanels.has(`citations-${activeOrbitalPanel}`) && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-1">
                  {panelCitations.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-700/30">
                      <span className="text-[9px] text-indigo-600/70 dark:text-indigo-400/70">{c.cite_type.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-indigo-800 dark:text-indigo-200">{renderCitationValue(c)}</span>
                        <span className="text-[7px] text-indigo-400 dark:text-indigo-500 font-mono">[{c.id.slice(0, 6)}]</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  // ======= FULLSCREEN MODE =======
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl border border-white/10 bg-gradient-to-r from-[#111827]/90 to-[#0f172a]/90 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ boxShadow: ['0 0 10px rgba(245,158,11,0.2)', '0 0 25px rgba(245,158,11,0.5)', '0 0 10px rgba(245,158,11,0.2)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg"
          >
            <Users className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <h4 className="text-lg font-black text-gray-100 tracking-tight">Team Architecture</h4>
            <p className="text-[11px] text-gray-400">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} deployed</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] px-2.5 py-1 gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            {teamMembers.length}
          </Badge>
          {canEdit && (
            <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white text-xs gap-1.5 shadow-lg shadow-amber-900/30"
              onClick={() => toast.info('Use Stage 6 (Team Setup) to add new members')}>
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Member</span>
            </Button>
          )}
        </div>
      </div>

      {/* Role Distribution Bar */}
      {teamMembers.length > 0 && (() => {
        const roleCounts = teamMembers.reduce((acc, m) => { acc[m.role] = (acc[m.role] || 0) + 1; return acc; }, {} as Record<string, number>);
        const roleColorMap: Record<string, string> = { owner: '#f59e0b', foreman: '#10b981', worker: '#3b82f6', inspector: '#8b5cf6', subcontractor: '#64748b', member: '#94a3b8' };
        return (
          <div className="space-y-2 p-3 rounded-xl border border-white/5 bg-[#111827]/60">
            <div className="h-2.5 rounded-full overflow-hidden flex bg-white/5">
              {Object.entries(roleCounts).map(([role, count]) => (
                <div key={role} style={{ width: `${(count / teamMembers.length) * 100}%`, backgroundColor: roleColorMap[role] || '#94a3b8' }} className="h-full first:rounded-l-full last:rounded-r-full" />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(roleCounts).map(([role, count]) => (
                <div key={role} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: roleColorMap[role] || '#94a3b8' }} />
                  <span className="text-[11px] text-gray-400 capitalize font-medium">{role} ({count})</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Member Cards */}
      {teamMembers.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {teamMembers.map((member, idx) => {
            const roleBorderColors: Record<string, string> = { owner: 'border-amber-500/50', foreman: 'border-emerald-500/50', worker: 'border-blue-500/50', inspector: 'border-violet-500/50', subcontractor: 'border-slate-500/50', member: 'border-gray-500/50' };
            const roleAvatarColors: Record<string, string> = { owner: 'ring-amber-500 bg-gradient-to-br from-amber-500 to-orange-600', foreman: 'ring-emerald-500 bg-gradient-to-br from-emerald-500 to-teal-600', worker: 'ring-blue-500 bg-gradient-to-br from-blue-500 to-indigo-600', inspector: 'ring-violet-500 bg-gradient-to-br from-violet-500 to-purple-600', subcontractor: 'ring-slate-400 bg-gradient-to-br from-slate-500 to-gray-600', member: 'ring-gray-400 bg-gradient-to-br from-gray-500 to-slate-600' };
            const roleBadgeColors: Record<string, string> = { owner: 'bg-amber-500/15 text-amber-300 border-amber-500/30', foreman: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', worker: 'bg-blue-500/15 text-blue-300 border-blue-500/30', inspector: 'bg-violet-500/15 text-violet-300 border-violet-500/30', subcontractor: 'bg-slate-500/15 text-slate-300 border-slate-500/30', member: 'bg-gray-500/15 text-gray-300 border-gray-500/30' };
            const statusOptions = ['online', 'offline', 'pending'] as const;
            const memberStatus = member.role === 'owner' ? 'online' : statusOptions[idx % 3];
            const statusConfig = { online: { dot: 'bg-emerald-500', text: 'text-emerald-400', label: 'Online' }, pending: { dot: 'bg-amber-500', text: 'text-amber-400', label: 'Pending' }, offline: { dot: 'bg-gray-500', text: 'text-gray-500', label: 'Offline' } };
            const status = statusConfig[memberStatus];

            return (
              <motion.div key={member.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
                whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(245,158,11,0.15)' }}
                className={cn("flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all cursor-pointer bg-[#111827]/70 backdrop-blur-sm hover:bg-[#1a2233]/80", roleBorderColors[member.role] || 'border-gray-600/30')}>
                <div className={cn("h-12 w-12 rounded-full ring-2 flex items-center justify-center text-white text-base font-bold shrink-0 shadow-lg", roleAvatarColors[member.role] || roleAvatarColors.member)}>
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm sm:text-base font-bold text-gray-100 truncate">{member.name}</p>
                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 capitalize shrink-0 border", roleBadgeColors[member.role] || roleBadgeColors.member)}>{member.role}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("h-2 w-2 rounded-full shrink-0", status.dot, memberStatus === 'online' && 'animate-pulse')} />
                    <span className={cn("text-[11px] font-medium", status.text)}>{status.label}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 gap-1 text-xs shrink-0"
                  onClick={(e) => { e.stopPropagation(); const chatEl = document.getElementById('team-chat-panel-anchor'); if (chatEl) chatEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Chat</span>
                </Button>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No team members yet</p>
          <p className="text-xs text-gray-600 mt-1">Add members via Stage 6 (Team Setup)</p>
        </div>
      )}

      {/* In-Panel Project Chat */}
      <TeamChatPanel projectId={projectId} userId={userId} teamMembers={teamMembers} compact={false} onDocumentAdded={refreshDocuments} />
    </motion.div>
  );
};
