// ============================================
// STAGE 8: Panel 6 Documents — Fullscreen View
// ============================================
// Rich document vault with categorized files and contracts
// Extracted from Stage8FinalReview.tsx renderFullscreenContent
// ============================================

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText, FolderOpen, Upload, FileCheck, Plus, Eye, Download, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignedImage } from "./SignedMedia";
import { DOCUMENT_CATEGORIES } from "./constants";
import type { DocumentWithCategory, DocumentCategory } from "./types";
import { Citation } from "@/types/citation";
import { toast } from "sonner";

const FS_CAT_COLORS = [
  { border: 'border-cyan-200 dark:border-cyan-700/30', bg: 'bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/20', text: 'text-cyan-700 dark:text-cyan-300', icon: 'bg-cyan-100 dark:bg-cyan-900/50', iconText: 'text-cyan-600 dark:text-cyan-400', badge: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' },
  { border: 'border-violet-200 dark:border-violet-700/30', bg: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20', text: 'text-violet-700 dark:text-violet-300', icon: 'bg-violet-100 dark:bg-violet-900/50', iconText: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' },
  { border: 'border-emerald-200 dark:border-emerald-700/30', bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20', text: 'text-emerald-700 dark:text-emerald-300', icon: 'bg-emerald-100 dark:bg-emerald-900/50', iconText: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  { border: 'border-amber-200 dark:border-amber-700/30', bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20', text: 'text-amber-700 dark:text-amber-300', icon: 'bg-amber-100 dark:bg-amber-900/50', iconText: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
];

interface Panel6FullscreenProps {
  documents: DocumentWithCategory[];
  contracts: any[];
  userRole: string;
  canEdit: boolean;
  canViewFinancials: boolean;
  panelCitations: Citation[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  getCitationsForPanel: (keys: string[]) => Citation[];
  handleDownloadDocument: (path: string, name: string) => void;
  setPreviewDocument: (doc: any) => void;
  setContractStep: (step: 'select_member' | 'preview') => void;
  setSelectedContractMember: (m: any) => void;
  setSelectedContractType: (t: string | null) => void;
  setShowContractPreview: (v: boolean) => void;
  setSelectedContractForEmail: (c: any) => void;
  setContractRecipients: (r: { email: string; name: string }[]) => void;
  setShowContractEmailDialog: (v: boolean) => void;
  renderCitationValue: (c: Citation) => React.ReactNode;
}

export function Panel6Fullscreen({
  documents,
  contracts,
  userRole,
  canEdit,
  canViewFinancials,
  panelCitations,
  fileInputRef,
  getCitationsForPanel,
  handleDownloadDocument,
  setPreviewDocument,
  setContractStep,
  setSelectedContractMember,
  setSelectedContractType,
  setShowContractPreview,
  setSelectedContractForEmail,
  setContractRecipients,
  setShowContractEmailDialog,
  renderCitationValue,
}: Panel6FullscreenProps) {
  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between p-3 rounded-xl border-2 border-sky-300 dark:border-sky-700 bg-gradient-to-r from-sky-50 via-blue-50 to-cyan-50 dark:from-sky-950/30 dark:via-blue-950/30 dark:to-cyan-950/30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
            <FolderOpen className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          </div>
          <h4 className="text-sm font-bold text-sky-700 dark:text-sky-300">Document Vault</h4>
        </div>
        {(userRole === 'owner' || userRole === 'foreman') && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
        )}
      </div>

      {/* ─── Summary ─── */}
      <p className="text-[10px] text-sky-500 dark:text-sky-400 font-mono px-1">{documents.length} files · {contracts.length} contracts</p>

      {/* ─── Documents Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DOCUMENT_CATEGORIES.map((cat, catIdx) => {
          const categoryDocs = documents.filter(d => d.category === cat.key);
          const fsColors = FS_CAT_COLORS[catIdx % FS_CAT_COLORS.length];
          const fsPanelCitations = getCitationsForPanel(['BLUEPRINT_UPLOAD', 'SITE_PHOTO', 'VISUAL_VERIFICATION']);
          
          return (
            <div key={cat.key} className={cn(
              "rounded-xl border-2 p-4 transition-all",
              categoryDocs.length > 0 ? `${fsColors.border} ${fsColors.bg}` : "border-dashed border-gray-200 dark:border-gray-700/30 bg-gray-50/30 dark:bg-gray-900/20"
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", categoryDocs.length > 0 ? fsColors.icon : "bg-gray-100 dark:bg-gray-800")}>
                    <cat.icon className={cn("h-4 w-4", categoryDocs.length > 0 ? fsColors.iconText : "text-gray-400")} />
                  </div>
                  <div>
                    <h5 className={cn("text-sm font-semibold", categoryDocs.length > 0 ? fsColors.text : "text-gray-400")}>{cat.label}</h5>
                    <p className="text-[10px] text-gray-400">{categoryDocs.length} {categoryDocs.length === 1 ? 'file' : 'files'}</p>
                  </div>
                </div>
                {categoryDocs.filter(d => d.citationId).length > 0 && (
                  <Badge variant="outline" className={cn("text-[10px]", fsColors.badge)}>
                    {categoryDocs.filter(d => d.citationId).length} cited
                  </Badge>
                )}
              </div>
              
              {categoryDocs.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-gray-400 italic">No documents</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categoryDocs.map(doc => {
                    const isImage = doc.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    const isPdf = doc.file_name.match(/\.pdf$/i);
                    const matchingCit = fsPanelCitations.find(c => {
                      const fn = c.metadata?.file_name || c.answer;
                      return fn && doc.file_name.toLowerCase().includes(String(fn).toLowerCase().slice(0, 10));
                    });
                    
                    return (
                      <div 
                        key={doc.id} 
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-white/80 dark:bg-white/5 border border-transparent hover:border-indigo-200/50 dark:hover:border-indigo-700/30 transition-all group cursor-pointer hover:shadow-sm"
                        onClick={() => setPreviewDocument({
                          file_name: doc.file_name,
                          file_path: doc.file_path,
                          category: doc.category,
                          citationId: doc.citationId || matchingCit?.id,
                          uploaded_by_name: doc.uploaded_by_name,
                          uploaded_by_role: doc.uploaded_by_role,
                          uploadedAt: doc.uploadedAt,
                        })}
                      >
                        <div className="h-12 w-12 rounded-lg flex-shrink-0 overflow-hidden border bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                          {isImage ? (
                            <SignedImage 
                              filePath={doc.file_path}
                              alt={doc.file_name}
                              className="h-full w-full object-cover"
                            />
                          ) : isPdf ? (
                            <FileText className="h-5 w-5 text-red-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{doc.file_name}</p>
                          <div className="flex items-center gap-2">
                            {doc.uploadedAt && <span className="text-[10px] text-gray-400">{doc.uploadedAt}</span>}
                            {matchingCit && <span className="text-[10px] text-indigo-500 dark:text-indigo-400">{matchingCit.cite_type.replace(/_/g, ' ')}</span>}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setPreviewDocument({ file_name: doc.file_name, file_path: doc.file_path, category: doc.category, citationId: doc.citationId || matchingCit?.id, uploaded_by_name: doc.uploaded_by_name, uploaded_by_role: doc.uploaded_by_role, uploadedAt: doc.uploadedAt }); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDownloadDocument(doc.file_path, doc.file_name); }}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        {(doc.citationId || matchingCit) && (
                          <Badge variant="outline" className="text-[9px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex-shrink-0 px-1.5">
                            [{(doc.citationId || matchingCit?.id || '').slice(0, 6)}]
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* ─── Contracts Section ─── */}
      <div className="pt-4 border-t-2 border-indigo-200 dark:border-indigo-700/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <h4 className="text-sm font-bold text-violet-700 dark:text-violet-300">Contracts</h4>
            <Badge variant="outline" className="text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">{contracts.length}</Badge>
          </div>
          {(userRole === 'owner' || userRole === 'foreman') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setContractStep('select_member'); setSelectedContractMember(null); setSelectedContractType(null); setShowContractPreview(true); }}
              className="gap-2 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
            >
              <Plus className="h-3.5 w-3.5" />
              New Contract
            </Button>
          )}
        </div>
        
        {contracts.length === 0 ? (
          <div className="p-8 rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-700/30 text-center bg-violet-50/30 dark:bg-violet-950/10">
            <FileCheck className="h-10 w-10 text-violet-300 dark:text-violet-600 mx-auto mb-3" />
            <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">No contracts yet</p>
            <p className="text-xs text-violet-400 dark:text-violet-500 mt-1 mb-4">Select a template to create your first contract</p>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setContractStep('select_member'); setSelectedContractMember(null); setSelectedContractType(null); setShowContractPreview(true); }}
                className="gap-2 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Contract for Team Member
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contracts.map(contract => {
              const statusColorFs = contract.status === 'signed' 
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                : contract.status === 'sent'
                ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700';
              return (
                <div 
                  key={contract.id} 
                  className="group p-4 rounded-xl border-2 border-violet-200 dark:border-violet-700/30 bg-gradient-to-br from-violet-50/80 to-purple-50/60 dark:from-violet-950/20 dark:to-purple-950/15 cursor-pointer hover:border-violet-400 hover:shadow-md transition-all"
                  onClick={() => {
                    if (contract.share_token) {
                      window.open(`/contract/sign?token=${contract.share_token}`, '_blank');
                    } else {
                      toast.info('Contract preview not available');
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                      <span className="font-semibold text-gray-800 dark:text-gray-200">#{contract.contract_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); if (contract.share_token) window.open(`/contract/sign?token=${contract.share_token}`, '_blank'); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {contract.status !== 'signed' && canEdit && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContractForEmail({ id: contract.id, contract_number: contract.contract_number, total_amount: contract.total_amount, status: contract.status, share_token: contract.share_token });
                          setContractRecipients([{ email: '', name: '' }]);
                          setShowContractEmailDialog(true);
                        }}>
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Badge variant="outline" className={cn("text-[10px] border", statusColorFs)}>
                        {contract.status}
                      </Badge>
                    </div>
                  </div>
                  {canViewFinancials && contract.total_amount && (
                    <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">
                      ${contract.total_amount.toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view contract</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* ─── Citations ─── */}
      {panelCitations.length > 0 && (
        <div className="pt-3 border-t border-indigo-200 dark:border-indigo-700/30 space-y-1.5">
          <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Data Sources</p>
          {panelCitations.map(c => (
            <div key={c.id} className="flex items-center justify-between p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-700/30 text-xs">
              <span className="text-indigo-600 dark:text-indigo-400">{c.cite_type.replace(/_/g, ' ')}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-indigo-800 dark:text-indigo-300">{renderCitationValue(c)}</span>
                <span className="text-[9px] text-indigo-500 dark:text-indigo-500/60 font-mono">cite:[{c.id.slice(0, 6)}]</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
