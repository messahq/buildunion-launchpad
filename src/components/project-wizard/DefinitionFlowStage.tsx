// ============================================
// DEFINITION FLOW STAGE - Stage 3 & 4 of Project Wizard
// ============================================
// Stage 3: Trade Selection → Template Review → Lock Template
// Stage 4: Execution Flow (Solo/Team → Site Condition → Start Date → Final Lock)
// LEFT PANEL: Chat with AI questions and selection buttons (INPUT)
// RIGHT PANEL: Template cards and visualizations (OUTPUT)
// ============================================

import { useState, useCallback, useEffect, forwardRef, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hammer,
  PaintBucket,
  Layers,
  Settings,
  User,
  Users,
  UsersRound,
  Building2,
  CheckCircle2,
  Trash2,
  Plus,
  Edit2,
  Calendar,
  MapPin,
  Sparkles,
  Lock,
  Loader2,
  ChevronRight,
  FileText,
  Upload,
  Image,
  FileImage,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Citation, CITATION_TYPES, createCitation } from "@/types/citation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CitationBadge, InlineCiteBadge } from "./CitationBadge";

interface TemplateItem {
  id: string;
  name: string;
  category: 'material' | 'labor';
  baseQuantity: number; // Original quantity without waste
  quantity: number; // Quantity with waste applied
  unit: string;
  unitPrice: number;
  totalPrice: number;
  applyWaste?: boolean; // Whether waste % applies to this item
}

interface DefinitionFlowStageProps {
  projectId: string;
  userId: string;
  gfaValue: number;
  existingCitations?: Citation[];
  onFlowComplete: (citations: Citation[]) => void;
  onCitationClick?: (citationId: string) => void;
  className?: string;
}

// Trade options for Step 1
const TRADE_OPTIONS = [
  { key: 'flooring', label: 'Flooring', icon: Layers },
  { key: 'painting', label: 'Painting', icon: PaintBucket },
  { key: 'drywall', label: 'Drywall', icon: Building2 },
  { key: 'custom', label: 'Custom', icon: Settings },
];

// Team size options for Step 2
const TEAM_SIZE_OPTIONS = [
  { key: 'solo', label: 'Solo', description: 'User/Client only', icon: User },
  { key: 'team', label: 'Team', description: 'Multiple workers', icon: Users },
];

// Team role options
const TEAM_ROLES = [
  { key: 'foreman', label: 'Foreman' },
  { key: 'instructor', label: 'Instructor' },
  { key: 'worker', label: 'Worker' },
  { key: 'apprentice', label: 'Apprentice' },
  { key: 'helper', label: 'Helper' },
];

// Team member interface
interface TeamMember {
  id: string;
  role: string;
  count: number;
}

// Generate template items based on trade and GFA (base quantities without waste)
function generateTemplateItems(trade: string, gfaSqft: number): TemplateItem[] {
  const templates: Record<string, TemplateItem[]> = {
    flooring: [
      { id: '1', name: 'Hardwood Flooring', category: 'material', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 8.50, totalPrice: gfaSqft * 8.50, applyWaste: true },
      { id: '2', name: 'Underlayment', category: 'material', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 0.75, totalPrice: gfaSqft * 0.75, applyWaste: true },
      { id: '3', name: 'Transition Strips', category: 'material', baseQuantity: Math.ceil(gfaSqft / 200), quantity: Math.ceil(gfaSqft / 200), unit: 'pcs', unitPrice: 25, totalPrice: Math.ceil(gfaSqft / 200) * 25, applyWaste: false },
      { id: '4', name: 'Installation Labor', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 4.50, totalPrice: gfaSqft * 4.50, applyWaste: false },
      { id: '5', name: 'Baseboards', category: 'material', baseQuantity: Math.round(4 * Math.sqrt(gfaSqft) * 0.85), quantity: Math.round(4 * Math.sqrt(gfaSqft) * 0.85), unit: 'ln ft', unitPrice: 3.25, totalPrice: Math.round(4 * Math.sqrt(gfaSqft) * 0.85) * 3.25, applyWaste: true },
    ],
    painting: [
      { id: '1', name: 'Interior Paint (Premium)', category: 'material', baseQuantity: Math.ceil(gfaSqft / 350), quantity: Math.ceil(gfaSqft / 350), unit: 'gal', unitPrice: 45, totalPrice: Math.ceil(gfaSqft / 350) * 45, applyWaste: true },
      { id: '2', name: 'Primer', category: 'material', baseQuantity: Math.ceil(gfaSqft / 400), quantity: Math.ceil(gfaSqft / 400), unit: 'gal', unitPrice: 35, totalPrice: Math.ceil(gfaSqft / 400) * 35, applyWaste: true },
      { id: '3', name: 'Supplies (Brushes, Rollers, Tape)', category: 'material', baseQuantity: 1, quantity: 1, unit: 'kit', unitPrice: 85, totalPrice: 85, applyWaste: false },
      { id: '4', name: 'Surface Prep Labor', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 0.75, totalPrice: gfaSqft * 0.75, applyWaste: false },
      { id: '5', name: 'Painting Labor', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 2.50, totalPrice: gfaSqft * 2.50, applyWaste: false },
    ],
    drywall: [
      { id: '1', name: 'Drywall Sheets (4x8)', category: 'material', baseQuantity: Math.ceil(gfaSqft / 32), quantity: Math.ceil(gfaSqft / 32), unit: 'sheets', unitPrice: 18, totalPrice: Math.ceil(gfaSqft / 32) * 18, applyWaste: true },
      { id: '2', name: 'Joint Compound', category: 'material', baseQuantity: Math.ceil(gfaSqft / 500), quantity: Math.ceil(gfaSqft / 500), unit: 'buckets', unitPrice: 22, totalPrice: Math.ceil(gfaSqft / 500) * 22, applyWaste: true },
      { id: '3', name: 'Drywall Tape', category: 'material', baseQuantity: Math.ceil(gfaSqft / 100), quantity: Math.ceil(gfaSqft / 100), unit: 'rolls', unitPrice: 8, totalPrice: Math.ceil(gfaSqft / 100) * 8, applyWaste: true },
      { id: '4', name: 'Installation Labor', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 2.25, totalPrice: gfaSqft * 2.25, applyWaste: false },
      { id: '5', name: 'Finishing Labor (Tape & Mud)', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 1.75, totalPrice: gfaSqft * 1.75, applyWaste: false },
    ],
    custom: [
      { id: '1', name: 'Custom Material', category: 'material', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 5, totalPrice: gfaSqft * 5, applyWaste: true },
      { id: '2', name: 'Custom Labor', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 3, totalPrice: gfaSqft * 3, applyWaste: false },
    ],
  };
  
  return templates[trade] || templates.custom;
}

// Apply waste percentage to template items
function applyWasteToItems(items: TemplateItem[], wastePercent: number): TemplateItem[] {
  const wasteFactor = 1 + (wastePercent / 100);
  return items.map(item => {
    if (item.applyWaste && item.category === 'material') {
      const newQuantity = Math.ceil(item.baseQuantity * wasteFactor);
      return {
        ...item,
        quantity: newQuantity,
        totalPrice: newQuantity * item.unitPrice,
      };
    }
    return item;
  });
}

// ============================================
// LEFT PANEL - Chat Interface (INPUT)
// ============================================
interface UploadedFile {
  id: string;
  name: string;
  type: 'blueprint' | 'site_photo';
  file: File;
  previewUrl?: string;
  uploadProgress?: number;
  uploaded?: boolean;
  storageUrl?: string;
}

interface ChatPanelProps {
  currentSubStep: number;
  gfaValue: number;
  selectedTrade: string | null;
  templateLocked: boolean;
  teamSize: string | null;
  teamMembers: TeamMember[];
  siteCondition: 'clear' | 'demolition';
  timeline: 'asap' | 'scheduled';
  scheduledDate: Date | undefined;
  scheduledEndDate: Date | undefined;
  demolitionCost: number;
  demolitionUnitPrice: number;
  // Stage 5: Visual Intelligence
  stage5Active: boolean;
  uploadedFiles: UploadedFile[];
  isUploading: boolean;
  // Citation references for clickable badges
  tradeCitationId?: string;
  teamCitationId?: string;
  siteCitationId?: string;
  timelineCitationId?: string;
  onCitationClick?: (citationId: string) => void;
  onTradeSelect: (trade: string) => void;
  onLockTemplate: () => void;
  onTeamSizeSelect: (size: string) => void;
  onTeamMembersChange: (members: TeamMember[]) => void;
  onSiteConditionChange: (condition: 'clear' | 'demolition') => void;
  onTimelineChange: (timeline: 'asap' | 'scheduled') => void;
  onScheduledDateChange: (date: Date | undefined) => void;
  onScheduledEndDateChange: (date: Date | undefined) => void;
  onFilesDrop: (files: File[]) => void;
  onRemoveFile: (fileId: string) => void;
  onSkipUpload: () => void;
  onConfirmUploads: () => void;
  isSaving: boolean;
}

