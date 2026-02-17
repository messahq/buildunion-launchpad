// ============================================
// DEFINITION FLOW STAGE - Stage 3 & 4 of Project Wizard
// ============================================
// Stage 3: Trade Selection → Template Review → Lock Template
// Stage 4: Execution Flow (Solo/Team → Site Condition → Start Date → Final Lock)
// LEFT PANEL: Chat with AI questions and selection buttons (INPUT)
// RIGHT PANEL: CitationDrivenCanvas (cumulative) + Template cards (OUTPUT)
// ============================================

import { useState, useCallback, useEffect, forwardRef, useRef } from "react";
import CitationDrivenCanvas from "./CitationDrivenCanvas";
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
  Zap,
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
  { key: 'concrete', label: 'Concrete', icon: Hammer },
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
    concrete: [
      { id: '1', name: 'Ready-Mix Concrete', category: 'material', baseQuantity: Math.ceil(gfaSqft / 27), quantity: Math.ceil(gfaSqft / 27), unit: 'cu yd', unitPrice: 165, totalPrice: Math.ceil(gfaSqft / 27) * 165, applyWaste: true },
      { id: '2', name: 'Rebar (Grade 60)', category: 'material', baseQuantity: Math.ceil(gfaSqft * 0.5), quantity: Math.ceil(gfaSqft * 0.5), unit: 'lbs', unitPrice: 0.85, totalPrice: Math.ceil(gfaSqft * 0.5) * 0.85, applyWaste: true },
      { id: '3', name: 'Wire Mesh', category: 'material', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 0.45, totalPrice: gfaSqft * 0.45, applyWaste: true },
      { id: '4', name: 'Forming & Pouring Labor', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 3.50, totalPrice: gfaSqft * 3.50, applyWaste: false },
      { id: '5', name: 'Finishing Labor', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 2.00, totalPrice: gfaSqft * 2.00, applyWaste: false },
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
  // AI template generation
  isGeneratingTemplate: boolean;
  aiTemplateReady: boolean;
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
  onDemolitionUnitPriceChange: (value: number) => void;
  onConfirmDemolition: () => void;
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
  isGeneratingTemplate,
  aiTemplateReady,
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
  onDemolitionUnitPriceChange,
  onConfirmDemolition,
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
    <div className="h-full flex flex-col bg-gradient-to-b from-amber-50/50 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/10">
      {/* Chat Header - matches WizardChatInterface exactly */}
      <div className="p-4 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/80 via-white/80 to-orange-50/80 dark:from-amber-950/50 dark:via-background/80 dark:to-orange-950/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
              Project Architect
            </h2>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
              {isStage5 
                ? "Stage 5 • Visual Intelligence"
                : isStage4 
                  ? `Stage 4 • Step ${stage4Step + 1} of 3`
                  : `Stage 3 • ${gfaValue.toLocaleString()} sq ft`
              }
            </p>
          </div>
        </div>
        {/* Progress bar - matches WizardChatInterface */}
        <div className="mt-3 h-1.5 bg-amber-100 dark:bg-amber-950 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
            initial={{ width: 0 }}
            animate={{ 
              width: isStage5 
                ? '100%' 
                : isStage4 
                  ? `${((stage4Step + 1) / 3) * 100}%` 
                  : selectedTrade 
                    ? '50%' 
                    : '10%' 
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
      
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="flex justify-start"
        >
          <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-card border border-amber-200/50 dark:border-amber-800/30 shadow-sm">
            <p className="text-sm leading-relaxed">
              Great progress! Your project area is locked at <strong>{gfaValue.toLocaleString()} sq ft</strong>. Now let's define the scope of work.
            </p>
          </div>
        </motion.div>
        
        {/* STAGE 3: Trade Selection & Template Lock */}
        <AnimatePresence mode="wait">
          {currentSubStep >= 0 && (
            <>
              {/* AI Question - Trade */}
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-card border border-amber-200/50 dark:border-amber-800/30 shadow-sm">
                  <p className="text-sm text-foreground leading-relaxed">
                    What trade are we performing on this project?
                  </p>
                  {/* Trade selection buttons directly under question */}
                  {!selectedTrade && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {TRADE_OPTIONS.map((trade) => (
                        <Button
                          key={trade.key}
                          variant="outline"
                          size="sm"
                          onClick={() => onTradeSelect(trade.key)}
                          className="text-xs"
                        >
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
              
              {/* AI Generating indicator */}
              {selectedTrade && isGeneratingTemplate && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-card border border-amber-200/50 dark:border-amber-800/30 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Generating template...</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      MESSA AI is creating a {TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label} template for {gfaValue.toLocaleString()} sq ft.
                    </p>
                    <div className="mt-2 h-1.5 bg-amber-100 dark:bg-amber-900 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                        initial={{ width: '10%' }}
                        animate={{ width: '90%' }}
                        transition={{ duration: 8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Template Ready - AI done */}
              {selectedTrade && aiTemplateReady && !templateLocked && !isGeneratingTemplate && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-card border border-amber-300 dark:border-amber-700 shadow-sm">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-semibold">AI Template Ready</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Your {TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label} template has been generated. 
                      Review and edit on the right, then lock it.
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      👉 Click "Lock Template & Continue" on the card.
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
              
              {/* OBC Compliance Notice - Stage 3 */}
              {templateLocked && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-card border border-yellow-300 dark:border-yellow-700 shadow-sm">
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-xs font-semibold">OBC COMPLIANCE • Stage 3</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      Please upload all required <strong>verification documents</strong> and <strong>inspection reports</strong> as per OBC (Ontario Building Code) requirements. This ensures your final DNA Report will be complete and accurate.
                    </p>
                    <p className="text-xs text-yellow-600/80 dark:text-yellow-400/70 mt-2 italic">
                      📋 OBC Part 9 — Residential construction materials must meet Section 9.23 (Wood-Frame Construction) and Section 9.29 (Interior Finishes) standards.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      You can upload documents in Stage 5 (Visual Intelligence), or add them later via the Documents Table in your Dashboard.
                    </p>
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
                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-card border border-amber-200/50 dark:border-amber-800/30 shadow-sm">
                 <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-semibold">MESSA AI • Stage 4</span>
                  </div>
                 <p className="text-sm text-foreground mb-3">
                   <strong>Who is handling the installation?</strong>
                 </p>
                 
                   {/* Solo/Team buttons */}
                   {currentSubStep === 1 && !teamSize && (
                     <div className="flex flex-wrap gap-2 mt-1">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => onTeamSizeSelect('solo')}
                         className="text-xs"
                       >
                         <User className="h-3.5 w-3.5 mr-1.5" />
                         Solo
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => onTeamSizeSelect('team')}
                         className="text-xs"
                       >
                         <Users className="h-3.5 w-3.5 mr-1.5" />
                         Team
                       </Button>
                     </div>
                   )}
                  
                  {/* Team configuration - show when Team is selected */}
                  {teamSize === 'team' && currentSubStep === 1 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                       className="mt-3 space-y-2"
                     >
                       <p className="text-xs text-muted-foreground">Configure your team:</p>
                       
                       {teamMembers.map((member, index) => (
                         <div key={member.id} className="flex items-center gap-2 border border-input bg-background p-2 rounded-lg">
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
                               className="p-1 hover:bg-destructive/10 rounded"
                             >
                               <Trash2 className="h-3.5 w-3.5 text-destructive" />
                             </button>
                           )}
                         </div>
                       ))}
                       
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => {
                           const newMember: TeamMember = {
                             id: `member_${Date.now()}`,
                             role: 'worker',
                             count: 1,
                           };
                           onTeamMembersChange([...teamMembers, newMember]);
                         }}
                         className="w-full text-xs border-dashed"
                       >
                         <Plus className="h-3.5 w-3.5 mr-1.5" />
                         Add Role
                       </Button>
                       
                       {/* Confirm team button */}
                       {teamMembers.some(m => m.count > 0) && (
                         <Button
                           onClick={() => onTeamSizeSelect('team_confirmed')}
                           className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/25"
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
               <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-card border border-amber-200/50 dark:border-amber-800/30 shadow-sm">
                 <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                   <Sparkles className="h-4 w-4" />
                   <span className="text-xs font-semibold">MESSA AI</span>
                 </div>
                 <p className="text-sm text-foreground mb-3">
                   <strong>What's the site condition?</strong>
                 </p>
                 
                  {/* Site Condition buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={siteCondition === 'clear' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onSiteConditionChange('clear')}
                      className="text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Clear Site
                    </Button>
                    <Button
                      variant={siteCondition === 'demolition' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onSiteConditionChange('demolition')}
                      className="text-xs"
                    >
                      <Hammer className="h-3.5 w-3.5 mr-1.5" />
                      Demolition
                    </Button>
                  </div>
                  
                  {/* Demolition price input - appears when demolition is selected */}
                  {siteCondition === 'demolition' && currentSubStep === 2 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-3 rounded-lg border border-input bg-background space-y-2"
                    >
                      <Label className="text-xs text-muted-foreground">Demolition price per sq ft</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">$</span>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          step={0.25}
                          value={demolitionUnitPrice || ''}
                          onChange={(e) => onDemolitionUnitPriceChange(Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)))}
                          onFocus={(e) => {
                            if (demolitionUnitPrice === 0) {
                              e.target.value = '';
                            } else {
                              e.target.select();
                            }
                          }}
                          placeholder="2.50"
                          className="w-20 h-8 text-center text-sm"
                          autoFocus
                        />
                        <span className="text-xs text-muted-foreground">/sq ft</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          = <strong>${demolitionCost.toLocaleString()}</strong>
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={onConfirmDemolition}
                        disabled={demolitionUnitPrice <= 0}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Confirm Demolition (+${demolitionCost.toLocaleString()})
                      </Button>
                    </motion.div>
                  )}
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
               <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-card border border-amber-200/50 dark:border-amber-800/30 shadow-sm">
                 <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                   <Sparkles className="h-4 w-4" />
                   <span className="text-xs font-semibold">MESSA AI</span>
                 </div>
                 <p className="text-sm text-foreground mb-3">
                   <strong>When do you want to start?</strong>
                 </p>
                 
                 {/* Timeline buttons */}
                 <div className="flex flex-wrap gap-2 mb-3">
                   <Button
                     variant={timeline === 'asap' ? 'default' : 'outline'}
                     size="sm"
                     onClick={() => onTimelineChange('asap')}
                     className="text-xs"
                   >
                     <Zap className="h-3.5 w-3.5 mr-1.5" />
                     ASAP
                   </Button>
                   <Button
                     variant={timeline === 'scheduled' ? 'default' : 'outline'}
                     size="sm"
                     onClick={() => onTimelineChange('scheduled')}
                     className="text-xs"
                   >
                     <Calendar className="h-3.5 w-3.5 mr-1.5" />
                     Scheduled
                   </Button>
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
                     className="p-3 bg-muted/50 rounded-xl border border-border"
                   >
                     <div className="flex items-center gap-2 text-foreground">
                       <CheckCircle2 className="h-4 w-4 text-amber-500" />
                       <span className="text-sm font-medium">Execution details complete!</span>
                     </div>
                     <p className="text-xs text-muted-foreground mt-1">
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
            
            {/* OBC Compliance Notice - Stage 4 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex justify-start"
            >
              <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-card border border-yellow-300 dark:border-yellow-700 shadow-sm">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs font-semibold">OBC COMPLIANCE • Stage 4</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  Before proceeding, ensure all <strong>site inspection reports</strong> and <strong>demolition permits</strong> (if applicable) are ready per OBC requirements.
                </p>
                <p className="text-xs text-yellow-600/80 dark:text-yellow-400/70 mt-2 italic">
                  📋 OBC Section 8.2 — Demolition & Site Preparation requires documented proof of hazardous materials assessment and municipal permits.
                </p>
              </div>
            </motion.div>
            
            {/* AI Question - Documentation with GFA Context */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
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
      
      {/* Bottom Input Area */}
      <div className="p-3 border-t border-amber-200/50 dark:border-amber-800/30 bg-background/80 backdrop-blur-sm shrink-0">
        <Input
          placeholder="Type a message..."
          disabled
          className="w-full"
        />
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
    CITATION_TYPES.EXECUTION_MODE,
    CITATION_TYPES.SITE_CONDITION,
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
            {relevantCitations.filter(c => c.cite_type === CITATION_TYPES.EXECUTION_MODE).map(c => (
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
            
            {/* Demolition Citation */}
            {relevantCitations.filter(c => c.cite_type === CITATION_TYPES.SITE_CONDITION).map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 bg-orange-50/50 dark:bg-orange-950/30 rounded-lg border border-orange-200/50 dark:border-orange-800/30">
                <div className="flex items-center gap-2">
                  <Hammer className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">
                    {c.value === 'demolition' ? 'Demolition' : 'Site Condition'}
                  </span>
                </div>
                <Badge variant="outline" className="font-mono text-orange-600 dark:text-orange-400 border-orange-300">
                  cite_site
                </Badge>
                <span className="font-semibold text-orange-700 dark:text-orange-300">{c.answer}</span>
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
        
        {/* OBC Compliance Upload Notice - Stage 5 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 rounded-xl border border-yellow-300 dark:border-yellow-700"
        >
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-bold">OBC Verification & Compliance</span>
          </div>
          <p className="text-xs text-foreground leading-relaxed">
            Please upload all required <strong>verification documents</strong> and <strong>inspection reports</strong> here as per OBC (Ontario Building Code) requirements. This ensures your final DNA Report will be complete and accurate.
          </p>
          <p className="text-xs text-yellow-600/80 dark:text-yellow-400/70 mt-2 italic">
            📋 OBC Part 9, Section 9.23 (Wood-Frame), 9.29 (Interior Finishes), 8.2 (Site Prep) — Missing documents will be flagged in the Audit Log with specific code references.
          </p>
          <div className="mt-3 p-2.5 bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              ⚠️ If you don't have a document ready, use <strong>"Skip for now"</strong> above. The item will be tagged as <strong>Pending</strong> in your Documents Table — you can upload it later. Your DNA Report will cite the specific missing OBC reference.
            </p>
          </div>
        </motion.div>
        
        {/* AI Analysis Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl border border-purple-200 dark:border-purple-800"
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Blueprint Analysis</p>
            <p className="text-xs text-muted-foreground mt-1">
              When you upload blueprints, our AI will automatically extract dimensions, room layouts, and verify the total area matches your locked GFA of {gfaValue.toLocaleString()} sq ft. Every uploaded document is checked for OBC compliance automatically.
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
  demolitionCost: number;
  demolitionUnitPrice: number;
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
  demolitionCost,
  demolitionUnitPrice,
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
  if (templateLocked && siteCondition === 'clear') {
    summaryEntries.push({ label: 'Site', value: 'Clear', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' });
  } else if (templateLocked && siteCondition === 'demolition') {
    summaryEntries.push({ label: 'Demolition', value: `$${demolitionUnitPrice.toFixed(2)}/sqft → $${demolitionCost.toLocaleString()}`, icon: Hammer, color: 'text-orange-600 dark:text-orange-400' });
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

  // Compact mode: when both dates are set, switch to a 2-row dense list
  const isCompact = !!(scheduledEndDate);

  if (summaryEntries.length === 0) return null;

  return (
    <div className="shrink-0 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/60 via-white/60 to-orange-50/60 dark:from-amber-950/30 dark:via-background/60 dark:to-orange-950/30 backdrop-blur-sm">
      <div className={cn("px-4", isCompact ? "py-1.5" : "py-2")}>
        {!isCompact && (
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Project Summary</span>
            <span className="text-xs text-muted-foreground">({summaryEntries.length} facts)</span>
          </div>
        )}
        {isCompact ? (
          /* Compact 2-row list layout */
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {summaryEntries.map((entry, idx) => (
              <motion.button
                key={`${entry.label}-${idx}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => entry.citationId && onCitationClick?.(entry.citationId)}
                className={cn(
                  "flex items-center gap-1.5 py-0.5 text-xs text-left transition-all",
                  "hover:bg-amber-100/50 dark:hover:bg-amber-900/30 rounded px-1 -mx-1",
                  entry.citationId && "cursor-pointer"
                )}
              >
                <entry.icon className={cn("h-3 w-3 shrink-0", entry.color)} />
                <span className="text-muted-foreground">{entry.label}:</span>
                <span className="font-medium text-foreground truncate">{entry.value}</span>
              </motion.button>
            ))}
          </div>
        ) : (
          /* Normal pill layout */
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
        )}
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
                        placeholder="Item name"
                        autoFocus
                      />
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">Category</Label>
                          <select
                            value={item.category}
                            onChange={(e) => onUpdateItem(item.id, 'category', e.target.value)}
                            className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
                          >
                            <option value="material">Material</option>
                            <option value="labor">Labor</option>
                          </select>
                        </div>
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
                          <Label className="text-xs">Unit</Label>
                          <Input
                            value={item.unit}
                            onChange={(e) => onUpdateItem(item.id, 'unit', e.target.value)}
                            placeholder="sq ft"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit $</Label>
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
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => onSetEditingItem(null)}
                          className="h-7 text-xs"
                        >
                          Done
                        </Button>
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
              
               {/* Markup/Profit removed - not needed */}
              
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
    
    // AI template generation state
    const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
    const [aiTemplateReady, setAiTemplateReady] = useState(false);
    
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
    const [demolitionUnitPrice, setDemolitionUnitPrice] = useState(2.5);
    
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
    
    // AI template generation function
    const generateAITemplate = useCallback(async (trade: string) => {
      setIsGeneratingTemplate(true);
      setAiTemplateReady(false);
      
      // Extract project info from existing citations
      const projectName = existingCitations.find(c => c.cite_type === CITATION_TYPES.PROJECT_NAME)?.answer || '';
      const location = existingCitations.find(c => c.cite_type === CITATION_TYPES.LOCATION)?.answer || '';
      const workType = existingCitations.find(c => c.cite_type === CITATION_TYPES.WORK_TYPE)?.answer || '';
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-trade-template', {
          body: {
            trade: TRADE_OPTIONS.find(t => t.key === trade)?.label || trade,
            gfa_sqft: gfaValue,
            project_name: projectName,
            location,
            work_type: workType,
          },
        });
        
        if (error) throw error;
        
        if (data?.items && Array.isArray(data.items)) {
          const aiItems: TemplateItem[] = data.items.map((item: any, idx: number) => ({
            id: `ai_${idx + 1}`,
            name: item.name,
            category: item.category === 'labor' ? 'labor' : 'material',
            baseQuantity: Number(item.quantity) || 0,
            quantity: Math.ceil((Number(item.quantity) || 0) * (item.category === 'material' ? 1 + wastePercent / 100 : 1)),
            unit: item.unit || 'pcs',
            unitPrice: Number(item.unitPrice) || 0,
            totalPrice: Math.ceil((Number(item.quantity) || 0) * (item.category === 'material' ? 1 + wastePercent / 100 : 1)) * (Number(item.unitPrice) || 0),
            applyWaste: item.category === 'material',
          }));
          
          setTemplateItems(aiItems);
          setAiTemplateReady(true);
          toast.success("AI template generated!");
        } else {
          throw new Error("Invalid AI response format");
        }
      } catch (err) {
        console.error("[DefinitionFlow] AI template generation failed:", err);
        toast.error("AI generation failed, using default template");
        // Fallback to hardcoded template
        const baseItems = generateTemplateItems(trade, gfaValue);
        const itemsWithWaste = applyWasteToItems(baseItems, wastePercent);
        setTemplateItems(itemsWithWaste);
        setAiTemplateReady(true);
      } finally {
        setIsGeneratingTemplate(false);
      }
    }, [existingCitations, gfaValue, wastePercent]);
    
    // Persist template items to DB (called after add/update/delete/waste/markup changes)
    const persistTemplateSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const persistTemplateToDb = useCallback((items: TemplateItem[]) => {
      if (persistTemplateSaveRef.current) clearTimeout(persistTemplateSaveRef.current);
      persistTemplateSaveRef.current = setTimeout(async () => {
        try {
          const matTotal = items.filter(i => i.category === 'material').reduce((sum, i) => sum + i.totalPrice, 0);
          const labTotal = items.filter(i => i.category === 'labor').reduce((sum, i) => sum + i.totalPrice, 0);
          // ✓ CRITICAL: Save NET (pre-tax) total to DB. Stage 8 applies regional tax.
          const demolitionAmt = siteCondition === 'demolition' ? gfaValue * demolitionUnitPrice : 0;
          const sub = matTotal + labTotal + demolitionAmt;
          const mkup = sub * (markupPercent / 100);
          const netTotal = sub + mkup; // Pre-tax net

          const { data: currentData } = await supabase
            .from("project_summaries")
            .select("id, verified_facts")
            .eq("project_id", projectId)
            .maybeSingle();

          const currentFacts = Array.isArray(currentData?.verified_facts) ? currentData.verified_facts : [];
          const filteredFacts = currentFacts.filter((f: any) => f.cite_type !== 'TEMPLATE_LOCK');
          const templateCitation = createCitation({
            cite_type: CITATION_TYPES.TEMPLATE_LOCK,
            question_key: 'template_items',
            answer: `${items.length} items totaling $${netTotal.toLocaleString()}`,
            value: netTotal,
            metadata: {
              items,
              material_total: matTotal,
              labor_total: labTotal,
              markup_percent: markupPercent,
              waste_percent: wastePercent,
              demolition_cost: demolitionAmt,
              markup_amount: mkup,
              subtotal: sub,
            },
          });
          const updatedFacts = [...filteredFacts, templateCitation as unknown as Record<string, unknown>];

          if (currentData?.id) {
            await supabase
              .from("project_summaries")
              .update({
                verified_facts: updatedFacts as unknown as null,
                total_cost: netTotal,
                material_cost: matTotal,
                labor_cost: labTotal,
                updated_at: new Date().toISOString(),
              })
              .eq("project_id", projectId);
          }
          console.log("[DefinitionFlow] Template items auto-saved to DB");

          // ✓ AUTO-SAVE TO DOCUMENTS: Save Materials & Labor snapshot as JSON document
          // This makes it visible in Stage 8 Panel 6 (Documents)
          try {
            const materials = items.filter(i => i.category === 'material');
            const labor = items.filter(i => i.category === 'labor');
            const tradeName = selectedTrade ? (TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label || selectedTrade) : 'Custom';
            
            const documentSnapshot = {
              generated_at: new Date().toISOString(),
              trade: tradeName,
              gfa_sqft: gfaValue,
              waste_percent: wastePercent,
              markup_percent: markupPercent,
              demolition_cost: demolitionAmt,
              materials: materials.map(m => ({
                name: m.name,
                category: m.category,
                quantity: m.quantity,
                baseQuantity: m.baseQuantity,
                unit: m.unit,
                unitPrice: m.unitPrice,
                totalPrice: m.totalPrice,
                wasteApplied: m.applyWaste,
              })),
              labor: labor.map(l => ({
                name: l.name,
                category: l.category,
                quantity: l.quantity,
                unit: l.unit,
                unitPrice: l.unitPrice,
                totalPrice: l.totalPrice,
              })),
              summary: {
                material_total: matTotal,
                labor_total: labTotal,
                subtotal: sub,
                markup_amount: mkup,
                net_total: netTotal,
              },
            };

            const jsonBlob = new Blob([JSON.stringify(documentSnapshot, null, 2)], { type: 'text/plain' });
            const docFileName = `materials-labor-${tradeName.toLowerCase().replace(/\s+/g, '_')}.txt`;
            const docFilePath = `${projectId}/${docFileName}`;

            // Upsert: remove old version first, then upload new
            await supabase.storage.from('project-documents').remove([docFilePath]);
            const { error: uploadErr } = await supabase.storage
              .from('project-documents')
              .upload(docFilePath, jsonBlob, { contentType: 'text/plain', upsert: true });

            if (!uploadErr) {
              // Upsert document record: delete old matching record, insert new
              const { data: existingDoc } = await supabase
                .from('project_documents')
                .select('id')
                .eq('project_id', projectId)
                .eq('file_name', docFileName)
                .maybeSingle();

              if (existingDoc) {
                await supabase.from('project_documents').delete().eq('id', existingDoc.id);
              }

              await supabase.from('project_documents').insert({
                project_id: projectId,
                file_name: docFileName,
                file_path: docFilePath,
                file_size: jsonBlob.size,
              });

              console.log("[DefinitionFlow] ✓ Materials & Labor document auto-saved to Documents");
            }
          } catch (docErr) {
            console.error("[DefinitionFlow] Failed to save template document:", docErr);
            // Non-blocking: don't interrupt main template save
          }
        } catch (err) {
          console.error("[DefinitionFlow] Failed to auto-save template:", err);
        }
      }, 800);
    }, [projectId, markupPercent, wastePercent, siteCondition, gfaValue, demolitionUnitPrice, selectedTrade]);


    // Recalculate when waste percent changes
    const handleWastePercentChange = useCallback((newWastePercent: number) => {
      setWastePercent(newWastePercent);
      setTemplateItems(prev => {
        const updated = applyWasteToItems(prev, newWastePercent);
        persistTemplateToDb(updated);
        return updated;
      });
    }, [persistTemplateToDb]);
    
    // Handle markup percent changes
    const handleMarkupPercentChange = useCallback((newMarkupPercent: number) => {
      setMarkupPercent(newMarkupPercent);
      // Trigger auto-save with current items and new markup
      setTemplateItems(prev => {
        persistTemplateToDb(prev);
        return prev;
      });
    }, [persistTemplateToDb]);
    
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
      
      // Generate AI template for ALL trades including custom
      generateAITemplate(trade);
      
      // Save TRADE_SELECTION citation IMMEDIATELY
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
        
        await supabase
          .from("projects")
          .update({ 
            trade: trade,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId);
        
        console.log("[DefinitionFlow] TRADE_SELECTION saved:", trade);
      } catch (err) {
        console.error("[DefinitionFlow] Failed to save trade:", err);
      }
    };
    
    // Template item editing
    const handleUpdateItem = (itemId: string, field: keyof TemplateItem, value: number | string) => {
      setTemplateItems(prev => {
        const updated = prev.map(item => {
          if (item.id === itemId) {
            const u = { ...item, [field]: value };
            if (field === 'quantity' || field === 'unitPrice') {
              u.totalPrice = Number(u.quantity) * Number(u.unitPrice);
            }
            return u;
          }
          return item;
        });
        persistTemplateToDb(updated);
        return updated;
      });
    };
    
    const handleDeleteItem = (itemId: string) => {
      setTemplateItems(prev => {
        const updated = prev.filter(item => item.id !== itemId);
        persistTemplateToDb(updated);
        return updated;
      });
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
      setTemplateItems(prev => {
        const updated = [...prev, newItem];
        persistTemplateToDb(updated);
        return updated;
      });
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
        answer: `${templateItems.length} items totaling $${subtotalWithMarkup.toLocaleString()}`,
        value: subtotalWithMarkup, // ✓ NET pre-tax: Stage 8 applies regional tax
        metadata: {
          items: templateItems,
          material_total: materialTotal,
          labor_total: laborTotal,
          markup_percent: markupPercent,
          waste_percent: wastePercent,
          demolition_cost: demolitionCost,
          markup_amount: markupAmount,
          subtotal: subtotal,
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
              total_cost: subtotalWithMarkup, // ✓ NET pre-tax
              material_cost: materialTotal,
              labor_cost: laborTotal,
              template_items: templateItems as unknown as null, // ✓ Persist individual items for Stage 7/8 Gantt
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
              total_cost: subtotalWithMarkup, // ✓ NET pre-tax
              material_cost: materialTotal,
              labor_cost: laborTotal,
              template_items: templateItems as unknown as null, // ✓ Persist individual items for Stage 7/8 Gantt
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
        
        // ✓ ALSO SAVE TEMPLATE DOCUMENT to storage for Stage 8 Documents panel
        try {
          const materials = templateItems.filter(i => i.category === 'material');
          const labor = templateItems.filter(i => i.category === 'labor');
          const tradeName = TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label || selectedTrade || 'Custom';
          const demolitionAmt = siteCondition === 'demolition' ? gfaValue * demolitionUnitPrice : 0;
          
          const documentSnapshot = {
            generated_at: new Date().toISOString(),
            trade: tradeName,
            gfa_sqft: gfaValue,
            waste_percent: wastePercent,
            markup_percent: markupPercent,
            demolition_cost: demolitionAmt,
            materials: materials.map(m => ({
              name: m.name,
              category: m.category,
              quantity: m.quantity,
              baseQuantity: m.baseQuantity,
              unit: m.unit,
              unitPrice: m.unitPrice,
              totalPrice: m.totalPrice,
              wasteApplied: m.applyWaste,
            })),
            labor: labor.map(l => ({
              name: l.name,
              category: l.category,
              quantity: l.quantity,
              unit: l.unit,
              unitPrice: l.unitPrice,
              totalPrice: l.totalPrice,
            })),
            summary: {
              material_total: materialTotal,
              labor_total: laborTotal,
              subtotal: subtotal,
              markup_amount: markupAmount,
              net_total: subtotalWithMarkup,
            },
          };

          const jsonBlob = new Blob([JSON.stringify(documentSnapshot, null, 2)], { type: 'text/plain' });
          const docFileName = `materials-labor-${tradeName.toLowerCase().replace(/\s+/g, '_')}.txt`;
          const docFilePath = `${projectId}/${docFileName}`;

          await supabase.storage.from('project-documents').remove([docFilePath]);
          const { error: uploadErr } = await supabase.storage
            .from('project-documents')
            .upload(docFilePath, jsonBlob, { contentType: 'text/plain', upsert: true });

          if (!uploadErr) {
            const { data: existingDoc } = await supabase
              .from('project_documents')
              .select('id')
              .eq('project_id', projectId)
              .eq('file_name', docFileName)
              .maybeSingle();

            if (existingDoc) {
              await supabase.from('project_documents').delete().eq('id', existingDoc.id);
            }

            await supabase.from('project_documents').insert({
              project_id: projectId,
              file_name: docFileName,
              file_path: docFilePath,
              file_size: jsonBlob.size,
            });

            console.log("[DefinitionFlow] ✓ Template document saved on lock");
          }
        } catch (docErr) {
          console.error("[DefinitionFlow] Failed to save template document on lock:", docErr);
        }
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
    
    // Stage 4 Step 2: Site condition change
    const handleSiteConditionChange = (condition: 'clear' | 'demolition') => {
      setSiteCondition(condition);
      // Only auto-advance for 'clear' — demolition needs price confirmation first
      if (condition === 'clear' && currentSubStep === 2) {
        // Save citation for clear site immediately
        const siteCitation = createCitation({
          cite_type: CITATION_TYPES.SITE_CONDITION,
          question_key: 'site_condition',
          answer: 'Clear Site',
          value: 'clear',
          metadata: { demolition_required: false },
        });
        setFlowCitations(prev => [...prev, siteCitation]);
        setCurrentSubStep(3);
      }
    };
    
    // Confirm demolition with user-set price, then save citation and advance
    const handleConfirmDemolition = () => {
      // Create SITE_CONDITION citation immediately so it appears on the right panel
      const siteCitation = createCitation({
        cite_type: CITATION_TYPES.SITE_CONDITION,
        question_key: 'site_condition',
        answer: `Demolition: $${demolitionUnitPrice.toFixed(2)}/sqft → $${(gfaValue * demolitionUnitPrice).toLocaleString()}`,
        value: 'demolition',
        metadata: { 
          demolition_required: true,
          demolition_unit_price: demolitionUnitPrice,
          demolition_cost: gfaValue * demolitionUnitPrice,
        },
      });
      setFlowCitations(prev => [...prev, siteCitation]);
      
      if (currentSubStep === 2) {
        setCurrentSubStep(3);
      }
    };
    
    // Auto-transition to Stage 5 when Stage 4 is complete (end date selected)
    // Also create TIMELINE + END_DATE citations immediately
    useEffect(() => {
      if (scheduledEndDate && templateLocked && !stage5Active && currentSubStep >= 3) {
        // Create TIMELINE citation immediately
        const hasTimeline = flowCitations.some(c => c.cite_type === CITATION_TYPES.TIMELINE);
        if (!hasTimeline) {
          const timelineCitation = createCitation({
            cite_type: CITATION_TYPES.TIMELINE,
            question_key: 'timeline',
            answer: timeline === 'asap' ? 'ASAP' : `Scheduled: ${scheduledDate ? format(scheduledDate, 'PPP') : 'TBD'}`,
            value: timeline,
            metadata: {
              start_date: timeline === 'asap' ? new Date().toISOString() : scheduledDate?.toISOString(),
            },
          });
          setFlowCitations(prev => [...prev, timelineCitation]);
        }

        // Create END_DATE citation immediately
        const hasEndDate = flowCitations.some(c => c.cite_type === CITATION_TYPES.END_DATE);
        if (!hasEndDate) {
          const endDateCitation = createCitation({
            cite_type: CITATION_TYPES.END_DATE,
            question_key: 'end_date',
            answer: format(scheduledEndDate, 'PPP'),
            value: scheduledEndDate.toISOString(),
            metadata: {
              end_date: scheduledEndDate.toISOString(),
            },
          });
          setFlowCitations(prev => [...prev, endDateCitation]);
        }

        // Small delay before transitioning to Stage 5
        const timer = setTimeout(() => {
          setStage5Active(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }, [scheduledEndDate, templateLocked, stage5Active, currentSubStep, timeline, scheduledDate, flowCitations]);

    // Update TIMELINE citation when start date changes (if already created)
    useEffect(() => {
      if (!scheduledDate || !templateLocked) return;
      setFlowCitations(prev => {
        const idx = prev.findIndex(c => c.cite_type === CITATION_TYPES.TIMELINE);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          answer: `Scheduled: ${format(scheduledDate, 'PPP')}`,
          value: 'scheduled',
          metadata: { ...updated[idx].metadata, start_date: scheduledDate.toISOString() },
        };
        return updated;
      });
    }, [scheduledDate, templateLocked]);

    // Update END_DATE citation when end date changes (if already created)
    useEffect(() => {
      if (!scheduledEndDate || !templateLocked) return;
      setFlowCitations(prev => {
        const idx = prev.findIndex(c => c.cite_type === CITATION_TYPES.END_DATE);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          answer: format(scheduledEndDate, 'PPP'),
          value: scheduledEndDate.toISOString(),
          metadata: { ...updated[idx].metadata, end_date: scheduledEndDate.toISOString() },
        };
        return updated;
      });
    }, [scheduledEndDate, templateLocked]);
    
    // Stage 5: File upload handlers
    const handleFilesDrop = useCallback(async (files: File[]) => {
      const newFiles: UploadedFile[] = files.map(file => ({
        id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        type: file.type === 'application/pdf' ? 'blueprint' : 'site_photo',
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        uploaded: false,
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);

      // Auto-upload each file immediately to storage + project_documents + create citation
      for (const nf of newFiles) {
        try {
          const filePath = `${projectId}/${nf.id}_${nf.name}`;
          const { error: uploadErr } = await supabase.storage
            .from('project-documents')
            .upload(filePath, nf.file);
          
          if (uploadErr) {
            console.error('[Stage5] Auto-upload failed:', uploadErr);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('project-documents')
            .getPublicUrl(filePath);

          await supabase.from('project_documents').insert({
            project_id: projectId,
            file_name: nf.name,
            file_path: filePath,
            file_size: nf.file.size,
          });

          // Create citation immediately
          const citationType = nf.type === 'blueprint'
            ? CITATION_TYPES.BLUEPRINT_UPLOAD
            : CITATION_TYPES.SITE_PHOTO;

          const citation = createCitation({
            cite_type: citationType,
            question_key: nf.type === 'blueprint' ? 'blueprint_upload' : 'site_photo_upload',
            answer: nf.name,
            value: urlData.publicUrl,
            metadata: {
              fileName: nf.name,
              file_name: nf.name,
              file_type: nf.type,
              file_path: filePath,
              storage_url: urlData.publicUrl,
              uploaded_at: new Date().toISOString(),
              category: nf.type === 'blueprint' ? 'technical' : 'visual',
            },
          });

          setFlowCitations(prev => [...prev, citation]);
          setUploadedFiles(prev => prev.map(f =>
            f.id === nf.id ? { ...f, uploaded: true, storageUrl: urlData.publicUrl } : f
          ));

          console.log(`[Stage5] ✓ Auto-uploaded & cited: ${nf.name}`);
        } catch (err) {
          console.error(`[Stage5] Auto-upload error for ${nf.name}:`, err);
        }
      }
    }, [projectId]);
    
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
      setIsUploading(true);
      
      try {
        // Only upload files that haven't been auto-uploaded yet
        const pendingFiles = uploadedFiles.filter(f => !f.uploaded);
        
        for (const file of pendingFiles) {
          const filePath = `${projectId}/${file.id}_${file.name}`;
          const { error } = await supabase.storage
            .from('project-documents')
            .upload(filePath, file.file);
          
          if (error) {
            console.error('[Stage5] Upload failed for:', file.name, error);
            continue;
          }
          
          const { data: urlData } = supabase.storage
            .from('project-documents')
            .getPublicUrl(filePath);
          
          await supabase.from('project_documents').insert({
            project_id: projectId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.file.size,
          });
          
          const citationType = file.type === 'blueprint' 
            ? CITATION_TYPES.BLUEPRINT_UPLOAD 
            : CITATION_TYPES.SITE_PHOTO;
          
          const citation = createCitation({
            cite_type: citationType,
            question_key: file.type === 'blueprint' ? 'blueprint_upload' : 'site_photo_upload',
            answer: file.name,
            value: urlData.publicUrl,
            metadata: {
              fileName: file.name,
              file_name: file.name,
              file_type: file.type,
              file_path: filePath,
              storage_url: urlData.publicUrl,
              uploaded_at: new Date().toISOString(),
              category: file.type === 'blueprint' ? 'technical' : 'visual',
            },
          });
          
          setFlowCitations(prev => [...prev, citation]);
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
        
        setFlowCitations(prev => [...prev, verificationCitation]);
        
        toast.success(`${uploadedFiles.length} file(s) ready!`);
        
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
        // Only create site/demolition citations if not already in flowCitations
        const hasSiteCitation = flowCitations.some(c => c.cite_type === CITATION_TYPES.SITE_CONDITION);
        const siteCitation = !hasSiteCitation ? createCitation({
          cite_type: CITATION_TYPES.SITE_CONDITION,
          question_key: 'site_condition',
          answer: siteCondition === 'clear' ? 'Clear Site' : 'Demolition Needed',
          value: siteCondition,
          metadata: { 
            demolition_required: siteCondition === 'demolition',
            demolition_cost: demolitionCost,
          },
        }) : null;
        
        // Demolition price citation (only if demolition selected and not already created)
        const hasDemolitionCitation = flowCitations.some(c => c.cite_type === CITATION_TYPES.DEMOLITION_PRICE);
        const demolitionPriceCitation = (siteCondition === 'demolition' && !hasDemolitionCitation) ? createCitation({
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
        
        // Only create timeline/end_date citations if not already in flowCitations
        const hasTimelineCitation = flowCitations.some(c => c.cite_type === CITATION_TYPES.TIMELINE);
        const timelineCitation = !hasTimelineCitation ? createCitation({
          cite_type: CITATION_TYPES.TIMELINE,
          question_key: 'timeline',
          answer: timeline === 'asap' ? 'ASAP' : `Scheduled: ${scheduledDate ? format(scheduledDate, 'PPP') : 'TBD'}`,
          value: timeline,
          metadata: {
            start_date: timeline === 'asap' ? new Date().toISOString() : scheduledDate?.toISOString(),
          },
        }) : null;
        
        // End date citation
        const hasEndDateCitation = flowCitations.some(c => c.cite_type === CITATION_TYPES.END_DATE);
        const endDateCitation = (scheduledEndDate && !hasEndDateCitation) ? createCitation({
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
          answer: `Project DNA Locked: ${gfaValue.toLocaleString()} sq ft | $${subtotalWithMarkup.toLocaleString()} (net)`,
          value: {
            gfa: gfaValue,
            trade: selectedTrade,
            team_size: teamSize,
            site_condition: siteCondition,
            timeline: timeline,
            grand_total: subtotalWithMarkup, // NET pre-tax
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
        
        const newCitations = [
          ...(siteCitation ? [siteCitation] : []),
          ...(demolitionPriceCitation ? [demolitionPriceCitation] : []),
          ...(timelineCitation ? [timelineCitation] : []),
          ...(endDateCitation ? [endDateCitation] : []),
          dnaCitation
        ];
        
        const allCitations = [...flowCitations, ...newCitations];
        
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
          const startDateValue = timeline === 'asap' ? new Date().toISOString().split('T')[0] : scheduledDate?.toISOString().split('T')[0] || null;
          const endDateValue = scheduledEndDate?.toISOString().split('T')[0] || null;
          
          const result = await supabase
            .from("project_summaries")
            .update({
              verified_facts: updatedFacts as unknown as null,
              total_cost: subtotalWithMarkup, // ✓ NET pre-tax
              material_cost: materialTotal,
              labor_cost: laborTotal,
              project_start_date: startDateValue,
              project_end_date: endDateValue,
              updated_at: new Date().toISOString(),
            })
            .eq("project_id", projectId);
          error = result.error;
        } else {
          const startDateValue = timeline === 'asap' ? new Date().toISOString().split('T')[0] : scheduledDate?.toISOString().split('T')[0] || null;
          const endDateValue = scheduledEndDate?.toISOString().split('T')[0] || null;
          
          const result = await supabase
            .from("project_summaries")
            .insert({
              project_id: projectId,
              user_id: userId,
              verified_facts: updatedFacts as unknown as null,
              total_cost: subtotalWithMarkup, // ✓ NET pre-tax
              material_cost: materialTotal,
              labor_cost: laborTotal,
              project_start_date: startDateValue,
              project_end_date: endDateValue,
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
          "h-full overflow-hidden flex",
          className
        )}
      >
        {/* LEFT PANEL - Chat (INPUT) - matches Stage 1 layout exactly */}
        <div className="w-full md:w-[400px] lg:w-[450px] border-r border-amber-200/50 dark:border-amber-800/30 flex flex-col h-full">
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
            isGeneratingTemplate={isGeneratingTemplate}
            aiTemplateReady={aiTemplateReady}
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
            onDemolitionUnitPriceChange={handleDemolitionUnitPriceChange}
            onConfirmDemolition={handleConfirmDemolition}
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
        
        {/* RIGHT PANEL - Canvas (OUTPUT) - matches Stage 1 layout exactly */}
        <div className="hidden md:flex flex-1 flex-col h-full overflow-y-auto">
          {/* CitationDrivenCanvas - shows all previous answers from Stage 1 & 2, plus locked template */}
          {/* When Stage 5 is active, canvas shrinks to summary bar so upload zone is prominent */}
          <div className={cn(
            "shrink-0", 
            stage5Active
              ? "max-h-[120px] overflow-y-auto border-b border-purple-200/50 dark:border-purple-800/30"
              : (aiTemplateReady && selectedTrade && !templateLocked) 
                ? "max-h-[40%] overflow-y-auto border-b border-amber-200/50 dark:border-amber-800/30" 
                : "flex-1"
          )}>
            <CitationDrivenCanvas
              citations={[...(existingCitations || []), ...flowCitations]}
              onCitationClick={onCitationClick}
              compact={stage5Active || !!scheduledEndDate}
            />
          </div>
          
          {/* AI Generating spinner on right panel */}
          {selectedTrade && isGeneratingTemplate && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                >
                  <Sparkles className="h-6 w-6 text-amber-500" />
                </motion.div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">AI is generating your template...</p>
                <p className="text-xs text-muted-foreground">Analyzing {gfaValue.toLocaleString()} sq ft {TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label} project</p>
              </div>
            </div>
          )}
          
          {/* Template Card / Upload Panel - appears when AI template ready */}
          {stage5Active ? (
            <div className="flex-1 min-h-0">
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
            </div>
          ) : (selectedTrade && aiTemplateReady && !templateLocked) ? (
            <div className="flex-1 min-h-0">
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
            </div>
          ) : null}
        </div>
      </div>
    );
  }
);

DefinitionFlowStage.displayName = "DefinitionFlowStage";

export default DefinitionFlowStage;
