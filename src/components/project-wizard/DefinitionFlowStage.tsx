// ============================================
// DEFINITION FLOW STAGE - Stage 3 of Project Wizard
// ============================================
// Trade Selection → Template Review → Team Size → Site & Time → Finalize DNA
// LEFT PANEL: Chat with AI questions and selection buttons (INPUT)
// RIGHT PANEL: Template cards and visualizations (OUTPUT)
// ============================================

import { useState, useCallback, useEffect, forwardRef } from "react";
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
  onFlowComplete: (citations: Citation[]) => void;
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
  { key: 'small', label: '1-2 Pros', description: 'Small Crew', icon: Users },
  { key: 'team', label: '3-5 Pros', description: 'Team', icon: UsersRound },
  { key: 'large', label: '5+ Pros', description: 'Large Scale', icon: Building2 },
];

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
interface ChatPanelProps {
  currentSubStep: number;
  gfaValue: number;
  selectedTrade: string | null;
  teamSize: string | null;
  siteCondition: 'clear' | 'demolition';
  timeline: 'asap' | 'scheduled';
  scheduledDate: Date | undefined;
  demolitionCost: number;
  onTradeSelect: (trade: string) => void;
  onTeamSizeSelect: (size: string) => void;
  onSiteConditionChange: (condition: 'clear' | 'demolition') => void;
  onTimelineChange: (timeline: 'asap' | 'scheduled') => void;
  onScheduledDateChange: (date: Date | undefined) => void;
  onProceedFromTemplate: () => void;
  onFinalizeDNA: () => void;
  isSaving: boolean;
}