const ChatPanel = ({
  currentSubStep,
  gfaValue,
  selectedTrade,
  templateLocked,
  teamSize,
  teamMembers,
  siteCondition,
  timeline,
  scheduledDate,
  scheduledEndDate,
  demolitionCost,
  demolitionUnitPrice,
  stage5Active,
  uploadedFiles,
  isUploading,
  tradeCitationId,
  teamCitationId,
  siteCitationId,
  timelineCitationId,
  onCitationClick,
  onTradeSelect,
  onLockTemplate,
  onTeamSizeSelect,
  onTeamMembersChange,
  onSiteConditionChange,
  onTimelineChange,
  onScheduledDateChange,
  onScheduledEndDateChange,
  onFilesDrop,
  onRemoveFile,
  onSkipUpload,
  onConfirmUploads,
  isSaving,
}: ChatPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Determine stage and step labels
  const isStage4 = templateLocked && !stage5Active;
  const isStage5 = stage5Active;
  const stage4Step = currentSubStep - 1; // 0 = Team, 1 = Site, 2 = Date
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(f => 
      f.type === 'application/pdf' || 
      f.type === 'image/jpeg' || 
      f.type === 'image/png' ||
      f.type === 'image/jpg'
    );
    if (validFiles.length > 0) {
      onFilesDrop(validFiles);
    } else {
      toast.error("Only PDF, JPG, and PNG files are supported");
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFilesDrop(files);
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50/50 via-background to-slate-100/30 dark:from-slate-950/30 dark:via-background dark:to-slate-900/20">
      {/* Chat Header */}
      <div className={cn(
        "p-4 border-b shrink-0",
        isStage5 
          ? "border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-950/30 dark:to-indigo-950/30"
          : isStage4 
            ? "border-green-200/50 dark:border-green-800/30 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/30 dark:to-emerald-950/30"
            : "border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center shadow-lg",
            isStage5
              ? "bg-gradient-to-br from-purple-500 to-indigo-500 shadow-purple-500/25"
              : isStage4 
                ? "bg-gradient-to-br from-green-500 to-emerald-500 shadow-green-500/25"
                : "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25"
          )}>
            {isStage5 ? <Image className="h-5 w-5 text-white" /> : <Hammer className="h-5 w-5 text-white" />}
          </div>
          <div>
            <h2 className={cn(
              "font-semibold",
              isStage5 ? "text-purple-700 dark:text-purple-300" : isStage4 ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"
            )}>
              {isStage5 ? "Visual Intelligence" : isStage4 ? "Execution Flow" : "Definition Flow"}
            </h2>
            <p className={cn(
              "text-xs",
              isStage5 ? "text-purple-600/70 dark:text-purple-400/70" : isStage4 ? "text-green-600/70 dark:text-green-400/70" : "text-amber-600/70 dark:text-amber-400/70"
            )}>
              {isStage5 
                ? "Documentation • Stage 5"
                : isStage4 
                  ? `Step ${stage4Step + 1} of 3 • Stage 4`
                  : `Template Setup • ${gfaValue.toLocaleString()} sq ft`
              }
            </p>
          </div>
        </div>
        
        {/* Progress dots */}
        <div className="flex gap-2 mt-3">
          {isStage5 ? (
            <motion.div
              className="h-2 w-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          ) : isStage4 ? (
            // Stage 4: 3 steps (Team, Site, Date)
            [0, 1, 2].map(step => (
              <motion.div
                key={step}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  step === stage4Step
                    ? "w-8 bg-gradient-to-r from-green-500 to-emerald-500"
                    : step < stage4Step
                      ? "w-2 bg-green-500"
                      : "w-2 bg-green-200 dark:bg-green-800"
                )}
                animate={step === stage4Step ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: step === stage4Step ? Infinity : 0, duration: 1.5 }}
              />
            ))
          ) : (
            // Stage 3: Just template setup
            <motion.div
              className="h-2 w-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          )}
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 md:pb-4">
        {/* STAGE 3: Trade Selection & Template Lock */}
        <AnimatePresence mode="wait">
          {currentSubStep >= 0 && (
            <>
              {/* AI Question - Trade */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-semibold">MESSA AI</span>
                  </div>
                  <p className="text-sm text-foreground">
                    Selected: <strong>{gfaValue.toLocaleString()} sq ft Interior</strong>. 
                    <br />What trade are we performing?
                  </p>
                  
                  {/* Trade selection buttons */}
                  {!selectedTrade && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {TRADE_OPTIONS.map(trade => (
                        <Button
                          key={trade.key}
                          variant="outline"
                          size="sm"
                          onClick={() => onTradeSelect(trade.key)}
                          className="border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:border-amber-500 text-foreground gap-1.5"
                        >
                          <trade.icon className="h-4 w-4 text-amber-500" />
                          {trade.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
              
              {/* User Answer - Trade */}
              {selectedTrade && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
                    <p className="font-medium">{TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label}</p>
                    {tradeCitationId && (
                      <button
                        onClick={() => onCitationClick?.(tradeCitationId)}
                        className="inline-flex items-center gap-1 mt-1 text-xs text-white/80 hover:text-white transition-colors cursor-pointer"
                      >
                        <FileText className="h-3 w-3" />
                        <span className="font-mono">cite: [{tradeCitationId.slice(0, 8)}]</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
              
              {/* Template Lock prompt (before Stage 4) */}
              {selectedTrade && !templateLocked && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-semibold">Template Ready</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Your {TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label} template is ready. 
                      Review materials & pricing on the right, then lock it to proceed.
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      👉 Click "Lock Template & Continue" on the card to proceed to Stage 4.
                    </p>
                  </div>
                </motion.div>
              )}
              
              {/* Template Locked confirmation */}
              {templateLocked && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <p className="font-medium">Template Locked</p>
                    </div>
                    <p className="text-xs text-white/80 mt-1">Materials & pricing confirmed</p>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
        
        {/* STAGE 4 STEP 1: Execution Mode (Solo/Team) */}
         {currentSubStep >= 1 && templateLocked && (
           <>
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="flex justify-start"
             >
               <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-green-200 dark:border-green-800 shadow-sm">
                 <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                   <Sparkles className="h-4 w-4" />
                   <span className="text-xs font-semibold">MESSA AI • Stage 4</span>
                 </div>
                 <p className="text-sm text-foreground mb-3">
                   <strong>Who is handling the installation?</strong>
                 </p>
                 
                  {/* Solo/Team buttons */}
                  {currentSubStep === 1 && !teamSize && (
                    <div className="grid grid-cols-2 gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onTeamSizeSelect('solo')}
                        className="p-3 rounded-xl border-2 border-green-200 dark:border-green-800 bg-card hover:border-green-400 dark:hover:border-green-600 transition-all flex flex-col items-center gap-1 text-center"
                      >
                        <User className="h-6 w-6 text-green-500" />
                        <span className="text-sm font-medium">Solo</span>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onTeamSizeSelect('team')}
                        className="p-3 rounded-xl border-2 border-green-200 dark:border-green-800 bg-card hover:border-green-400 dark:hover:border-green-600 transition-all flex flex-col items-center gap-1 text-center"
                      >
                        <Users className="h-6 w-6 text-green-500" />
                        <span className="text-sm font-medium">Team</span>
                      </motion.button>
                    </div>
                  )}
                  
                  {/* Team configuration - show when Team is selected */}
                  {teamSize === 'team' && currentSubStep === 1 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 space-y-3"
                    >
                      <p className="text-xs text-muted-foreground">Configure your team:</p>
                      
                      {teamMembers.map((member, index) => (
                        <div key={member.id} className="flex items-center gap-2 bg-green-50/50 dark:bg-green-950/20 p-2 rounded-lg">
                          <select
                            value={member.role}
                            onChange={(e) => {
                              const updated = [...teamMembers];
                              updated[index] = { ...member, role: e.target.value };
                              onTeamMembersChange(updated);
                            }}
                            className="flex-1 h-8 text-sm rounded-md border border-input bg-background px-2"
                          >
                            {TEAM_ROLES.map(role => (
                              <option key={role.key} value={role.key}>{role.label}</option>
                            ))}
                          </select>
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            value={member.count || ''}
                            onChange={(e) => {
                              const updated = [...teamMembers];
                              updated[index] = { ...member, count: parseInt(e.target.value) || 0 };
                              onTeamMembersChange(updated);
                            }}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="w-16 h-8 text-center text-sm"
                          />
                          <span className="text-xs text-muted-foreground">ppl</span>
                          {teamMembers.length > 1 && (
                            <button
                              onClick={() => {
                                const updated = teamMembers.filter((_, i) => i !== index);
                                onTeamMembersChange(updated);
                              }}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      <button
                        onClick={() => {
                          const newMember: TeamMember = {
                            id: `member_${Date.now()}`,
                            role: 'worker',
                            count: 1,
                          };
                          onTeamMembersChange([...teamMembers, newMember]);
                        }}
                        className="w-full p-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 flex items-center justify-center gap-1 rounded-lg border border-dashed border-green-300 dark:border-green-700"
                      >
                        <Plus className="h-4 w-4" />
                        Add Role
                      </button>
                      
                      {/* Confirm team button */}
                      {teamMembers.some(m => m.count > 0) && (
                        <Button
                          onClick={() => onTeamSizeSelect('team_confirmed')}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                          size="sm"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Confirm Team ({teamMembers.reduce((sum, m) => sum + m.count, 0)} people)
                        </Button>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
              
              {/* User Answer - Installation Handler */}
              {teamSize && (teamSize === 'solo' || teamSize === 'team_confirmed') && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25">
                    <p className="font-medium">
                      {teamSize === 'solo' 
                        ? 'Solo Installation' 
                        : `Team: ${teamMembers.reduce((sum, m) => sum + m.count, 0)} people`
                      }
                    </p>
                    {teamSize === 'team_confirmed' && (
                      <p className="text-xs text-white/80 mt-1">
                        {teamMembers.filter(m => m.count > 0).map(m => 
                          `${m.count} ${TEAM_ROLES.find(r => r.key === m.role)?.label}`
                        ).join(', ')}
                      </p>
                    )}
                    {teamCitationId && (
                      <button
                        onClick={() => onCitationClick?.(teamCitationId)}
                        className="inline-flex items-center gap-1 mt-1 text-xs text-white/80 hover:text-white transition-colors cursor-pointer"
                      >
                        <FileText className="h-3 w-3" />
                        <span className="font-mono">cite: [{teamCitationId.slice(0, 8)}]</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </>
          )}
        
        {/* STAGE 4 STEP 2: Site Condition */}
        {currentSubStep >= 2 && templateLocked && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-green-200 dark:border-green-800 shadow-sm">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold">MESSA AI</span>
                </div>
                <p className="text-sm text-foreground mb-3">
                  <strong>What's the site condition?</strong>
                </p>
                
                {/* Site Condition buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSiteConditionChange('clear')}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-left",
                      siteCondition === 'clear'
                        ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                        : "border-green-200 dark:border-green-800 hover:border-green-400"
                    )}
                  >
                    <p className="font-medium text-sm">Clear Site</p>
                    <p className="text-xs text-muted-foreground">Ready to work</p>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSiteConditionChange('demolition')}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-left",
                      siteCondition === 'demolition'
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                        : "border-green-200 dark:border-green-800 hover:border-orange-400"
                    )}
                  >
                    <p className="font-medium text-sm">Demolition Needed</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">+${demolitionCost.toLocaleString()} (${demolitionUnitPrice.toFixed(2)}/sq ft)</p>
                  </motion.button>
                </div>
              </div>
            </motion.div>
            
            {/* Show site condition answer if selected and we're past this step */}
            {siteCondition && currentSubStep >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end"
              >
                <div className={cn(
                  "max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-white shadow-lg",
                  siteCondition === 'demolition'
                    ? "bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-500/25"
                    : "bg-gradient-to-br from-green-500 to-emerald-500 shadow-green-500/25"
                )}>
                  <p className="font-medium">{siteCondition === 'clear' ? 'Clear Site' : 'Demolition Needed'}</p>
                  {siteCondition === 'demolition' && (
                    <p className="text-xs text-white/80">+${demolitionCost.toLocaleString()} added</p>
                  )}
                  {siteCitationId && (
                    <button
                      onClick={() => onCitationClick?.(siteCitationId)}
                      className="inline-flex items-center gap-1 mt-1 text-xs text-white/80 hover:text-white transition-colors cursor-pointer"
                    >
                      <FileText className="h-3 w-3" />
                      <span className="font-mono">cite: [{siteCitationId.slice(0, 8)}]</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}
        
        {/* STAGE 4 STEP 3: Timeline (Start Date & End Date) */}
        {currentSubStep >= 3 && templateLocked && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-green-200 dark:border-green-800 shadow-sm">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold">MESSA AI</span>
                </div>
                <p className="text-sm text-foreground mb-3">
                  <strong>When do you want to start?</strong>
                </p>
                
                {/* Timeline buttons */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onTimelineChange('asap')}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-left",
                      timeline === 'asap'
                        ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                        : "border-green-200 dark:border-green-800 hover:border-green-400"
                    )}
                  >
                    <p className="font-medium text-sm">ASAP</p>
                    <p className="text-xs text-muted-foreground">Start immediately</p>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onTimelineChange('scheduled')}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-left",
                      timeline === 'scheduled'
                        ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                        : "border-green-200 dark:border-green-800 hover:border-green-400"
                    )}
                  >
                    <p className="font-medium text-sm">Scheduled</p>
                    <p className="text-xs text-muted-foreground">Pick a date</p>
                  </motion.button>
                </div>
                
                {/* Start Date Picker */}
                {timeline === 'scheduled' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-3"
                  >
                    <Label className="text-xs text-muted-foreground mb-1 block">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick start date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={scheduledDate}
                          onSelect={onScheduledDateChange}
                          initialFocus
                          disabled={(date) => date < new Date()}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </motion.div>
                )}
                
                {/* End Date Picker - Always visible after timeline selection */}
                {(timeline === 'asap' || (timeline === 'scheduled' && scheduledDate)) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-3"
                  >
                    <Label className="text-xs text-muted-foreground mb-1 block">Estimated End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {scheduledEndDate ? format(scheduledEndDate, 'PPP') : 'Pick end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={scheduledEndDate}
                          onSelect={onScheduledEndDateChange}
                          initialFocus
                          disabled={(date) => {
                            const minDate = timeline === 'asap' ? new Date() : (scheduledDate || new Date());
                            return date < minDate;
                          }}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </motion.div>
                )}
                
                {/* Show completion status - Stage 4 complete message (no finalize button yet) */}
                {scheduledEndDate && !stage5Active && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Execution details complete!</span>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Continue to the next stage...
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
        
        {/* STAGE 5: Visual Intelligence - Documentation Upload */}
        {stage5Active && (
          <>
            {/* Stage 4 Confirmed Message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end"
            >
              <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="font-medium">Dates Confirmed</p>
                </div>
                <p className="text-xs text-white/80 mt-1">
                  {timeline === 'asap' ? 'Starting ASAP' : scheduledDate ? format(scheduledDate, 'PPP') : ''} 
                  {scheduledEndDate && ` → ${format(scheduledEndDate, 'PPP')}`}
                </p>
              </div>
            </motion.div>
            
            {/* AI Question - Documentation with GFA Context */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex justify-start"
            >
              <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 shadow-sm">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold">MESSA AI • Stage 5</span>
                </div>
                <p className="text-sm text-foreground mb-2">
                  I see the DNA is locked at <strong>{gfaValue.toLocaleString()} sq ft</strong>. 
                </p>
                <p className="text-sm text-foreground mb-3">
                  Please upload the blueprint or site photos here to <strong>verify these dimensions</strong>.
                </p>
                
                {/* Reference to Canvas */}
                <p className="text-xs text-purple-600 dark:text-purple-400 italic">
                  👉 Use the Visual Upload Center on the right to upload your documents.
                </p>
                
                {/* DNA Summary in Chat */}
                <div className="mt-4 p-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">
                    Locked Project DNA:
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GFA:</span>
                      <span className="font-mono text-purple-700 dark:text-purple-300">{gfaValue.toLocaleString()} sq ft</span>
                    </div>
                    {siteCondition === 'demolition' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Demolition:</span>
                        <span className="font-mono text-orange-600">+${demolitionCost.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* File Upload Status in Chat */}
            {uploadedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end"
              >
                <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/25">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <p className="font-medium">{uploadedFiles.length} file(s) ready</p>
                  </div>
                  <p className="text-xs text-white/80 mt-1">
                    {uploadedFiles.filter(f => f.type === 'blueprint').length} blueprint(s), {uploadedFiles.filter(f => f.type === 'site_photo').length} photo(s)
                  </p>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ============================================
// STAGE 5 - Visual Upload Center Canvas
// ============================================
interface VisualUploadCanvasPanelProps {
  gfaValue: number;
  selectedTrade: string | null;
  grandTotal: number;
  uploadedFiles: UploadedFile[];
  isUploading: boolean;
  flowCitations: Citation[];
  onFilesDrop: (files: File[]) => void;
  onRemoveFile: (fileId: string) => void;
  onSkipUpload: () => void;
  onConfirmUploads: () => void;
}

const VisualUploadCanvasPanel = ({
  gfaValue,
  selectedTrade,
  grandTotal,
  uploadedFiles,
  isUploading,
  flowCitations,
  onFilesDrop,
  onRemoveFile,
  onSkipUpload,
  onConfirmUploads,
}: VisualUploadCanvasPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(f => 
      f.type === 'application/pdf' || 
      f.type === 'image/jpeg' || 
      f.type === 'image/png' ||
      f.type === 'image/jpg'
    );
    if (validFiles.length > 0) {
      onFilesDrop(validFiles);
    } else {
      toast.error("Only PDF, JPG, and PNG files are supported");
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFilesDrop(files);
    }
  };
  
  // Filter relevant citations to display
  const relevantCitationTypes: string[] = [
    CITATION_TYPES.GFA_LOCK, 
    CITATION_TYPES.TRADE_SELECTION, 
    CITATION_TYPES.TEMPLATE_LOCK, 
    CITATION_TYPES.TEAM_SIZE, 
    CITATION_TYPES.EXECUTION_MODE
  ];
  const relevantCitations = flowCitations.filter(c => 
    relevantCitationTypes.includes(c.cite_type)
  );
  
  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-purple-50/50 via-background to-indigo-50/50 dark:from-purple-950/20 dark:via-background dark:to-indigo-950/20 overflow-hidden">
      {/* Canvas Header */}
      <div className="px-4 py-3 border-b border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 dark:from-purple-950/50 dark:to-indigo-950/50 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
              <Image className="h-4 w-4" />
              <span className="font-semibold uppercase tracking-wider">VISUAL UPLOAD CENTER</span>
            </div>
            <h2 className="text-lg font-bold bg-gradient-to-r from-purple-700 to-indigo-600 dark:from-purple-300 dark:to-indigo-300 bg-clip-text text-transparent">
              Blueprint & Site Documentation
            </h2>
          </div>
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-0">
            Stage 5
          </Badge>
        </div>
      </div>
      
      {/* Canvas Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* DNA Citations Summary - Operational Truth */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl border-2 border-purple-200 dark:border-purple-800 shadow-lg overflow-hidden"
        >
          <div className="px-4 py-3 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-950/50 dark:to-indigo-950/50 border-b border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-sm text-purple-700 dark:text-purple-300">Project DNA Locked</span>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {/* GFA Citation */}
            <div className="flex items-center justify-between py-2 px-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Gross Floor Area</span>
              </div>
              <Badge variant="outline" className="font-mono text-purple-600 dark:text-purple-400 border-purple-300">
                cite_gfa_lock
              </Badge>
              <span className="font-semibold text-purple-700 dark:text-purple-300">{gfaValue.toLocaleString()} sq ft</span>
            </div>
            
            {/* Trade Citation */}
            {selectedTrade && (
              <div className="flex items-center justify-between py-2 px-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Hammer className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Trade</span>
                </div>
                <Badge variant="outline" className="font-mono text-purple-600 dark:text-purple-400 border-purple-300">
                  cite_trade
                </Badge>
                <span className="font-semibold text-purple-700 dark:text-purple-300">
                  {TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label}
                </span>
              </div>
            )}
            
            {/* Template/Budget Citation */}
            {grandTotal > 0 && (
              <div className="flex items-center justify-between py-2 px-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Template Total</span>
                </div>
                <Badge variant="outline" className="font-mono text-purple-600 dark:text-purple-400 border-purple-300">
                  cite_template
                </Badge>
                <span className="font-semibold text-purple-700 dark:text-purple-300">${grandTotal.toLocaleString()}</span>
              </div>
            )}
            
            {/* Show other citations from flow */}
            {relevantCitations.filter(c => c.cite_type === CITATION_TYPES.TEAM_SIZE).map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Execution Mode</span>
                </div>
                <Badge variant="outline" className="font-mono text-purple-600 dark:text-purple-400 border-purple-300">
                  cite_execution
                </Badge>
                <span className="font-semibold text-purple-700 dark:text-purple-300">{c.answer}</span>
              </div>
            ))}
          </div>
        </motion.div>
        
        {/* Main Upload Zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "min-h-[280px] rounded-2xl border-3 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-8",
              isDragOver
                ? "border-purple-500 bg-purple-100/50 dark:bg-purple-900/30 scale-[1.02]"
                : "border-purple-300 dark:border-purple-700 bg-white/50 dark:bg-slate-800/50 hover:border-purple-400 hover:bg-purple-50/50"
            )}
          >
            {uploadedFiles.length === 0 ? (
              <>
                <motion.div
                  animate={{ 
                    y: [0, -8, 0],
                    scale: isDragOver ? 1.1 : 1 
                  }}
                  transition={{ 
                    y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    scale: { duration: 0.2 }
                  }}
                  className="mb-6"
                >
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-xl shadow-purple-500/25">
                    <Upload className="h-10 w-10 text-white" />
                  </div>
                </motion.div>
                
                <h3 className="text-xl font-bold text-purple-700 dark:text-purple-300 mb-2">
                  Drop Your Documents Here
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                  Upload blueprints (PDF) or site photos (JPG/PNG) to verify the {gfaValue.toLocaleString()} sq ft area
                </p>
                
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <FileText className="h-4 w-4 text-purple-500" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">PDF</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <FileImage className="h-4 w-4 text-purple-500" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">JPG / PNG</span>
                  </div>
                </div>
              </>
            ) : (
              /* Uploaded Files Grid */
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-purple-700 dark:text-purple-300">
                    Uploaded Documents ({uploadedFiles.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add More
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {uploadedFiles.map(file => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Preview */}
                      {file.previewUrl ? (
                        <div className="h-14 w-14 rounded-lg overflow-hidden bg-purple-100 dark:bg-purple-900/30 shrink-0">
                          <img src={file.previewUrl} alt={file.name} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                          <FileText className="h-6 w-6 text-purple-500" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">
                            {file.type === 'blueprint' ? 'Blueprint' : 'Site Photo'}
                          </Badge>
                          {file.uploaded && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Ready
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFile(file.id);
                        }}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-3"
        >
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onSkipUpload}
              disabled={isUploading}
              className="flex-1 border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400"
            >
              Skip for now
            </Button>
            {uploadedFiles.length > 0 && (
              <Button
                onClick={onConfirmUploads}
                disabled={isUploading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze & Continue
                  </>
                )}
              </Button>
            )}
          </div>
          
          {/* Ready for Execution Button - Always visible as primary CTA */}
          <Button
            onClick={onConfirmUploads}
            disabled={isUploading}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/25 py-6 text-base"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Ready for Execution
              </>
            )}
          </Button>
        </motion.div>
        
        {/* AI Analysis Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl border border-purple-200 dark:border-purple-800"
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Blueprint Analysis</p>
            <p className="text-xs text-muted-foreground mt-1">
              When you upload blueprints, our AI will automatically extract dimensions, room layouts, and verify the total area matches your locked GFA of {gfaValue.toLocaleString()} sq ft.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ============================================
// CUMULATIVE SUMMARY BAR - Shows all previous answers
// ============================================
interface CumulativeSummaryBarProps {
  existingCitations: Citation[];
  gfaValue: number;
  selectedTrade: string | null;
  templateLocked: boolean;
  teamSize: string | null;
  teamMembers: TeamMember[];
  siteCondition: 'clear' | 'demolition';
  timeline: 'asap' | 'scheduled';
  scheduledDate: Date | undefined;
  scheduledEndDate: Date | undefined;
  grandTotal: number;
  onCitationClick?: (citationId: string) => void;
}

const CumulativeSummaryBar = ({
  existingCitations,
  gfaValue,
  selectedTrade,
  templateLocked,
  teamSize,
  teamMembers,
  siteCondition,
  timeline,
  scheduledDate,
  scheduledEndDate,
  grandTotal,
  onCitationClick,
}: CumulativeSummaryBarProps) => {
  // Build cumulative entries from existing citations + current stage answers
  const summaryEntries: { label: string; value: string; icon: typeof Sparkles; citationId?: string; color: string }[] = [];

  // Stage 1 citations
  const nameCitation = existingCitations.find(c => c.cite_type === CITATION_TYPES.PROJECT_NAME);
  if (nameCitation) {
    summaryEntries.push({ label: 'Project', value: nameCitation.answer, icon: Building2, citationId: nameCitation.id, color: 'text-amber-600 dark:text-amber-400' });
  }

  const locationCitation = existingCitations.find(c => c.cite_type === CITATION_TYPES.LOCATION);
  if (locationCitation) {
    summaryEntries.push({ label: 'Location', value: locationCitation.answer, icon: MapPin, citationId: locationCitation.id, color: 'text-amber-600 dark:text-amber-400' });
  }

  const workTypeCitation = existingCitations.find(c => c.cite_type === CITATION_TYPES.WORK_TYPE);
  if (workTypeCitation) {
    summaryEntries.push({ label: 'Work Type', value: workTypeCitation.answer, icon: Building2, citationId: workTypeCitation.id, color: 'text-amber-600 dark:text-amber-400' });
  }

  // Stage 2 - GFA
  const gfaCitation = existingCitations.find(c => c.cite_type === CITATION_TYPES.GFA_LOCK);
  if (gfaCitation || gfaValue > 0) {
    summaryEntries.push({ label: 'GFA', value: `${gfaValue.toLocaleString()} sq ft`, icon: Layers, citationId: gfaCitation?.id, color: 'text-blue-600 dark:text-blue-400' });
  }

  // Stage 3 - Trade (from current flow)
  if (selectedTrade) {
    summaryEntries.push({ label: 'Trade', value: TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label || selectedTrade, icon: Hammer, color: 'text-orange-600 dark:text-orange-400' });
  }

  // Template locked
  if (templateLocked) {
    summaryEntries.push({ label: 'Template', value: `$${grandTotal.toLocaleString()}`, icon: Lock, color: 'text-green-600 dark:text-green-400' });
  }

  // Stage 4 - Team
  if (teamSize === 'solo') {
    summaryEntries.push({ label: 'Team', value: 'Solo', icon: User, color: 'text-green-600 dark:text-green-400' });
  } else if (teamSize === 'team_confirmed') {
    const total = teamMembers.reduce((sum, m) => sum + m.count, 0);
    summaryEntries.push({ label: 'Team', value: `${total} people`, icon: Users, color: 'text-green-600 dark:text-green-400' });
  }

  // Site condition
  if (templateLocked && (siteCondition === 'clear' || siteCondition === 'demolition')) {
    summaryEntries.push({ label: 'Site', value: siteCondition === 'clear' ? 'Clear' : 'Demolition', icon: Settings, color: siteCondition === 'demolition' ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400' });
  }

  // Timeline
  if (timeline === 'asap' && templateLocked) {
    summaryEntries.push({ label: 'Start', value: 'ASAP', icon: Calendar, color: 'text-green-600 dark:text-green-400' });
  } else if (timeline === 'scheduled' && scheduledDate) {
    summaryEntries.push({ label: 'Start', value: format(scheduledDate, 'MMM d'), icon: Calendar, color: 'text-green-600 dark:text-green-400' });
  }
  if (scheduledEndDate) {
    summaryEntries.push({ label: 'End', value: format(scheduledEndDate, 'MMM d'), icon: Calendar, color: 'text-green-600 dark:text-green-400' });
  }

  if (summaryEntries.length === 0) return null;

  return (
    <div className="shrink-0 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/60 via-white/60 to-orange-50/60 dark:from-amber-950/30 dark:via-background/60 dark:to-orange-950/30 backdrop-blur-sm">
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Project Summary</span>
          <span className="text-xs text-muted-foreground">({summaryEntries.length} facts)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {summaryEntries.map((entry, idx) => (
            <motion.button
              key={`${entry.label}-${idx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => entry.citationId && onCitationClick?.(entry.citationId)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all",
                "bg-white/80 dark:bg-slate-800/80 border-amber-200/60 dark:border-amber-800/40",
                "hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-sm",
                entry.citationId && "cursor-pointer"
              )}
            >
              <entry.icon className={cn("h-3 w-3", entry.color)} />
              <span className="text-muted-foreground font-medium">{entry.label}:</span>
              <span className="font-semibold text-foreground truncate max-w-[120px]">{entry.value}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// RIGHT PANEL - Canvas (OUTPUT)
// ============================================
interface CanvasPanelProps {
  currentSubStep: number;
  selectedTrade: string | null;
  templateLocked: boolean;
  teamSize: string | null;
  siteCondition: 'clear' | 'demolition';
  gfaValue: number;
  templateItems: TemplateItem[];
  materialTotal: number;
  laborTotal: number;
  demolitionCost: number;
  demolitionUnitPrice: number;
  subtotal: number;
  markupPercent: number;
  markupAmount: number;
  taxAmount: number;
  grandTotal: number;
  editingItem: string | null;
  wastePercent: number;
  onWastePercentChange: (value: number) => void;
  onMarkupPercentChange: (value: number) => void;
  onDemolitionUnitPriceChange: (value: number) => void;
  onUpdateItem: (itemId: string, field: keyof TemplateItem, value: number | string) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: () => void;
  onSetEditingItem: (id: string | null) => void;
  onLockTemplate: () => void;
  isSaving: boolean;
}

const CanvasPanel = ({
  currentSubStep,
  selectedTrade,
  templateLocked,
  teamSize,
  siteCondition,
  gfaValue,
  templateItems,
  materialTotal,
  laborTotal,
  demolitionCost,
  demolitionUnitPrice,
  subtotal,
  markupPercent,
  markupAmount,
  taxAmount,
  grandTotal,
  editingItem,
  wastePercent,
  onWastePercentChange,
  onMarkupPercentChange,
  onDemolitionUnitPriceChange,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onSetEditingItem,
  onLockTemplate,
  isSaving,
}: CanvasPanelProps) => {
  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/20 overflow-hidden">
      {/* Canvas Header - Compact */}
      <div className="px-4 py-3 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-950/50 dark:to-orange-950/50 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <Building2 className="h-4 w-4" />
            <span className="font-semibold uppercase tracking-wider">TEMPLATE EDITOR</span>
          </div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-amber-700 to-orange-600 dark:from-amber-300 dark:to-orange-300 bg-clip-text text-transparent">
            {selectedTrade ? `${TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label} - ${gfaValue.toLocaleString()} sq ft` : 'Awaiting Selection...'}
          </h2>
        </div>
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-0">
          Waste: {wastePercent}%
        </Badge>
      </div>
      
      {/* Canvas Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Template Card - Full Width */}
        <motion.div
          key="template"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full space-y-3"
        >
          {/* Template Card */}
          <div className="w-full bg-card border-2 border-amber-300 dark:border-amber-700 rounded-xl shadow-lg overflow-hidden">
            {/* Template Header - Compact */}
            <div className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                {TRADE_OPTIONS.find(t => t.key === selectedTrade)?.icon && (
                  (() => {
                    const Icon = TRADE_OPTIONS.find(t => t.key === selectedTrade)?.icon;
                    return Icon ? <Icon className="h-5 w-5" /> : null;
                  })()
                )}
                <span className="font-semibold">
                  {TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label} Materials & Labor
                </span>
              </div>
              <Badge className="bg-white/20 text-white border-0">
                {gfaValue.toLocaleString()} sq ft
              </Badge>
            </div>
                
            {/* Items List */}
            <div className="divide-y divide-amber-100 dark:divide-amber-900">
              {templateItems.map(item => (
                <div
                  key={item.id}
                  className="p-3 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 group"
                >
                  {editingItem === item.id ? (
                    /* Editing Mode */
                    <div className="space-y-2">
                      <Input
                        value={item.name}
                        onChange={(e) => onUpdateItem(item.id, 'name', e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Qty</Label>
                          <Input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => onUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice || ''}
                            onChange={(e) => onUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            placeholder="0.00"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            size="sm"
                            onClick={() => onSetEditingItem(null)}
                            className="w-full h-8"
                          >
                            Done
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            item.category === 'material'
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          )}>
                            {item.category === 'material' ? 'MAT' : 'LAB'}
                          </span>
                          <span className="text-sm font-medium truncate">{item.name}</span>
                          {item.applyWaste && item.category === 'material' && (
                            <span className="text-xs text-orange-500">+{wastePercent}%</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.quantity} {item.unit} × ${item.unitPrice.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          ${item.totalPrice.toLocaleString()}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          <button
                            onClick={() => onSetEditingItem(item.id)}
                            className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-amber-600" />
                          </button>
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Add Item Button */}
            <button
              onClick={onAddItem}
              className="w-full p-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center justify-center gap-1 border-t border-amber-200 dark:border-amber-800"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
            
            {/* Waste % Adjustment */}
            <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-t border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Waste Factor
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={wastePercent}
                    onChange={(e) => onWastePercentChange(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                    onFocus={(e) => {
                      if (wastePercent === 0) {
                        e.target.value = '';
                      } else {
                        e.target.select();
                      }
                    }}
                    className="w-16 h-8 text-center text-sm font-semibold"
                  />
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">%</span>
                </div>
              </div>
            </div>
            
            {/* Totals */}
            <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border-t border-amber-200 dark:border-amber-800 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Materials (incl. {wastePercent}% waste)</span>
                <span>${materialTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Labor</span>
                <span>${laborTotal.toLocaleString()}</span>
              </div>
              {siteCondition === 'demolition' && (
                <div className="flex items-center justify-between text-sm text-orange-600 dark:text-orange-400">
                  <span>Demolition ({gfaValue.toLocaleString()} sq ft)</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      step={0.25}
                      value={demolitionUnitPrice}
                      onChange={(e) => onDemolitionUnitPriceChange(Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)))}
                      onFocus={(e) => {
                        if (demolitionUnitPrice === 0) {
                          e.target.value = '';
                        } else {
                          e.target.select();
                        }
                      }}
                      className="w-16 h-7 text-center text-sm"
                    />
                    <span className="text-xs text-muted-foreground">/sq ft</span>
                    <span className="text-sm ml-2 min-w-[70px] text-right font-medium">
                      +${demolitionCost.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex justify-between text-sm pt-1.5 border-t border-amber-200/50 dark:border-amber-700/50">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              
              {/* Markup/Profit Field */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Markup/Profit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={markupPercent}
                    onChange={(e) => onMarkupPercentChange(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                    onFocus={(e) => {
                      if (markupPercent === 0) {
                        e.target.value = '';
                      } else {
                        e.target.select();
                      }
                    }}
                    className="w-14 h-7 text-center text-sm"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <span className="text-sm ml-2 min-w-[70px] text-right">
                    {markupAmount > 0 ? `+$${markupAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '$0'}
                  </span>
                </div>
              </div>
              
              {/* Tax (13% HST) */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (13% HST)</span>
                <span>${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              {/* Grand Total */}
              <div className="flex justify-between font-bold text-lg pt-2 border-t-2 border-amber-300 dark:border-amber-600">
                <span>Grand Total</span>
                <span className="text-amber-600 dark:text-amber-400">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            
            {/* Lock Template Button - Only show if not yet locked */}
            {!templateLocked && (
              <div className="px-4 py-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-t border-amber-200 dark:border-amber-800">
                <Button
                  onClick={onLockTemplate}
                  disabled={isSaving}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 text-base shadow-lg"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Locking...
                    </>
                  ) : (
                    <>
                      <Lock className="h-5 w-5 mr-2" />
                      Lock Template & Continue
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Template Locked indicator */}
            {templateLocked && (
              <div className="px-4 py-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/50 dark:to-emerald-950/50 border-t border-green-300 dark:border-green-800">
                <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                  <Lock className="h-4 w-4" />
                  <span className="font-semibold text-sm">Template Locked</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Additional info cards - Inline */}
          <div className="flex flex-wrap gap-2">
            {teamSize && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0 py-1.5 px-3">
                Team: {TEAM_SIZE_OPTIONS.find(t => t.key === teamSize)?.label}
              </Badge>
            )}
            {currentSubStep >= 2 && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0 py-1.5 px-3">
                Site: {siteCondition === 'clear' ? 'Clear' : 'Demolition'}
              </Badge>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const DefinitionFlowStage = forwardRef<HTMLDivElement, DefinitionFlowStageProps>(
  ({ projectId, userId, gfaValue, existingCitations = [], onFlowComplete, onCitationClick, className }, ref) => {
    // Flow step state
    const [currentSubStep, setCurrentSubStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    
    // Step 1: Trade selection
    const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
    
    // Template lock state (Stage 3 → Stage 4 transition)
    const [templateLocked, setTemplateLocked] = useState(false);
    
    // Template items (editable)
    const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
    const [editingItem, setEditingItem] = useState<string | null>(null);
    
    // Waste percentage (editable)
    const [wastePercent, setWastePercent] = useState(10);
    
    // Markup percentage (editable)
    const [markupPercent, setMarkupPercent] = useState(0);
    
    // Stage 4 Step 1: Team size and members
    const [teamSize, setTeamSize] = useState<string | null>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
      { id: 'member_1', role: 'foreman', count: 1 },
      { id: 'member_2', role: 'worker', count: 2 },
    ]);
    
    // Stage 4 Step 2: Site condition
    const [siteCondition, setSiteCondition] = useState<'clear' | 'demolition'>('clear');
    const [demolitionUnitPrice, setDemolitionUnitPrice] = useState(2.5); // Editable $/sq ft
    
    // Stage 4 Step 3: Timeline
    const [timeline, setTimeline] = useState<'asap' | 'scheduled'>('asap');
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
    const [scheduledEndDate, setScheduledEndDate] = useState<Date | undefined>(undefined);
    
    // Stage 5: Visual Intelligence
    const [stage5Active, setStage5Active] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    
    // Collected citations
    const [flowCitations, setFlowCitations] = useState<Citation[]>([]);
    
    // Generate template when trade is selected
    useEffect(() => {
      if (selectedTrade) {
        const baseItems = generateTemplateItems(selectedTrade, gfaValue);
        const itemsWithWaste = applyWasteToItems(baseItems, wastePercent);
        setTemplateItems(itemsWithWaste);
      }
    }, [selectedTrade, gfaValue]);
    
    // Recalculate when waste percent changes
    const handleWastePercentChange = useCallback((newWastePercent: number) => {
      setWastePercent(newWastePercent);
      setTemplateItems(prev => applyWasteToItems(prev, newWastePercent));
    }, []);
    
    // Handle markup percent changes
    const handleMarkupPercentChange = useCallback((newMarkupPercent: number) => {
      setMarkupPercent(newMarkupPercent);
    }, []);
    
    // Calculate totals
    const materialTotal = templateItems.filter(i => i.category === 'material').reduce((sum, i) => sum + i.totalPrice, 0);
    const laborTotal = templateItems.filter(i => i.category === 'labor').reduce((sum, i) => sum + i.totalPrice, 0);
    const demolitionCost = siteCondition === 'demolition' ? gfaValue * demolitionUnitPrice : 0;
    const subtotal = materialTotal + laborTotal + demolitionCost;
    const markupAmount = subtotal * (markupPercent / 100);
    const subtotalWithMarkup = subtotal + markupAmount;
    const taxRate = 0.13; // 13% HST for Ontario
    const taxAmount = subtotalWithMarkup * taxRate;
    const grandTotal = subtotalWithMarkup + taxAmount;
    
    // Handle demolition unit price change
    const handleDemolitionUnitPriceChange = useCallback((newPrice: number) => {
      setDemolitionUnitPrice(newPrice);
    }, []);
    
    // Handle trade selection - IMMEDIATELY SAVE TO DB!
    const handleTradeSelect = async (trade: string) => {
      setSelectedTrade(trade);
      
      // ✓ CRITICAL: Save TRADE_SELECTION citation IMMEDIATELY on selection
      const tradeCitation = createCitation({
        cite_type: CITATION_TYPES.TRADE_SELECTION,
        question_key: 'trade_selection',
        answer: TRADE_OPTIONS.find(t => t.key === trade)?.label || trade,
        value: trade,
        metadata: { trade_key: trade },
      });
      
      try {
        const { data: currentData } = await supabase
          .from("project_summaries")
          .select("id, verified_facts")
          .eq("project_id", projectId)
          .maybeSingle();
        
        const currentFacts = Array.isArray(currentData?.verified_facts) ? currentData.verified_facts : [];
        // Remove any existing TRADE_SELECTION to avoid duplicates
        const filteredFacts = currentFacts.filter((f: any) => f.cite_type !== 'TRADE_SELECTION');
        const updatedFacts = [...filteredFacts, tradeCitation as unknown as Record<string, unknown>];
        
        if (currentData?.id) {
          await supabase
            .from("project_summaries")
            .update({
              verified_facts: updatedFacts as unknown as null,
              updated_at: new Date().toISOString(),
            })
            .eq("project_id", projectId);
        } else {
          await supabase
            .from("project_summaries")
            .insert({
              project_id: projectId,
              user_id: userId,
              verified_facts: updatedFacts as unknown as null,
            });
        }
        
        // Also update projects.trade immediately
        await supabase
          .from("projects")
          .update({ 
            trade: trade,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId);
        
        console.log("[DefinitionFlow] TRADE_SELECTION saved immediately:", trade);
      } catch (err) {
        console.error("[DefinitionFlow] Failed to save trade selection:", err);
      }
    };
    
    // Template item editing
    const handleUpdateItem = (itemId: string, field: keyof TemplateItem, value: number | string) => {
      setTemplateItems(prev => prev.map(item => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updated.totalPrice = Number(updated.quantity) * Number(updated.unitPrice);
          }
          return updated;
        }
        return item;
      }));
    };
    
    const handleDeleteItem = (itemId: string) => {
      setTemplateItems(prev => prev.filter(item => item.id !== itemId));
    };
    
    const handleAddItem = () => {
      const newItem: TemplateItem = {
        id: `new_${Date.now()}`,
        name: 'New Item',
        category: 'material',
        baseQuantity: 1,
        quantity: 1,
        unit: 'pcs',
        unitPrice: 0,
        totalPrice: 0,
        applyWaste: true,
      };
      setTemplateItems(prev => [...prev, newItem]);
      setEditingItem(newItem.id);
    };
    
    // Lock template and proceed to Stage 4 (from the card button)
    // ✓ CRITICAL: Also save trade citation to DB immediately!
    const handleLockTemplate = async () => {
      if (templateItems.length === 0) {
        toast.error("Add at least one item to the template");
        return;
      }
      
      const tradeCitation = createCitation({
        cite_type: CITATION_TYPES.TRADE_SELECTION,
        question_key: 'trade_selection',
        answer: TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label || selectedTrade || '',
        value: selectedTrade || '',
        metadata: { trade_key: selectedTrade },
      });
      
      const templateCitation = createCitation({
        cite_type: CITATION_TYPES.TEMPLATE_LOCK,
        question_key: 'template_items',
        answer: `${templateItems.length} items totaling $${grandTotal.toLocaleString()}`,
        value: grandTotal,
        metadata: {
          items: templateItems,
          material_total: materialTotal,
          labor_total: laborTotal,
          markup_percent: markupPercent,
          waste_percent: wastePercent, // ✓ CRITICAL: Store waste factor for Stage 8 display
        },
      });
      
      // ✓ IMMEDIATE DB SAVE: Don't wait until DNA Finalize - save now!
      try {
        const { data: currentData } = await supabase
          .from("project_summaries")
          .select("id, verified_facts")
          .eq("project_id", projectId)
          .maybeSingle();
        
        const currentFacts = Array.isArray(currentData?.verified_facts) ? currentData.verified_facts : [];
        const updatedFacts = [...currentFacts, tradeCitation as unknown as Record<string, unknown>, templateCitation as unknown as Record<string, unknown>];
        
        if (currentData?.id) {
          await supabase
            .from("project_summaries")
            .update({
              verified_facts: updatedFacts as unknown as null,
              total_cost: grandTotal,
              material_cost: materialTotal,
              labor_cost: laborTotal,
              updated_at: new Date().toISOString(),
            })
            .eq("project_id", projectId);
        } else {
          await supabase
            .from("project_summaries")
            .insert({
              project_id: projectId,
              user_id: userId,
              verified_facts: updatedFacts as unknown as null,
              total_cost: grandTotal,
              material_cost: materialTotal,
              labor_cost: laborTotal,
            });
        }
        
        // ✓ Also update projects table with trade
        await supabase
          .from("projects")
          .update({ 
            trade: selectedTrade || '',
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId);
        
        console.log("[DefinitionFlow] Trade & Template saved to DB immediately:", selectedTrade);
      } catch (err) {
        console.error("[DefinitionFlow] Failed to save trade immediately:", err);
        // Continue anyway - will try again at DNA Finalize
      }
      
      setFlowCitations([tradeCitation, templateCitation]);
      setTemplateLocked(true);
      setCurrentSubStep(1); // Move to Stage 4 Step 1 (Team Size)
      toast.success("Template locked! Now let's plan the execution.");
    };
    
    // Stage 4 Step 1: Team size selection
    const handleTeamSizeSelect = (size: string) => {
      // 'team' is just selection, 'team_confirmed' means user finalized team config
      // 'solo' moves to next step immediately
      if (size === 'team') {
        setTeamSize(size);
        // Don't advance yet - wait for team configuration
        return;
      }
      
      setTeamSize(size);
      
      const teamCitation = createCitation({
        cite_type: CITATION_TYPES.TEAM_SIZE,
        question_key: 'team_size',
        answer: size === 'solo' 
          ? 'Solo Installation' 
          : `Team: ${teamMembers.reduce((sum, m) => sum + m.count, 0)} people`,
        value: size,
        metadata: { 
          team_size_key: size,
          team_members: size === 'team_confirmed' ? teamMembers : undefined,
        },
      });
      
      // ✓ Also create EXECUTION_MODE citation (Solo/Team)
      const execModeCitation = createCitation({
        cite_type: CITATION_TYPES.EXECUTION_MODE,
        question_key: 'execution_mode',
        answer: size === 'solo' ? 'Solo' : 'Team',
        value: size === 'solo' ? 'solo' : 'team',
        metadata: {
          mode: size === 'solo' ? 'solo' : 'team',
          team_count: size === 'team_confirmed' ? teamMembers.reduce((sum, m) => sum + m.count, 0) : 1,
        },
      });
      
      setFlowCitations(prev => [...prev, teamCitation, execModeCitation]);
      setCurrentSubStep(2); // Move to Stage 4 Step 2 (Site Condition)
    };
    
    // Handle team members change
    const handleTeamMembersChange = useCallback((members: TeamMember[]) => {
      setTeamMembers(members);
    }, []);
    
    // Stage 4 Step 2: Site condition change (triggers live card update)
    const handleSiteConditionChange = (condition: 'clear' | 'demolition') => {
      setSiteCondition(condition);
      // If user picks demolition and we haven't moved to step 3 yet, auto-advance
      if (currentSubStep === 2) {
        setCurrentSubStep(3); // Move to Stage 4 Step 3 (Timeline)
      }
    };
    
    // Auto-transition to Stage 5 when Stage 4 is complete (end date selected)
    useEffect(() => {
      if (scheduledEndDate && templateLocked && !stage5Active && currentSubStep >= 3) {
        // Small delay before transitioning to Stage 5
        const timer = setTimeout(() => {
          setStage5Active(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }, [scheduledEndDate, templateLocked, stage5Active, currentSubStep]);
    
    // Stage 5: File upload handlers
    const handleFilesDrop = useCallback((files: File[]) => {
      const newFiles: UploadedFile[] = files.map(file => ({
        id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        type: file.type === 'application/pdf' ? 'blueprint' : 'site_photo',
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        uploaded: false,
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }, []);
    
    const handleRemoveFile = useCallback((fileId: string) => {
      setUploadedFiles(prev => {
        const file = prev.find(f => f.id === fileId);
        if (file?.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
        return prev.filter(f => f.id !== fileId);
      });
    }, []);
    
    const handleSkipUpload = useCallback(async () => {
      // Create a citation indicating skip
      const skipCitation = createCitation({
        cite_type: CITATION_TYPES.VISUAL_VERIFICATION,
        question_key: 'visual_verification',
        answer: 'Skipped - No documentation uploaded',
        value: 'skipped',
        metadata: {
          skipped: true,
          skipped_at: new Date().toISOString(),
        },
      });
      
      setFlowCitations(prev => [...prev, skipCitation]);
      
      // Proceed to finalize
      await handleFinalLock();
    }, []);
    
    const handleConfirmUploads = useCallback(async () => {
      if (uploadedFiles.length === 0) return;
      
      setIsUploading(true);
      
      try {
        const uploadedCitations: Citation[] = [];
        
        for (const file of uploadedFiles) {
          // Upload to Supabase storage
          const filePath = `${projectId}/${file.id}_${file.name}`;
          const { data, error } = await supabase.storage
            .from('project-documents')
            .upload(filePath, file.file);
          
          if (error) throw error;
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('project-documents')
            .getPublicUrl(filePath);
          
          // Create citation for each file
          const citationType = file.type === 'blueprint' 
            ? CITATION_TYPES.BLUEPRINT_UPLOAD 
            : CITATION_TYPES.SITE_PHOTO;
          
          const citation = createCitation({
            cite_type: citationType,
            question_key: file.type === 'blueprint' ? 'blueprint_upload' : 'site_photo_upload',
            answer: file.name,
            value: urlData.publicUrl,
            metadata: {
              file_name: file.name,
              file_type: file.type,
              file_path: filePath,
              storage_url: urlData.publicUrl,
              uploaded_at: new Date().toISOString(),
            },
          });
          
          uploadedCitations.push(citation);
          
          // Update file as uploaded
          setUploadedFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, uploaded: true, storageUrl: urlData.publicUrl } : f
          ));
        }
        
        // Add verification citation
        const verificationCitation = createCitation({
          cite_type: CITATION_TYPES.VISUAL_VERIFICATION,
          question_key: 'visual_verification',
          answer: `${uploadedFiles.length} document(s) uploaded`,
          value: {
            total_files: uploadedFiles.length,
            blueprints: uploadedFiles.filter(f => f.type === 'blueprint').length,
            photos: uploadedFiles.filter(f => f.type === 'site_photo').length,
          },
          metadata: {
            verified: true,
            verified_at: new Date().toISOString(),
          },
        });
        
        setFlowCitations(prev => [...prev, ...uploadedCitations, verificationCitation]);
        
        toast.success(`${uploadedFiles.length} file(s) uploaded successfully!`);
        
        // Proceed to finalize
        await handleFinalLock();
        
      } catch (err) {
        console.error('[Stage5] Upload failed:', err);
        toast.error("Upload failed - please try again");
      } finally {
        setIsUploading(false);
      }
    }, [uploadedFiles, projectId]);
    
    // Stage 4 Final: Lock the entire project
    const handleFinalLock = useCallback(async () => {
      setIsSaving(true);
      
      try {
        const siteCitation = createCitation({
          cite_type: CITATION_TYPES.SITE_CONDITION,
          question_key: 'site_condition',
          answer: siteCondition === 'clear' ? 'Clear Site' : 'Demolition Needed',
          value: siteCondition,
          metadata: { 
            demolition_required: siteCondition === 'demolition',
            demolition_cost: demolitionCost,
          },
        });
        
        // Demolition price citation (only if demolition selected)
        const demolitionPriceCitation = siteCondition === 'demolition' ? createCitation({
          cite_type: CITATION_TYPES.DEMOLITION_PRICE,
          question_key: 'demolition_unit_price',
          answer: `$${demolitionUnitPrice.toFixed(2)}/sq ft`,
          value: demolitionUnitPrice,
          metadata: {
            unit_price: demolitionUnitPrice,
            total_cost: demolitionCost,
            gfa: gfaValue,
          },
        }) : null;
        
        const timelineCitation = createCitation({
          cite_type: CITATION_TYPES.TIMELINE,
          question_key: 'timeline',
          answer: timeline === 'asap' ? 'ASAP' : `Scheduled: ${scheduledDate ? format(scheduledDate, 'PPP') : 'TBD'}`,
          value: timeline,
          metadata: {
            start_date: timeline === 'asap' ? new Date().toISOString() : scheduledDate?.toISOString(),
          },
        });
        
        // End date citation
        const endDateCitation = scheduledEndDate ? createCitation({
          cite_type: CITATION_TYPES.END_DATE,
          question_key: 'end_date',
          answer: format(scheduledEndDate, 'PPP'),
          value: scheduledEndDate.toISOString(),
          metadata: {
            end_date: scheduledEndDate.toISOString(),
          },
        }) : null;
        
        const dnaCitation = createCitation({
          cite_type: CITATION_TYPES.DNA_FINALIZED,
          question_key: 'project_dna',
          answer: `Project DNA Locked: ${gfaValue.toLocaleString()} sq ft | $${grandTotal.toLocaleString()}`,
          value: {
            gfa: gfaValue,
            trade: selectedTrade,
            team_size: teamSize,
            site_condition: siteCondition,
            timeline: timeline,
            grand_total: grandTotal,
            start_date: timeline === 'asap' ? new Date().toISOString() : scheduledDate?.toISOString(),
            end_date: scheduledEndDate?.toISOString(),
          },
          metadata: {
            finalized_at: new Date().toISOString(),
            template_items: templateItems,
            material_total: materialTotal,
            labor_total: laborTotal,
            demolition_cost: demolitionCost,
            demolition_unit_price: demolitionUnitPrice,
          },
        });
        
        const allCitations = [
          ...flowCitations, 
          siteCitation, 
          ...(demolitionPriceCitation ? [demolitionPriceCitation] : []),
          timelineCitation,
          ...(endDateCitation ? [endDateCitation] : []),
          dnaCitation
        ];
        
        const { data: currentData } = await supabase
          .from("project_summaries")
          .select("id, verified_facts")
          .eq("project_id", projectId)
          .maybeSingle();
        
        const currentFacts = Array.isArray(currentData?.verified_facts)
          ? currentData.verified_facts
          : [];
        
        const updatedFacts = [...currentFacts, ...allCitations.map(c => c as unknown as Record<string, unknown>)];
        
        let error;
        if (currentData?.id) {
          const result = await supabase
            .from("project_summaries")
            .update({
              verified_facts: updatedFacts as unknown as null,
              total_cost: grandTotal,
              material_cost: materialTotal,
              labor_cost: laborTotal,
              updated_at: new Date().toISOString(),
            })
            .eq("project_id", projectId);
          error = result.error;
        } else {
          const result = await supabase
            .from("project_summaries")
            .insert({
              project_id: projectId,
              user_id: userId,
              verified_facts: updatedFacts as unknown as null,
              total_cost: grandTotal,
              material_cost: materialTotal,
              labor_cost: laborTotal,
            });
          error = result.error;
        }
        
        if (error) throw error;
        
        // ✓ CRITICAL: Also update the projects table with trade information
        const tradeCitation = allCitations.find(c => c.cite_type === CITATION_TYPES.TRADE_SELECTION);
        if (tradeCitation) {
          const { error: tradeError } = await supabase
            .from("projects")
            .update({ 
              trade: tradeCitation.value as string,
              updated_at: new Date().toISOString(),
            })
            .eq("id", projectId);
          
          if (tradeError) {
            console.error("[DefinitionFlow] Failed to update project trade:", tradeError);
          } else {
            console.log("[DefinitionFlow] Project trade updated to:", tradeCitation.value);
          }
        }
        
        toast.success("Project DNA Finalized!");
        onFlowComplete(allCitations);
        
      } catch (err) {
        console.error("[DefinitionFlow] Save failed:", err);
        toast.error("Failed to finalize - please try again");
      } finally {
        setIsSaving(false);
      }
    }, [projectId, userId, flowCitations, siteCondition, timeline, scheduledDate, scheduledEndDate, templateItems, grandTotal, materialTotal, laborTotal, demolitionCost, demolitionUnitPrice, gfaValue, selectedTrade, teamSize, onFlowComplete]);
    
    return (
      <div
        ref={ref}
        className={cn(
          "h-full overflow-hidden",
          // Mobile: vertical stack (template top, chat bottom)
          // Desktop: horizontal split (chat left, template right)
          "flex flex-col md:flex-row",
          className
        )}
      >
        {/* LEFT PANEL (Desktop) / BOTTOM (Mobile) - Chat (INPUT) */}
        <div className={cn(
          // Mobile: at bottom, compact height when template visible
          "order-2 md:order-1",
          "md:w-[380px] lg:w-[420px] md:flex-shrink-0",
          "border-t md:border-t-0 md:border-r border-amber-200/50 dark:border-amber-800/30",
          // Mobile height control
          selectedTrade ? "h-[260px] md:h-full" : "flex-1 md:h-full"
        )}>
          <ChatPanel
            currentSubStep={currentSubStep}
            gfaValue={gfaValue}
            selectedTrade={selectedTrade}
            templateLocked={templateLocked}
            teamSize={teamSize}
            teamMembers={teamMembers}
            siteCondition={siteCondition}
            timeline={timeline}
            scheduledDate={scheduledDate}
            scheduledEndDate={scheduledEndDate}
            demolitionCost={demolitionCost}
            demolitionUnitPrice={demolitionUnitPrice}
            stage5Active={stage5Active}
            uploadedFiles={uploadedFiles}
            isUploading={isUploading}
            tradeCitationId={flowCitations.find(c => c.cite_type === CITATION_TYPES.TRADE_SELECTION)?.id}
            teamCitationId={flowCitations.find(c => c.cite_type === CITATION_TYPES.TEAM_SIZE)?.id}
            siteCitationId={flowCitations.find(c => c.cite_type === CITATION_TYPES.SITE_CONDITION)?.id}
            timelineCitationId={flowCitations.find(c => c.cite_type === CITATION_TYPES.TIMELINE)?.id}
            onCitationClick={onCitationClick}
            onTradeSelect={handleTradeSelect}
            onLockTemplate={handleLockTemplate}
            onTeamSizeSelect={handleTeamSizeSelect}
            onTeamMembersChange={handleTeamMembersChange}
            onSiteConditionChange={handleSiteConditionChange}
            onTimelineChange={setTimeline}
            onScheduledDateChange={setScheduledDate}
            onScheduledEndDateChange={setScheduledEndDate}
            onFilesDrop={handleFilesDrop}
            onRemoveFile={handleRemoveFile}
            onSkipUpload={handleSkipUpload}
            onConfirmUploads={handleConfirmUploads}
            isSaving={isSaving}
          />
        </div>
        
        {/* RIGHT PANEL (Desktop) / TOP (Mobile) - Canvas/Template (OUTPUT) */}
        <div className={cn(
          "order-1 md:order-2",
          "flex-1 min-h-0 flex flex-col",
          stage5Active 
            ? "border-b md:border-b-0 border-purple-200/50 dark:border-purple-800/30"
            : "border-b md:border-b-0 border-amber-200/50 dark:border-amber-800/30"
        )}>
          {/* Cumulative Summary Bar */}
          <CumulativeSummaryBar
            existingCitations={existingCitations}
            gfaValue={gfaValue}
            selectedTrade={selectedTrade}
            templateLocked={templateLocked}
            teamSize={teamSize}
            teamMembers={teamMembers}
            siteCondition={siteCondition}
            timeline={timeline}
            scheduledDate={scheduledDate}
            scheduledEndDate={scheduledEndDate}
            grandTotal={grandTotal}
            onCitationClick={onCitationClick}
          />
          
          {/* Main Canvas Content */}
          <div className="flex-1 min-h-0">
            {stage5Active ? (
              <VisualUploadCanvasPanel
                gfaValue={gfaValue}
                selectedTrade={selectedTrade || ''}
                grandTotal={grandTotal}
                uploadedFiles={uploadedFiles}
                isUploading={isUploading}
                flowCitations={flowCitations}
                onFilesDrop={handleFilesDrop}
                onRemoveFile={handleRemoveFile}
                onSkipUpload={handleSkipUpload}
                onConfirmUploads={handleConfirmUploads}
              />
            ) : selectedTrade ? (
              <CanvasPanel
                currentSubStep={currentSubStep}
                selectedTrade={selectedTrade}
                teamSize={teamSize}
                siteCondition={siteCondition}
                gfaValue={gfaValue}
                templateItems={templateItems}
                materialTotal={materialTotal}
                laborTotal={laborTotal}
                demolitionCost={demolitionCost}
                demolitionUnitPrice={demolitionUnitPrice}
                subtotal={subtotal}
                markupPercent={markupPercent}
                markupAmount={markupAmount}
                taxAmount={taxAmount}
                grandTotal={grandTotal}
                editingItem={editingItem}
                wastePercent={wastePercent}
                onWastePercentChange={handleWastePercentChange}
                onMarkupPercentChange={handleMarkupPercentChange}
                onDemolitionUnitPriceChange={handleDemolitionUnitPriceChange}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                onSetEditingItem={setEditingItem}
                onLockTemplate={handleLockTemplate}
                isSaving={isSaving}
                templateLocked={templateLocked}
              />
            ) : (
              /* Pre-trade selection canvas placeholder */
              <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-amber-50/30 to-orange-50/20 dark:from-amber-950/10 dark:to-orange-950/10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center max-w-md"
                >
                  <div className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/20">
                    <Hammer className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Select Your Trade</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Choose a trade from the chat panel to generate your project template with cost calculations based on <strong>{gfaValue.toLocaleString()} sq ft</strong>
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {TRADE_OPTIONS.map(trade => (
                      <div key={trade.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100/60 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <trade.icon className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{trade.label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

DefinitionFlowStage.displayName = "DefinitionFlowStage";

export default DefinitionFlowStage;
