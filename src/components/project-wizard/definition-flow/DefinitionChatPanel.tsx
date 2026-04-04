// ============================================
// DEFINITION CHAT PANEL - Left panel chat UI for Stage 3-5
// Extracted from DefinitionFlowStage.tsx
// ============================================

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hammer,
  Settings,
  User,
  Users,
  CheckCircle2,
  Trash2,
  Plus,
  Calendar,
  Sparkles,
  Lock,
  FileText,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { HardHatSpinner } from "@/components/ui/loading-states";
import {
  type TeamMember,
  type UploadedFile,
  TRADE_OPTIONS,
  TEAM_ROLES,
} from "./types";

export interface ChatPanelProps {
  currentSubStep: number;
  gfaValue: number;
  selectedTrade: string | null;
  customTradeName: string | null;
  templateLocked: boolean;
  teamSize: string | null;
  teamMembers: TeamMember[];
  siteCondition: 'clear' | 'demolition';
  timeline: 'asap' | 'scheduled';
  scheduledDate: Date | undefined;
  scheduledEndDate: Date | undefined;
  demolitionCost: number;
  demolitionUnitPrice: number;
  isGeneratingTemplate: boolean;
  aiTemplateReady: boolean;
  stage5Active: boolean;
  uploadedFiles: UploadedFile[];
  isUploading: boolean;
  tradeCitationId?: string;
  teamCitationId?: string;
  siteCitationId?: string;
  timelineCitationId?: string;
  onCitationClick?: (citationId: string) => void;
  onTradeSelect: (trade: string, customName?: string) => void;
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
  customTradeName,
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
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTradeInput, setCustomTradeInput] = useState('');
  
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
                ? "Stage 5 • Files & Contracts"
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
                  {!selectedTrade && !showCustomInput && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {TRADE_OPTIONS.filter(t => t.key !== 'custom').map((trade) => (
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCustomInput(true)}
                        className="text-xs border-dashed"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Custom
                      </Button>
                    </div>
                  )}
                  {/* Custom trade input */}
                  {!selectedTrade && showCustomInput && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-muted-foreground">Describe the trade or work you need (e.g. "Tiling", "Insulation", "Roofing"):</p>
                      <div className="flex gap-2">
                        <Input
                          value={customTradeInput}
                          onChange={(e) => setCustomTradeInput(e.target.value)}
                          placeholder="e.g. Tiling, Insulation, HVAC..."
                          className="text-sm h-9"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customTradeInput.trim()) {
                              onTradeSelect('custom', customTradeInput.trim());
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (customTradeInput.trim()) {
                              onTradeSelect('custom', customTradeInput.trim());
                            }
                          }}
                          disabled={!customTradeInput.trim()}
                          className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Generate
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowCustomInput(false); setCustomTradeInput(''); }}
                        className="text-xs text-muted-foreground"
                      >
                        ← Back to trades
                      </Button>
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
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 bg-white dark:bg-card border-2 border-amber-500 text-gray-800 dark:text-gray-100 shadow-sm">
                    <p className="font-medium">
                      {selectedTrade === 'custom' && customTradeName 
                        ? customTradeName 
                        : TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label}
                    </p>
                    {tradeCitationId && (
                      <button
                        onClick={() => onCitationClick?.(tradeCitationId)}
                        className="inline-flex items-center gap-1 mt-1 text-xs text-amber-600/70 dark:text-amber-400/70 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer"
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
                      <span className="h-4 w-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin block" />
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Generating template…</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      MESSA AI is creating a {selectedTrade === 'custom' && customTradeName ? customTradeName : TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label} template for {gfaValue.toLocaleString()} sq ft.
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
                      Your {selectedTrade === 'custom' && customTradeName ? customTradeName : TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label} template has been generated. 
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
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 bg-white dark:bg-card border-2 border-green-500 text-gray-800 dark:text-gray-100 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-green-500" />
                      <p className="font-medium text-sm">Template Locked</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Materials & pricing confirmed</p>
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
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 bg-white dark:bg-card border-2 border-green-500 text-gray-800 dark:text-gray-100 shadow-sm">
                    <p className="font-medium text-sm">
                      {teamSize === 'solo' 
                        ? 'Solo Installation' 
                        : `Team: ${teamMembers.reduce((sum, m) => sum + m.count, 0)} people`
                      }
                    </p>
                    {teamSize === 'team_confirmed' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {teamMembers.filter(m => m.count > 0).map(m => 
                          `${m.count} ${TEAM_ROLES.find(r => r.key === m.role)?.label}`
                        ).join(', ')}
                      </p>
                    )}
                    {teamCitationId && (
                      <button
                        onClick={() => onCitationClick?.(teamCitationId)}
                        className="inline-flex items-center gap-1 mt-1 text-xs text-green-600/70 dark:text-green-400/70 hover:text-green-700 dark:hover:text-green-300 transition-colors cursor-pointer"
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
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Demolition Rate</Label>
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
                            className="w-16 h-8 text-center text-sm"
                          />
                          <span className="text-xs text-muted-foreground">/ sq ft</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{gfaValue.toLocaleString()} sq ft</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          Total: ${(gfaValue * demolitionUnitPrice).toLocaleString()}
                        </span>
                      </div>
                      <Button
                        onClick={onConfirmDemolition}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-md"
                        size="sm"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirm Demolition (+${(gfaValue * demolitionUnitPrice).toLocaleString()})
                      </Button>
                    </motion.div>
                  )}
                </div>
            </motion.div>
            
            {/* User Answer - Site condition */}
            {((siteCondition === 'clear' && currentSubStep >= 3) || 
              (siteCondition === 'demolition' && currentSubStep >= 3)) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end"
              >
                <div className={cn(
                  "max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 bg-white dark:bg-card shadow-sm",
                  siteCondition === 'demolition'
                    ? "border-2 border-orange-500"
                    : "border-2 border-green-500"
                )}>
                  <p className="font-medium text-sm text-gray-800 dark:text-gray-100">{siteCondition === 'clear' ? 'Clear Site' : 'Demolition Needed'}</p>
                  {siteCondition === 'demolition' && (
                    <p className="text-xs text-muted-foreground">+${demolitionCost.toLocaleString()} added</p>
                  )}
                  {siteCitationId && (
                    <button
                      onClick={() => onCitationClick?.(siteCitationId)}
                      className="inline-flex items-center gap-1 mt-1 text-xs text-orange-600/70 dark:text-orange-400/70 hover:text-orange-700 dark:hover:text-orange-300 transition-colors cursor-pointer"
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
            {/* Mobile rotate hint for date step */}
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-xs text-amber-700 dark:text-amber-300 mx-1"
            >
              <span className="text-base">📱</span>
              <span>Forgasd el a telefont fekvő állásba a citációk előnézetéhez!</span>
            </motion.div>
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
        
        {/* STAGE 5: Files & Contracts - Documentation Upload */}
        {stage5Active && (
          <>
            {/* Stage 4 Confirmed Message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end"
            >
              <div className="max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 bg-white dark:bg-card border-2 border-green-500 text-gray-800 dark:text-gray-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <p className="font-medium text-sm">Dates Confirmed</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {timeline === 'asap' ? 'Starting ASAP' : scheduledDate ? format(scheduledDate, 'PPP') : ''} 
                  {scheduledEndDate && ` → ${format(scheduledEndDate, 'PPP')}`}
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
                <div className="max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 bg-white dark:bg-card border-2 border-purple-500 text-gray-800 dark:text-gray-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-500" />
                    <p className="font-medium text-sm">{uploadedFiles.length} file(s) ready</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
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

export default ChatPanel;
