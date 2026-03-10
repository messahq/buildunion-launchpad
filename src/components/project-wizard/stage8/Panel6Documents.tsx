// ============================================
// PANEL 6: Documents & Contracts (Extracted)
// ============================================

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FolderOpen, Plus, FileCheck, Search, Upload, Download, Eye, Send,
  Trash2, RefreshCw, FileText, AlertTriangle, CheckCircle2, Circle,
  ShieldCheck, Loader2,
} from "lucide-react";
import { HardHatSpinner } from "@/components/ui/loading-states";
import { SignedImage } from "./SignedMedia";
import { DOCUMENT_CATEGORIES } from "./constants";
import type { DocumentCategory, DocumentWithCategory } from "./types";
import type { Citation } from "@/types/citation";

// ============================================
// PROPS
// ============================================
export interface Panel6Props {
  documents: DocumentWithCategory[];
  contracts: Array<{
    id: string;
    contract_number: string;
    project_name?: string | null;
    status: string;
    client_name?: string | null;
    client_email?: string | null;
    contractor_name?: string | null;
    contractor_email?: string | null;
    total_amount?: number | null;
    start_date?: string | null;
    estimated_end_date?: string | null;
    contractor_signature?: any;
    client_signature?: any;
    client_signed_at?: string | null;
    sent_to_client_at?: string | null;
    client_viewed_at?: string | null;
    share_token?: string | null;
  }>;
  userRole: string;
  canEdit: boolean;
  canViewFinancials: boolean;
  isUploading: boolean;
  isDraggingOver: boolean;
  selectedUploadCategory: DocumentCategory;
  obcComplianceResults: {
    sections: Array<{ section_number: string }>;
    lastCheckedAt: string | null;
    loading: boolean;
  };
  fileInputRef: React.RefObject<HTMLInputElement>;

  // Callbacks
  setSelectedUploadCategory: (cat: DocumentCategory) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDownloadDocument: (filePath: string, fileName: string) => void;
  setFullscreenPanel: (panel: string) => void;
  setPreviewDocument: (doc: {
    file_name: string; file_path: string; category: string;
    citationId?: string; uploaded_by_name?: string | null;
    uploaded_by_role?: string | null; uploadedAt?: string;
  } | null) => void;
  setContractStep: (step: 'select_member' | 'preview') => void;
  setSelectedContractMember: (member: any) => void;
  setSelectedContractType: (type: string | null) => void;
  setShowContractPreview: (show: boolean) => void;
  setSelectedContractForEmail: (contract: any) => void;
  setContractRecipients: (recipients: { email: string; name: string }[]) => void;
  setShowContractEmailDialog: (show: boolean) => void;
  setContractToDelete: (contract: { id: string; contract_number: string; status: string } | null) => void;
  getCitationsForPanel: (dataKeys: string[]) => Citation[];
  toast: any;
}

