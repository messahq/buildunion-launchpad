// ============================================
// DEFINITION FLOW STAGE - Stage 3 of Project Wizard
// ============================================
// Trade Selection → Template Review → Team Size → Site & Time → Finalize DNA
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
  Wrench,
  Sparkles,
  Lock,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
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

// Generate template items based on trade and GFA
function generateTemplateItems(trade: string, gfaSqft: number): TemplateItem[] {
  const templates: Record<string, TemplateItem[]> = {
    flooring: [
      { id: '1', name: 'Hardwood Flooring (sq ft)', category: 'material', quantity: gfaSqft, unit: 'sq ft', unitPrice: 8.50, totalPrice: gfaSqft * 8.50 },
      { id: '2', name: 'Underlayment', category: 'material', quantity: gfaSqft, unit: 'sq ft', unitPrice: 0.75, totalPrice: gfaSqft * 0.75 },
      { id: '3', name: 'Transition Strips', category: 'material', quantity: Math.ceil(gfaSqft / 200), unit: 'pcs', unitPrice: 25, totalPrice: Math.ceil(gfaSqft / 200) * 25 },
      { id: '4', name: 'Installation Labor', category: 'labor', quantity: gfaSqft, unit: 'sq ft', unitPrice: 4.50, totalPrice: gfaSqft * 4.50 },
      { id: '5', name: 'Baseboards', category: 'material', quantity: Math.round(4 * Math.sqrt(gfaSqft) * 0.85), unit: 'ln ft', unitPrice: 3.25, totalPrice: Math.round(4 * Math.sqrt(gfaSqft) * 0.85) * 3.25 },
    ],
    painting: [
      { id: '1', name: 'Interior Paint (Premium)', category: 'material', quantity: Math.ceil(gfaSqft / 350), unit: 'gal', unitPrice: 45, totalPrice: Math.ceil(gfaSqft / 350) * 45 },
      { id: '2', name: 'Primer', category: 'material', quantity: Math.ceil(gfaSqft / 400), unit: 'gal', unitPrice: 35, totalPrice: Math.ceil(gfaSqft / 400) * 35 },
      { id: '3', name: 'Supplies (Brushes, Rollers, Tape)', category: 'material', quantity: 1, unit: 'kit', unitPrice: 85, totalPrice: 85 },
      { id: '4', name: 'Surface Prep Labor', category: 'labor', quantity: gfaSqft, unit: 'sq ft', unitPrice: 0.75, totalPrice: gfaSqft * 0.75 },
      { id: '5', name: 'Painting Labor', category: 'labor', quantity: gfaSqft, unit: 'sq ft', unitPrice: 2.50, totalPrice: gfaSqft * 2.50 },
    ],
    drywall: [
      { id: '1', name: 'Drywall Sheets (4x8)', category: 'material', quantity: Math.ceil(gfaSqft / 32), unit: 'sheets', unitPrice: 18, totalPrice: Math.ceil(gfaSqft / 32) * 18 },
      { id: '2', name: 'Joint Compound', category: 'material', quantity: Math.ceil(gfaSqft / 500), unit: 'buckets', unitPrice: 22, totalPrice: Math.ceil(gfaSqft / 500) * 22 },
      { id: '3', name: 'Drywall Tape', category: 'material', quantity: Math.ceil(gfaSqft / 100), unit: 'rolls', unitPrice: 8, totalPrice: Math.ceil(gfaSqft / 100) * 8 },
      { id: '4', name: 'Installation Labor', category: 'labor', quantity: gfaSqft, unit: 'sq ft', unitPrice: 2.25, totalPrice: gfaSqft * 2.25 },
      { id: '5', name: 'Finishing Labor (Tape & Mud)', category: 'labor', quantity: gfaSqft, unit: 'sq ft', unitPrice: 1.75, totalPrice: gfaSqft * 1.75 },
    ],
    custom: [
      { id: '1', name: 'Custom Material', category: 'material', quantity: gfaSqft, unit: 'sq ft', unitPrice: 5, totalPrice: gfaSqft * 5 },
      { id: '2', name: 'Custom Labor', category: 'labor', quantity: gfaSqft, unit: 'sq ft', unitPrice: 3, totalPrice: gfaSqft * 3 },
    ],
  };
  
  return templates[trade] || templates.custom;
}

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
        const items = generateTemplateItems(selectedTrade, gfaValue);
        setTemplateItems(items);
      }
    }, [selectedTrade, gfaValue]);
    
    // Calculate totals
    const materialTotal = templateItems.filter(i => i.category === 'material').reduce((sum, i) => sum + i.totalPrice, 0);
    const laborTotal = templateItems.filter(i => i.category === 'labor').reduce((sum, i) => sum + i.totalPrice, 0);
    const demolitionCost = siteCondition === 'demolition' ? gfaValue * 2.5 : 0; // $2.50/sqft demo
    const grandTotal = materialTotal + laborTotal + demolitionCost;
    
    // Handle trade selection
    const handleTradeSelect = (trade: string) => {
      setSelectedTrade(trade);
    };
    
    // Template item editing
    const handleUpdateItem = (itemId: string, field: keyof TemplateItem, value: number | string) => {
      setTemplateItems(prev => prev.map(item => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value };
          // Recalculate total if quantity or unit price changed
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
        quantity: 1,
        unit: 'pcs',
        unitPrice: 0,
        totalPrice: 0,
      };
      setTemplateItems(prev => [...prev, newItem]);
      setEditingItem(newItem.id);
    };
    
    // Proceed to next step
    const handleProceedFromTemplate = () => {
      if (templateItems.length === 0) {
        toast.error("Add at least one item to the template");
        return;
      }
      
      // Create trade selection citation
      const tradeCitation = createCitation({
        cite_type: CITATION_TYPES.TRADE_SELECTION,
        question_key: 'trade_selection',
        answer: TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label || selectedTrade || '',
        value: selectedTrade || '',
        metadata: { trade_key: selectedTrade },
      });
      
      // Create template lock citation
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
      setCurrentSubStep(1); // Move to team size
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
      setCurrentSubStep(2); // Move to site & time
    };
    
    // Final lock
    const handleFinalizeDNA = useCallback(async () => {
      setIsSaving(true);
      
      try {
        // Create site condition citation
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
        
        // Create timeline citation
        const timelineCitation = createCitation({
          cite_type: CITATION_TYPES.TIMELINE,
          question_key: 'timeline',
          answer: timeline === 'asap' ? 'ASAP' : `Scheduled: ${scheduledDate ? format(scheduledDate, 'PPP') : 'TBD'}`,
          value: timeline,
          metadata: {
            start_date: timeline === 'asap' ? new Date().toISOString() : scheduledDate?.toISOString(),
          },
        });
        
        // Create final DNA citation
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
        
        // Save all citations to database
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
          "h-full flex flex-col bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/20",
          className
        )}
      >
        {/* Stage Header */}
        <div className="p-3 md:p-4 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/80 via-white/80 to-orange-50/80 dark:from-amber-950/50 dark:via-background/80 dark:to-orange-950/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <motion.div
              className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              <Hammer className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <h2 className="font-semibold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                Stage 3: Definition Flow
              </h2>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                Step {currentSubStep + 1} of 3 • {gfaValue.toLocaleString()} sq ft Interior
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
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* STEP 1: Trade Selection & Template */}
            {currentSubStep === 0 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.4 }}
                className="h-full flex flex-col"
              >
                {/* AI Prompt */}
                <div className="p-4 bg-gradient-to-r from-amber-100/50 to-orange-100/50 dark:from-amber-900/30 dark:to-orange-900/30 border-b border-amber-200/50 dark:border-amber-800/30">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Selected: {gfaValue.toLocaleString()} sq ft Interior
                      </p>
                      <p className="text-sm text-amber-700/70 dark:text-amber-300/70">
                        Specify the trade to generate your template
                      </p>
                    </div>
                  </div>
                </div>
                
                {!selectedTrade ? (
                  /* Trade Selection Grid */
                  <div className="flex-1 p-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                      {TRADE_OPTIONS.map(trade => (
                        <motion.button
                          key={trade.key}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleTradeSelect(trade.key)}
                          className="p-4 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-card hover:border-amber-400 dark:hover:border-amber-600 transition-all flex flex-col items-center gap-2"
                        >
                          <trade.icon className="h-8 w-8 text-amber-500" />
                          <span className="font-medium">{trade.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Template Review Card */
                  <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">
                    <div className="bg-card border-2 border-amber-300 dark:border-amber-700 rounded-xl shadow-lg max-w-lg mx-auto overflow-hidden">
                      {/* Template Header */}
                      <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {TRADE_OPTIONS.find(t => t.key === selectedTrade)?.icon && (
                              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                                {(() => {
                                  const Icon = TRADE_OPTIONS.find(t => t.key === selectedTrade)?.icon;
                                  return Icon ? <Icon className="h-5 w-5" /> : null;
                                })()}
                              </motion.div>
                            )}
                            <span className="font-semibold">
                              {TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label} Template
                            </span>
                          </div>
                          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                            {gfaValue.toLocaleString()} sq ft
                          </span>
                        </div>
                      </div>
                      
                      {/* Items List */}
                      <div className="divide-y divide-amber-100 dark:divide-amber-900 max-h-72 overflow-y-auto">
                        {templateItems.map(item => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-3 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 group"
                          >
                            {editingItem === item.id ? (
                              /* Editing Mode */
                              <div className="space-y-2">
                                <Input
                                  value={item.name}
                                  onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                  className="h-8 text-sm"
                                  autoFocus
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <Label className="text-xs">Qty</Label>
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Unit Price</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={item.unitPrice}
                                      onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <Button
                                      size="sm"
                                      onClick={() => setEditingItem(null)}
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
                                      onClick={() => setEditingItem(item.id)}
                                      className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded"
                                    >
                                      <Edit2 className="h-3.5 w-3.5 text-amber-600" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                      
                      {/* Add Item Button */}
                      <button
                        onClick={handleAddItem}
                        className="w-full p-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center justify-center gap-1 border-t border-amber-200 dark:border-amber-800"
                      >
                        <Plus className="h-4 w-4" />
                        Add Item
                      </button>
                      
                      {/* Totals */}
                      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border-t border-amber-200 dark:border-amber-800 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Materials</span>
                          <span>${materialTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Labor</span>
                          <span>${laborTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-amber-200 dark:border-amber-700">
                          <span>Total</span>
                          <span className="text-amber-600 dark:text-amber-400">${grandTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Proceed Button */}
                    <div className="mt-4 max-w-lg mx-auto">
                      <Button
                        onClick={handleProceedFromTemplate}
                        className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 gap-2"
                      >
                        Confirm Template
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            
            {/* STEP 2: Team Size */}
            {currentSubStep === 1 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.4 }}
                className="h-full flex flex-col p-4"
              >
                {/* AI Prompt */}
                <div className="p-4 bg-gradient-to-r from-amber-100/50 to-orange-100/50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl mb-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Execution scale?
                      </p>
                      <p className="text-sm text-amber-700/70 dark:text-amber-300/70">
                        Select your team size for this project
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Team Size Options */}
                <div className="flex-1 flex items-center justify-center pb-16">
                  <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                    {TEAM_SIZE_OPTIONS.map(option => (
                      <motion.button
                        key={option.key}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleTeamSizeSelect(option.key)}
                        className="p-5 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-card hover:border-amber-400 dark:hover:border-amber-600 transition-all flex flex-col items-center gap-2 text-center"
                      >
                        <option.icon className="h-10 w-10 text-amber-500" />
                        <span className="font-semibold">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* STEP 3: Site & Time + Finalize */}
            {currentSubStep === 2 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.4 }}
                className="h-full flex flex-col p-4 overflow-y-auto pb-24 md:pb-4"
              >
                {/* AI Prompt */}
                <div className="p-4 bg-gradient-to-r from-amber-100/50 to-orange-100/50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl mb-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Site condition and Start date?
                      </p>
                      <p className="text-sm text-amber-700/70 dark:text-amber-300/70">
                        Final details before locking your project DNA
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="max-w-md mx-auto w-full space-y-6">
                  {/* Site Condition Toggle */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-500" />
                      Site Condition
                    </Label>
                    <RadioGroup
                      value={siteCondition}
                      onValueChange={(v) => setSiteCondition(v as 'clear' | 'demolition')}
                      className="grid grid-cols-2 gap-3"
                    >
                      <label className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        siteCondition === 'clear'
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-amber-200 dark:border-amber-800"
                      )}>
                        <RadioGroupItem value="clear" id="clear" />
                        <div>
                          <p className="font-medium">Clear</p>
                          <p className="text-xs text-muted-foreground">Ready to work</p>
                        </div>
                      </label>
                      <label className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        siteCondition === 'demolition'
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-amber-200 dark:border-amber-800"
                      )}>
                        <RadioGroupItem value="demolition" id="demolition" />
                        <div>
                          <p className="font-medium">Demo Needed</p>
                          <p className="text-xs text-muted-foreground">+${demolitionCost.toLocaleString()}</p>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>
                  
                  {/* Timeline Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-500" />
                      Start Timeline
                    </Label>
                    <RadioGroup
                      value={timeline}
                      onValueChange={(v) => setTimeline(v as 'asap' | 'scheduled')}
                      className="grid grid-cols-2 gap-3"
                    >
                      <label className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        timeline === 'asap'
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-amber-200 dark:border-amber-800"
                      )}>
                        <RadioGroupItem value="asap" id="asap" />
                        <div>
                          <p className="font-medium">ASAP</p>
                          <p className="text-xs text-muted-foreground">Start immediately</p>
                        </div>
                      </label>
                      <label className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        timeline === 'scheduled'
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-amber-200 dark:border-amber-800"
                      )}>
                        <RadioGroupItem value="scheduled" id="scheduled" />
                        <div>
                          <p className="font-medium">Schedule</p>
                          <p className="text-xs text-muted-foreground">Pick a date</p>
                        </div>
                      </label>
                    </RadioGroup>
                    
                    {/* Date Picker */}
                    {timeline === 'scheduled' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-2"
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal h-12"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a start date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="center">
                            <CalendarComponent
                              mode="single"
                              selected={scheduledDate}
                              onSelect={setScheduledDate}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Summary Card */}
                  <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 rounded-xl p-4 border border-amber-300 dark:border-amber-700">
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-3">
                      Project DNA Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-amber-700/70 dark:text-amber-300/70">Area</span>
                        <span className="font-medium">{gfaValue.toLocaleString()} sq ft</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-700/70 dark:text-amber-300/70">Trade</span>
                        <span className="font-medium">{TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-700/70 dark:text-amber-300/70">Team</span>
                        <span className="font-medium">{TEAM_SIZE_OPTIONS.find(t => t.key === teamSize)?.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-700/70 dark:text-amber-300/70">Materials</span>
                        <span className="font-medium">${materialTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-700/70 dark:text-amber-300/70">Labor</span>
                        <span className="font-medium">${laborTotal.toLocaleString()}</span>
                      </div>
                      {siteCondition === 'demolition' && (
                        <div className="flex justify-between text-orange-600 dark:text-orange-400">
                          <span>Demolition</span>
                          <span className="font-medium">+${demolitionCost.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-amber-300/50 dark:border-amber-700/50 text-lg font-bold">
                        <span className="text-amber-800 dark:text-amber-200">Grand Total</span>
                        <span className="text-amber-600 dark:text-amber-400">${grandTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* FINALIZE DNA Button */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleFinalizeDNA}
                      disabled={isSaving || (timeline === 'scheduled' && !scheduledDate)}
                      className="w-full h-14 text-lg font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:via-orange-600 hover:to-amber-600 text-white shadow-xl shadow-amber-500/30 gap-3 animate-[gradient_3s_ease_infinite] bg-[length:200%_100%]"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin" />
                          Finalizing...
                        </>
                      ) : (
                        <>
                          <Lock className="h-6 w-6" />
                          FINALIZE DNA
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);

DefinitionFlowStage.displayName = "DefinitionFlowStage";

export default DefinitionFlowStage;