const ChatPanel = ({
  currentSubStep,
  gfaValue,
  selectedTrade,
  teamSize,
  siteCondition,
  timeline,
  scheduledDate,
  demolitionCost,
  onTradeSelect,
  onTeamSizeSelect,
  onSiteConditionChange,
  onTimelineChange,
  onScheduledDateChange,
  onProceedFromTemplate,
  onFinalizeDNA,
  isSaving,
}: ChatPanelProps) => {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50/50 via-background to-slate-100/30 dark:from-slate-950/30 dark:via-background dark:to-slate-900/20">
      {/* Chat Header */}
      <div className="p-4 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Hammer className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-amber-700 dark:text-amber-300">
              Definition Flow
            </h2>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
              Step {currentSubStep + 1} of 3 • {gfaValue.toLocaleString()} sq ft
            </p>
          </div>
        </div>
        
        {/* Progress dots */}
        <div className="flex gap-2 mt-3">
          {[0, 1, 2].map(step => (
            <motion.div
              key={step}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                step === currentSubStep
                  ? "w-8 bg-gradient-to-r from-amber-500 to-orange-500"
                  : step < currentSubStep
                    ? "w-2 bg-amber-500"
                    : "w-2 bg-amber-200 dark:bg-amber-800"
              )}
              animate={step === currentSubStep ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: step === currentSubStep ? Infinity : 0, duration: 1.5 }}
            />
          ))}
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 md:pb-4">
        {/* STEP 1: Trade Selection */}
        <AnimatePresence mode="wait">
          {currentSubStep >= 0 && (
            <>
              {/* AI Question */}
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
                  
                  {/* Trade selection buttons - DIRECTLY BELOW THE QUESTION */}
                  {currentSubStep === 0 && !selectedTrade && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {TRADE_OPTIONS.map(trade => (
                        <motion.button
                          key={trade.key}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onTradeSelect(trade.key)}
                          className="p-3 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-card hover:border-amber-400 dark:hover:border-amber-600 transition-all flex flex-col items-center gap-1"
                        >
                          <trade.icon className="h-6 w-6 text-amber-500" />
                          <span className="text-sm font-medium">{trade.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
              
              {/* User Answer - Trade (if selected) */}
              {selectedTrade && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
                    <p className="font-medium">{TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-white/80">
                      <FileText className="h-3 w-3" />
                      <span>cite_trade...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Proceed button after trade is selected */}
              {selectedTrade && currentSubStep === 0 && (
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
                      Your {TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label} template is ready. Review and edit on the right, then continue.
                    </p>
                    <Button 
                      onClick={onProceedFromTemplate}
                      className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 border-0"
                      size="sm"
                    >
                      Confirm & Continue
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
        
        {/* STEP 2: Team Size */}
        {currentSubStep >= 1 && (
          <>
            {/* AI Question */}
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
                  What's your execution scale?
                </p>
                
                {/* Team size buttons - DIRECTLY BELOW THE QUESTION */}
                {currentSubStep === 1 && !teamSize && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {TEAM_SIZE_OPTIONS.map(option => (
                      <motion.button
                        key={option.key}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onTeamSizeSelect(option.key)}
                        className="p-3 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-card hover:border-amber-400 dark:hover:border-amber-600 transition-all flex flex-col items-center gap-1 text-center"
                      >
                        <option.icon className="h-6 w-6 text-amber-500" />
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
            
            {/* User Answer - Team Size (if selected) */}
            {teamSize && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end"
              >
                <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
                  <p className="font-medium">{TEAM_SIZE_OPTIONS.find(t => t.key === teamSize)?.label}</p>
                  <p className="text-xs text-white/80">{TEAM_SIZE_OPTIONS.find(t => t.key === teamSize)?.description}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-white/80">
                    <FileText className="h-3 w-3" />
                    <span>cite_team...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
        
        {/* STEP 3: Site & Timeline */}
        {currentSubStep >= 2 && (
          <>
            {/* AI Question */}
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
                <p className="text-sm text-foreground mb-4">
                  What's your site condition and start date?
                </p>
                
                {/* Site Condition */}
                <div className="space-y-3 mb-4">
                  <Label className="text-xs font-medium flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-amber-500" />
                    Site Condition
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onSiteConditionChange('clear')}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all text-left",
                        siteCondition === 'clear'
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-amber-200 dark:border-amber-800"
                      )}
                    >
                      <p className="font-medium text-sm">Clear Site</p>
                      <p className="text-xs text-muted-foreground">Ready to work</p>
                    </button>
                    <button
                      onClick={() => onSiteConditionChange('demolition')}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all text-left",
                        siteCondition === 'demolition'
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-amber-200 dark:border-amber-800"
                      )}
                    >
                      <p className="font-medium text-sm">Demo Needed</p>
                      <p className="text-xs text-muted-foreground">+${demolitionCost.toLocaleString()}</p>
                    </button>
                  </div>
                </div>
                
                {/* Timeline */}
                <div className="space-y-3 mb-4">
                  <Label className="text-xs font-medium flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-amber-500" />
                    Start Timeline
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onTimelineChange('asap')}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all text-left",
                        timeline === 'asap'
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-amber-200 dark:border-amber-800"
                      )}
                    >
                      <p className="font-medium text-sm">ASAP</p>
                      <p className="text-xs text-muted-foreground">Start immediately</p>
                    </button>
                    <button
                      onClick={() => onTimelineChange('scheduled')}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all text-left",
                        timeline === 'scheduled'
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-amber-200 dark:border-amber-800"
                      )}
                    >
                      <p className="font-medium text-sm">Scheduled</p>
                      <p className="text-xs text-muted-foreground">Pick a date</p>
                    </button>
                  </div>
                  
                  {/* Date Picker */}
                  {timeline === 'scheduled' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-2"
                    >
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={scheduledDate}
                            onSelect={onScheduledDateChange}
                            initialFocus
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </motion.div>
                  )}
                </div>
                
                {/* Finalize DNA Button */}
                <Button
                  onClick={onFinalizeDNA}
                  disabled={isSaving}
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30 gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Locking DNA...
                    </>
                  ) : (
                    <>
                      <Lock className="h-5 w-5" />
                      FINALIZE DNA
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </>
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
  teamSize: string | null;
  siteCondition: 'clear' | 'demolition';
  gfaValue: number;
  templateItems: TemplateItem[];
  materialTotal: number;
  laborTotal: number;
  demolitionCost: number;
  subtotal: number;
  markupPercent: number;
  markupAmount: number;
  taxAmount: number;
  grandTotal: number;
  editingItem: string | null;
  wastePercent: number;
  onWastePercentChange: (value: number) => void;
  onMarkupPercentChange: (value: number) => void;
  onUpdateItem: (itemId: string, field: keyof TemplateItem, value: number | string) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: () => void;
  onSetEditingItem: (id: string | null) => void;
  onFinalizeDNA: () => void;
  isSaving: boolean;
}

const CanvasPanel = ({
  currentSubStep,
  selectedTrade,
  teamSize,
  siteCondition,
  gfaValue,
  templateItems,
  materialTotal,
  laborTotal,
  demolitionCost,
  subtotal,
  markupPercent,
  markupAmount,
  taxAmount,
  grandTotal,
  editingItem,
  wastePercent,
  onWastePercentChange,
  onMarkupPercentChange,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onSetEditingItem,
  onFinalizeDNA,
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
                            value={item.quantity}
                            onChange={(e) => onUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => onUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
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
              {demolitionCost > 0 && (
                <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400">
                  <span>Demolition</span>
                  <span>+${demolitionCost.toLocaleString()}</span>
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
            
            {/* Finalize DNA Button */}
            <div className="px-4 py-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-t border-amber-200 dark:border-amber-800">
              <Button
                onClick={onFinalizeDNA}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 text-base shadow-lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 mr-2" />
                    Finalize Project DNA
                  </>
                )}
              </Button>
            </div>
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
  ({ projectId, userId, gfaValue, onFlowComplete, className }, ref) => {
    // Flow step state
    const [currentSubStep, setCurrentSubStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    
    // Step 1: Trade selection
    const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
    
    // Template items (editable)
    const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
    const [editingItem, setEditingItem] = useState<string | null>(null);
    
    // Waste percentage (editable)
    const [wastePercent, setWastePercent] = useState(10);
    
    // Markup percentage (editable)
    const [markupPercent, setMarkupPercent] = useState(0);
    
    // Step 2: Team size
    const [teamSize, setTeamSize] = useState<string | null>(null);
    
    // Step 3: Site & Time
    const [siteCondition, setSiteCondition] = useState<'clear' | 'demolition'>('clear');
    const [timeline, setTimeline] = useState<'asap' | 'scheduled'>('asap');
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
    
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
    const demolitionCost = siteCondition === 'demolition' ? gfaValue * 2.5 : 0;
    const subtotal = materialTotal + laborTotal + demolitionCost;
    const markupAmount = subtotal * (markupPercent / 100);
    const subtotalWithMarkup = subtotal + markupAmount;
    const taxRate = 0.13; // 13% HST for Ontario
    const taxAmount = subtotalWithMarkup * taxRate;
    const grandTotal = subtotalWithMarkup + taxAmount;
    
    // Handle trade selection
    const handleTradeSelect = (trade: string) => {
      setSelectedTrade(trade);
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
    
    // Proceed from template to team size
    const handleProceedFromTemplate = () => {
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
        },
      });
      
      setFlowCitations([tradeCitation, templateCitation]);
      setCurrentSubStep(1);
    };
    
    const handleTeamSizeSelect = (size: string) => {
      setTeamSize(size);
      
      const teamCitation = createCitation({
        cite_type: CITATION_TYPES.TEAM_SIZE,
        question_key: 'team_size',
        answer: TEAM_SIZE_OPTIONS.find(t => t.key === size)?.label || size,
        value: size,
        metadata: { team_size_key: size },
      });
      
      setFlowCitations(prev => [...prev, teamCitation]);
      setCurrentSubStep(2);
    };
    
    // Final lock
    const handleFinalizeDNA = useCallback(async () => {
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
        
        const timelineCitation = createCitation({
          cite_type: CITATION_TYPES.TIMELINE,
          question_key: 'timeline',
          answer: timeline === 'asap' ? 'ASAP' : `Scheduled: ${scheduledDate ? format(scheduledDate, 'PPP') : 'TBD'}`,
          value: timeline,
          metadata: {
            start_date: timeline === 'asap' ? new Date().toISOString() : scheduledDate?.toISOString(),
          },
        });
        
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
          },
          metadata: {
            finalized_at: new Date().toISOString(),
            template_items: templateItems,
            material_total: materialTotal,
            labor_total: laborTotal,
            demolition_cost: demolitionCost,
          },
        });
        
        const allCitations = [...flowCitations, siteCitation, timelineCitation, dnaCitation];
        
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
        
        toast.success("Project DNA Finalized!");
        onFlowComplete(allCitations);
        
      } catch (err) {
        console.error("[DefinitionFlow] Save failed:", err);
        toast.error("Failed to finalize - please try again");
      } finally {
        setIsSaving(false);
      }
    }, [projectId, userId, flowCitations, siteCondition, timeline, scheduledDate, templateItems, grandTotal, materialTotal, laborTotal, demolitionCost, gfaValue, selectedTrade, teamSize, onFlowComplete]);
    
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
            teamSize={teamSize}
            siteCondition={siteCondition}
            timeline={timeline}
            scheduledDate={scheduledDate}
            demolitionCost={demolitionCost}
            onTradeSelect={handleTradeSelect}
            onTeamSizeSelect={handleTeamSizeSelect}
            onSiteConditionChange={setSiteCondition}
            onTimelineChange={setTimeline}
            onScheduledDateChange={setScheduledDate}
            onProceedFromTemplate={handleProceedFromTemplate}
            onFinalizeDNA={handleFinalizeDNA}
            isSaving={isSaving}
          />
        </div>
        
        {/* RIGHT PANEL (Desktop) / TOP (Mobile) - Canvas/Template (OUTPUT) */}
        {selectedTrade && (
          <div className={cn(
            "order-1 md:order-2",
            "flex-1 min-h-0",
            "border-b md:border-b-0 border-amber-200/50 dark:border-amber-800/30"
          )}>
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
              subtotal={subtotal}
              markupPercent={markupPercent}
              markupAmount={markupAmount}
              taxAmount={taxAmount}
              grandTotal={grandTotal}
              editingItem={editingItem}
              wastePercent={wastePercent}
              onWastePercentChange={handleWastePercentChange}
              onMarkupPercentChange={handleMarkupPercentChange}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onAddItem={handleAddItem}
              onSetEditingItem={setEditingItem}
              onFinalizeDNA={handleFinalizeDNA}
              isSaving={isSaving}
            />
          </div>
        )}
      </div>
    );
  }
);

DefinitionFlowStage.displayName = "DefinitionFlowStage";

export default DefinitionFlowStage;