// ============================================
// COMPONENT
// ============================================
export const Panel6Documents: React.FC<Panel6Props> = React.memo(({
  documents, contracts, userRole, canEdit, canViewFinancials,
  isUploading, isDraggingOver, selectedUploadCategory, obcComplianceResults,
  fileInputRef,
  setSelectedUploadCategory, handleDragOver, handleDragLeave, handleDrop,
  handleDownloadDocument, setFullscreenPanel, setPreviewDocument,
  setContractStep, setSelectedContractMember, setSelectedContractType,
  setShowContractPreview, setSelectedContractForEmail, setContractRecipients,
  setShowContractEmailDialog, setContractToDelete, getCitationsForPanel, toast,
}) => {
  const panelCitations = getCitationsForPanel(['BLUEPRINT_UPLOAD', 'SITE_PHOTO', 'VISUAL_VERIFICATION']);

  // Sort all docs by upload date descending to find latest
  const allDocsSorted = useMemo(() =>
    [...documents].sort((a, b) => {
      const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return dateB - dateA;
    }), [documents]);
  const latestDocId = allDocsSorted[0]?.id;

  const docsByCategory = useMemo(() => DOCUMENT_CATEGORIES.map(cat => {
    const categoryDocs = documents.filter(d => d.category === cat.key);
    const docsWithCitations = categoryDocs.map(doc => {
      const isReport = doc.file_name.match(/report|analysis|summary|estimate/i);
      const matchingCitation = !doc.citationId ? panelCitations.find(c => {
        const citationFileName = c.metadata?.file_name || c.metadata?.fileName || c.answer;
        return citationFileName && doc.file_name.toLowerCase().includes(String(citationFileName).toLowerCase().slice(0, 10));
      }) : undefined;
      const resolvedCitationId = doc.citationId || matchingCitation?.id || `doc-${doc.id}`;
      return {
        ...doc,
        citationId: resolvedCitationId,
        citationType: matchingCitation?.cite_type || (isReport ? 'REPORT' : doc.citationId ? 'UPLOAD' : undefined),
        isLatest: doc.id === latestDocId,
        uploadedAt: doc.uploadedAt || (matchingCitation?.timestamp ? format(new Date(matchingCitation.timestamp), 'MMM dd, yyyy') : undefined),
      };
    });
    return {
      ...cat,
      documents: docsWithCitations,
      citationCount: docsWithCitations.filter(d => d.citationId).length,
    };
  }), [documents, panelCitations, latestDocId]);

  const openContractCreator = () => {
    setContractStep('select_member');
    setSelectedContractMember(null);
    setSelectedContractType(null);
    setShowContractPreview(true);
  };

  const catIcons: Record<string, { emoji: string; bg: string }> = {
    'legal': { emoji: '⚖️', bg: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
    'technical': { emoji: '📐', bg: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
    'visual': { emoji: '📸', bg: 'linear-gradient(135deg, #10b981, #059669)' },
    'verification': { emoji: '🔒', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    'obc_pending': { emoji: '⚠️', bg: 'linear-gradient(135deg, #ef4444, #dc2626)' },
  };

  return (
    <div className="space-y-6 rounded-2xl p-5 sm:p-7 relative overflow-hidden" style={{ background: 'linear-gradient(150deg, #111827 0%, #1e293b 100%)' }}>

      {/* ─── Elegant Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff9500, #f59e0b)', boxShadow: '0 4px 14px rgba(255,149,0,0.25)' }}>
            <FolderOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-[22px] font-light tracking-tight text-white" style={{ textShadow: '0 1px 8px rgba(255,149,0,0.15)' }}>
              Documents <span style={{ color: '#ff9500' }}>&</span> Contracts
            </h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {documents.length} files · {contracts.length} contracts
              {panelCitations.length > 0 && (
                <span className="ml-1.5 text-emerald-400">· {panelCitations.filter(c => c.id).length} cited</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {(userRole === 'owner' || userRole === 'foreman') && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 w-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                      style={{ background: 'rgba(255,149,0,0.15)', border: '1px solid rgba(255,149,0,0.25)' }}
                    >
                      <Plus className="h-4 w-4 text-amber-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Upload File</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={openContractCreator}
                      className="h-8 w-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                      style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}
                    >
                      <FileCheck className="h-3.5 w-3.5 text-violet-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Create Contract</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>

      {/* ─── Search Bar ─── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        <input
          type="text"
          placeholder="Search files, contracts..."
          className="w-full h-9 pl-10 pr-4 rounded-xl text-sm text-white placeholder:text-slate-500/70 transition-all focus:outline-none"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.07)',
            caretColor: '#ff9500',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(255,149,0,0.35)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; }}
        />
      </div>

      {/* ─── Upload Zone ─── */}
      {(userRole === 'owner' || userRole === 'foreman') && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-400/70 font-mono uppercase tracking-wider">Upload to:</span>
            <Select value={selectedUploadCategory} onValueChange={(v) => setSelectedUploadCategory(v as DocumentCategory)}>
              <SelectTrigger className="h-7 w-28 text-[11px] border-slate-700 bg-slate-800/40 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map(cat => (
                  <SelectItem key={cat.key} value={cat.key} className="text-xs">{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border border-dashed rounded-xl p-4 text-center transition-all cursor-pointer",
              isDraggingOver
                ? "border-amber-500/60 bg-amber-500/8"
                : "border-slate-600/30 hover:border-amber-500/40 hover:bg-amber-500/4"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-2">
                <HardHatSpinner size="sm" />
                <span className="text-sm text-amber-400">Uploading...</span>
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 mx-auto text-slate-500 mb-1" />
                <p className="text-sm text-slate-400">
                  Drop files or <span className="font-medium text-amber-400">click to browse</span>
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">PDF · Images · Blueprints · OBC docs</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Documents by Category ─── */}
      <div className="space-y-4">
        {docsByCategory.map(cat => {
          const isPendingCategory = cat.key === 'obc_pending';
          const hasFiles = cat.documents.length > 0;
          const catStyle = catIcons[cat.key] || { emoji: '📁', bg: 'linear-gradient(135deg, #ff9500, #f59e0b)' };

          return (
            <motion.div
              key={cat.key}
              whileHover={{ scale: 1.015, y: -1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="rounded-xl p-4 transition-all relative"
              style={{
                background: 'rgba(0,0,0,0.35)',
                backdropFilter: 'blur(16px)',
                border: isPendingCategory && !hasFiles
                  ? '1px solid rgba(239,68,68,0.3)'
                  : '1px solid rgba(255,149,0,0.12)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              }}
            >
              {hasFiles && (
                <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,149,0,0.05) 0%, transparent 70%)' }} />
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center text-sm" style={{ background: catStyle.bg, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                    {catStyle.emoji}
                  </div>
                  <span className={cn("text-[15px] font-medium tracking-tight", hasFiles ? "text-white" : "text-slate-500")}>{cat.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(userRole === 'owner' || userRole === 'foreman') && !isPendingCategory && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedUploadCategory(cat.key as DocumentCategory); fileInputRef.current?.click(); }}
                      className="h-6 w-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
                      style={{ background: 'rgba(255,149,0,0.1)', border: '1px solid rgba(255,149,0,0.2)' }}
                    >
                      <Plus className="h-3 w-3 text-amber-400" />
                    </button>
                  )}
                  {hasFiles && (
                    <span className="text-[9px] font-bold text-white rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff9500, #f59e0b)' }}>
                      {cat.documents.length}
                    </span>
                  )}
                  {cat.citationCount > 0 && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-emerald-400" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      {cat.citationCount} cited
                    </span>
                  )}
                </div>
              </div>

              {!hasFiles ? (
                <div className="flex flex-col items-center gap-2 py-3">
                  {isPendingCategory ? (
                    <div className="text-center">
                      <AlertTriangle className="h-6 w-6 text-red-400/50 mx-auto mb-1.5" />
                      <p className="text-xs text-orange-400/80">
                        {obcComplianceResults.sections.length > 0
                          ? 'OBC sections identified — no docs uploaded'
                          : (obcComplianceResults.lastCheckedAt
                            ? '✅ No OBC requirements detected'
                            : 'Pending OBC Compliance Check')}
                      </p>
                    </div>
                  ) : (
                    <>
                      <FolderOpen className="h-7 w-7 text-slate-600/60" />
                      <span className="text-xs text-slate-500">No files or contracts yet</span>
                      {(userRole === 'owner' || userRole === 'foreman') && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[11px] font-medium px-3.5 py-1 rounded-lg transition-all hover:scale-105"
                          style={{ background: 'rgba(255,149,0,0.1)', border: '1px solid rgba(255,149,0,0.2)', color: '#ff9500' }}
                        >
                          Upload now
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {cat.documents.slice(0, 3).map(doc => {
                    const isImage = doc.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    const isPdf = doc.file_name.match(/\.pdf$/i);
                    const isPendingDoc = isPendingCategory || doc.file_path?.includes('/pending/');

                    return (
                      <motion.div
                        key={doc.id}
                        whileHover={{ x: 3 }}
                        className="group flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                        onClick={() => !isPendingDoc && setPreviewDocument({
                          file_name: doc.file_name, file_path: doc.file_path, category: cat.key,
                          citationId: doc.citationId, uploaded_by_name: doc.uploaded_by_name,
                          uploaded_by_role: doc.uploaded_by_role, uploadedAt: doc.uploadedAt,
                        })}
                      >
                        {/* Thumbnail */}
                        <div className="relative flex-shrink-0 w-[60px] h-[60px] rounded-lg overflow-hidden transition-all group-hover:ring-1 group-hover:ring-amber-500/30" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                          {isPendingDoc ? (
                            <div className="w-full h-full bg-orange-900/30 flex items-center justify-center">
                              <AlertTriangle className="h-4 w-4 text-orange-400" />
                            </div>
                          ) : isImage ? (
                            <SignedImage filePath={doc.file_path} alt={doc.file_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                          ) : isPdf ? (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.08)' }}>
                              <FileText className="h-5 w-5 text-red-400/70" />
                            </div>
                          ) : (
                            <div className="w-full h-full bg-slate-800/60 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-slate-500" />
                            </div>
                          )}
                          {!isPendingDoc && (
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center">
                              <Eye className="h-3.5 w-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <span className={cn("text-sm truncate block font-medium", isPendingDoc ? "text-orange-300" : "text-white")}>{doc.file_name}</span>
                          {isPendingDoc && doc.citationId && (
                            <span className="text-[10px] text-orange-400/60 font-mono">Upload required per OBC</span>
                          )}
                          {!isPendingDoc && doc.uploadedAt && (
                            <span className="text-[10px] text-slate-500">{doc.uploadedAt}</span>
                          )}
                        </div>

                        {/* Actions */}
                        {!isPendingDoc && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg" onClick={(e) => { e.stopPropagation(); handleDownloadDocument(doc.file_path, doc.file_name); }}>
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        {/* Badges */}
                        {isPendingDoc ? (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 text-orange-400" style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
                            Pending
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {doc.ai_analysis_status === 'pending' && (
                              <span
                                className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0 animate-pulse"
                                style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6' }}
                              >
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                SCANNING
                              </span>
                            )}
                            {doc.ai_analysis_status === 'rejected_non_regulatory' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0 animate-pulse"
                                      style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}
                                    >
                                      <AlertTriangle className="h-2.5 w-2.5" />
                                      REJECTED
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs max-w-[260px]">
                                    <p className="font-bold text-red-400">⚠ AI Verification FAILED</p>
                                    <p className="text-muted-foreground mt-0.5">
                                      Detected as: <span className="font-semibold text-red-300">"{(doc.ai_analysis_result as any)?.doc_type || 'Non-regulatory document'}"</span>
                                    </p>
                                    <p className="text-muted-foreground mt-0.5">
                                      Confidence: {(doc.ai_analysis_result as any)?.confidence || 'N/A'}
                                    </p>
                                    {(doc.ai_analysis_result as any)?.key_details && (
                                      <p className="text-red-400/80 mt-1 text-[10px] italic">"{(doc.ai_analysis_result as any).key_details}"</p>
                                    )}
                                    <p className="text-red-400 mt-1.5 text-[10px] font-bold">❌ This document does NOT count towards OBC compliance or project integrity.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {doc.ai_analysis_status === 'verified_regulatory' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0"
                                      style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}
                                    >
                                      <ShieldCheck className="h-2.5 w-2.5" />
                                      VERIFIED
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs max-w-[260px]">
                                    <p className="font-bold text-emerald-400">✓ AI Verified — Legitimate Document</p>
                                    <p className="text-muted-foreground mt-0.5">
                                      Type: <span className="font-semibold text-emerald-300">{(doc.ai_analysis_result as any)?.doc_type || 'Regulatory'}</span>
                                    </p>
                                    <p className="text-muted-foreground mt-0.5">
                                      Confidence: {(doc.ai_analysis_result as any)?.confidence || 'N/A'}
                                    </p>
                                    {(doc.ai_analysis_result as any)?.key_details && (
                                      <p className="text-emerald-400/80 mt-1 text-[10px]">{(doc.ai_analysis_result as any).key_details}</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {(doc as any).isLatest && (
                              <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full text-amber-300" style={{ background: 'rgba(255,149,0,0.12)', border: '1px solid rgba(255,149,0,0.2)' }}>
                                LATEST
                              </span>
                            )}
                            {doc.citationId ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className="text-[9px] font-mono px-1.5 py-0.5 rounded-md cursor-help hover:underline decoration-amber-500/50"
                                      style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', color: '#ff9500' }}
                                    >
                                      [cite_{doc.citationId.slice(0, 4)}]
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">Cited in project data</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : null}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  {cat.documents.length > 3 && (
                    <button
                      onClick={() => setFullscreenPanel('panel-6-documents')}
                      className="text-[11px] font-medium pl-2 text-amber-400/80 hover:text-amber-300 hover:underline transition-colors"
                    >
                      +{cat.documents.length - 3} more → View All
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ─── Contracts Section ─── */}
      <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', boxShadow: '0 2px 8px rgba(139,92,246,0.2)' }}>
              📜
            </div>
            <span className="text-[15px] font-medium text-white tracking-tight">Contracts</span>
            <span className="text-[9px] font-bold text-white rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
              {contracts.length}
            </span>
          </div>
          {(userRole === 'owner' || userRole === 'foreman') && (
            <button
              onClick={openContractCreator}
              className="h-6 w-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}
            >
              <Plus className="h-3 w-3 text-violet-400" />
            </button>
          )}
        </div>

        {contracts.length > 0 ? (
          <div className="space-y-3">
            {contracts.map(contract => {
              const isSigned = contract.status === 'signed';
              const isSent = contract.status === 'sent';
              const statusIcon = isSigned ? '✅' : isSent ? '📨' : '📝';
              const statusBg = isSigned ? 'rgba(16,185,129,0.1)' : isSent ? 'rgba(56,189,248,0.1)' : 'rgba(251,191,36,0.1)';
              const statusBorder = isSigned ? 'rgba(16,185,129,0.25)' : isSent ? 'rgba(56,189,248,0.25)' : 'rgba(251,191,36,0.25)';
              const statusText = isSigned ? 'text-emerald-400' : isSent ? 'text-sky-400' : 'text-amber-400';

              return (
                <motion.div
                  key={contract.id}
                  whileHover={{ scale: 1.015, y: -1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(0,0,0,0.35)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(139,92,246,0.12)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  }}
                >
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer"
                    onClick={() => {
                      if (contract.share_token) window.open(`/contract/sign?token=${contract.share_token}`, '_blank');
                      else toast.info('Contract preview not available');
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{statusIcon}</span>
                      <div>
                        <span className="text-sm font-medium text-white">#{contract.contract_number}</span>
                        {contract.project_name && <span className="text-xs text-violet-400/80 ml-2">{contract.project_name}</span>}
                      </div>
                    </div>
                    <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full", statusText)} style={{ background: statusBg, border: `1px solid ${statusBorder}` }}>
                      {contract.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="px-3 pb-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Client', name: contract.client_name, email: contract.client_email },
                        { label: 'Contractor', name: contract.contractor_name, email: contract.contractor_email },
                      ].map(party => (
                        <div key={party.label} className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p className="text-[9px] text-violet-400/70 font-mono uppercase">{party.label}</p>
                          <p className="text-xs font-medium text-white truncate">{party.name || <span className="italic text-slate-500">Not set</span>}</p>
                          {party.email && <p className="text-[9px] text-slate-500 truncate">{party.email}</p>}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {canViewFinancials && (
                        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p className="text-[9px] text-violet-400/70 font-mono uppercase">Total</p>
                          <p className="text-xs font-semibold text-emerald-400">{contract.total_amount ? `$${contract.total_amount.toLocaleString()}` : '—'}</p>
                        </div>
                      )}
                      <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-[9px] text-violet-400/70 font-mono uppercase">Start</p>
                        <p className="text-xs font-medium text-slate-300">{contract.start_date ? format(parseISO(String(contract.start_date)), 'MMM dd') : '—'}</p>
                      </div>
                      <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-[9px] text-violet-400/70 font-mono uppercase">End</p>
                        <p className="text-xs font-medium text-slate-300">{contract.estimated_end_date ? format(parseISO(String(contract.estimated_end_date)), 'MMM dd') : '—'}</p>
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="rounded-lg p-2.5" style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.1)' }}>
                      <p className="text-[9px] text-violet-400/70 font-mono uppercase mb-1.5">Signatures</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: 'Contractor', signed: !!contract.contractor_signature },
                          { label: 'Client', signed: !!contract.client_signature },
                        ].map(sig => (
                          <div key={sig.label} className="flex items-center gap-1.5">
                            {sig.signed ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Circle className="h-3 w-3 text-slate-600" />}
                            <span className={cn("text-[10px]", sig.signed ? "text-emerald-400" : "text-slate-500")}>
                              {sig.label} {sig.signed ? '✓' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                      {contract.client_signed_at && <p className="text-[9px] text-emerald-400/70 mt-1 font-mono">Client signed: {format(new Date(contract.client_signed_at), 'MMM dd, yyyy HH:mm')}</p>}
                      {contract.sent_to_client_at && !contract.client_signed_at && (
                        <p className="text-[9px] text-sky-400/70 mt-1 font-mono">
                          Sent: {format(new Date(contract.sent_to_client_at), 'MMM dd, yyyy HH:mm')}
                          {contract.client_viewed_at && ` · Viewed: ${format(new Date(contract.client_viewed_at), 'MMM dd HH:mm')}`}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 gap-1 border-violet-500/20 text-violet-300 hover:bg-violet-500/8 flex-1 rounded-lg" onClick={() => { if (contract.share_token) window.open(`/contract/sign?token=${contract.share_token}`, '_blank'); }}>
                        <Eye className="h-3 w-3" /> Preview
                      </Button>
                      {!isSigned && canEdit && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 gap-1 border-sky-500/20 text-sky-300 hover:bg-sky-500/8 flex-1 rounded-lg" onClick={(e) => { e.stopPropagation(); setSelectedContractForEmail({ id: contract.id, contract_number: contract.contract_number, total_amount: contract.total_amount, status: contract.status, share_token: contract.share_token }); setContractRecipients([{ email: '', name: '' }]); setShowContractEmailDialog(true); }}>
                          <Send className="h-3 w-3" /> {isSent ? 'Resend' : 'Send'}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 gap-1 border-slate-700 text-slate-400 hover:bg-white/4 flex-1 rounded-lg" onClick={(e) => { e.stopPropagation(); if (contract.share_token) window.open(`/contract/sign?token=${contract.share_token}&download=true`, '_blank'); }}>
                        <Download className="h-3 w-3" /> PDF
                      </Button>
                      {canEdit && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 gap-1 border-red-500/20 text-red-400 hover:bg-red-500/8 rounded-lg" onClick={(e) => { e.stopPropagation(); setContractToDelete({ id: contract.id, contract_number: contract.contract_number, status: contract.status }); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3 text-center py-4">
            <FileCheck className="h-7 w-7 text-slate-600/60 mx-auto" />
            <p className="text-xs text-slate-500">No contracts yet</p>
            {(userRole === 'owner' || userRole === 'foreman') && (
              <Button
                size="sm"
                onClick={openContractCreator}
                className="gap-2 text-xs font-medium h-8 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 2px 8px rgba(139,92,246,0.15)' }}
              >
                <FileCheck className="h-3.5 w-3.5" /> Create Contract
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ─── Bottom Action Bar ─── */}
      <div className="flex items-center gap-2 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Button
          size="sm" variant="outline"
          className="h-9 px-3 border-slate-700/60 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg"
          onClick={() => {}}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        {(userRole === 'owner' || userRole === 'foreman') && (
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 gap-2 h-9 text-sm font-medium rounded-lg"
            style={{ background: 'linear-gradient(135deg, #ff9500, #ffaa33)', color: '#0f172a', boxShadow: '0 3px 12px rgba(255,149,0,0.2)' }}
          >
            <Plus className="h-3.5 w-3.5" /> Upload
          </Button>
        )}
      </div>
    </div>
  );
});

Panel6Documents.displayName = 'Panel6Documents';
