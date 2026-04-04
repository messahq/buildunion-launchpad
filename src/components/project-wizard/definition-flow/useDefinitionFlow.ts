// ============================================
// USE DEFINITION FLOW - Core state & logic hook
// Extracted from DefinitionFlowStage.tsx
// ============================================

import { useState, useCallback, useEffect, useRef } from "react";
import { Citation, CITATION_TYPES, createCitation } from "@/types/citation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  type TemplateItem,
  type TeamMember,
  type UploadedFile,
  TRADE_OPTIONS,
  generateTemplateItems,
  applyWasteToItems,
} from "./types";

interface UseDefinitionFlowProps {
  projectId: string;
  userId: string;
  gfaValue: number;
  existingCitations: Citation[];
  onFlowComplete: (citations: Citation[]) => void;
}

export function useDefinitionFlow({
  projectId,
  userId,
  gfaValue,
  existingCitations,
  onFlowComplete,
}: UseDefinitionFlowProps) {
  // Flow step state
  const [currentSubStep, setCurrentSubStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Step 1: Trade selection
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
  const [customTradeName, setCustomTradeName] = useState<string | null>(null);
  
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
  
  // Stage 5: Files & Contracts
  const [stage5Active, setStage5Active] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Collected citations
  const [flowCitations, setFlowCitations] = useState<Citation[]>([]);
  
  // AI template generation function
  const generateAITemplate = useCallback(async (trade: string, tradeLabel?: string) => {
    setIsGeneratingTemplate(true);
    setAiTemplateReady(false);
    
    const projectName = existingCitations.find(c => c.cite_type === CITATION_TYPES.PROJECT_NAME)?.answer || '';
    const location = existingCitations.find(c => c.cite_type === CITATION_TYPES.LOCATION)?.answer || '';
    const workType = existingCitations.find(c => c.cite_type === CITATION_TYPES.WORK_TYPE)?.answer || '';
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-trade-template', {
        body: {
          trade: tradeLabel || TRADE_OPTIONS.find(t => t.key === trade)?.label || trade,
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
        const netTotal = sub + mkup;

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

        // ✓ AUTO-SAVE TO DOCUMENTS
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
              name: m.name, category: m.category, quantity: m.quantity, baseQuantity: m.baseQuantity,
              unit: m.unit, unitPrice: m.unitPrice, totalPrice: m.totalPrice, wasteApplied: m.applyWaste,
            })),
            labor: labor.map(l => ({
              name: l.name, category: l.category, quantity: l.quantity, unit: l.unit,
              unitPrice: l.unitPrice, totalPrice: l.totalPrice,
            })),
            summary: { material_total: matTotal, labor_total: labTotal, subtotal: sub, markup_amount: mkup, net_total: netTotal },
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

            console.log("[DefinitionFlow] ✓ Materials & Labor document auto-saved to Documents");
          }
        } catch (docErr) {
          console.error("[DefinitionFlow] Failed to save template document:", docErr);
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
  const taxRate = 0.13;
  const taxAmount = subtotalWithMarkup * taxRate;
  const grandTotal = subtotalWithMarkup + taxAmount;
  
  // Handle demolition unit price change
  const handleDemolitionUnitPriceChange = useCallback((newPrice: number) => {
    setDemolitionUnitPrice(newPrice);
  }, []);
  
  // Handle trade selection - IMMEDIATELY SAVE TO DB!
  const handleTradeSelect = async (trade: string, customName?: string) => {
    setSelectedTrade(trade);
    if (trade === 'custom' && customName) {
      setCustomTradeName(customName);
    }
    
    const tradeLabelForAI = trade === 'custom' && customName ? customName : (TRADE_OPTIONS.find(t => t.key === trade)?.label || trade);
    generateAITemplate(trade, tradeLabelForAI);
    
    const tradeCitation = createCitation({
      cite_type: CITATION_TYPES.TRADE_SELECTION,
      question_key: 'trade_selection',
      answer: trade === 'custom' && customName ? customName : (TRADE_OPTIONS.find(t => t.key === trade)?.label || trade),
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
  
  // Lock template and proceed to Stage 4
  const handleLockTemplate = async () => {
    if (templateItems.length === 0) {
      toast.error("Add at least one item to the template");
      return;
    }
    
    const tradeCitation = createCitation({
      cite_type: CITATION_TYPES.TRADE_SELECTION,
      question_key: 'trade_selection',
      answer: selectedTrade === 'custom' && customTradeName ? customTradeName : (TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label || selectedTrade || ''),
      value: selectedTrade || '',
      metadata: { trade_key: selectedTrade, custom_trade_name: customTradeName },
    });
    
    const templateCitation = createCitation({
      cite_type: CITATION_TYPES.TEMPLATE_LOCK,
      question_key: 'template_items',
      answer: `${templateItems.length} items totaling $${subtotalWithMarkup.toLocaleString()}`,
      value: subtotalWithMarkup,
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
    
    try {
      const { data: currentData } = await supabase
        .from("project_summaries")
        .select("id, verified_facts")
        .eq("project_id", projectId)
        .maybeSingle();
      
      const currentFacts = Array.isArray(currentData?.verified_facts) ? currentData.verified_facts : [];
      const filteredFacts = (currentFacts as Record<string, unknown>[]).filter(
        (f) => f.cite_type !== CITATION_TYPES.TRADE_SELECTION && f.cite_type !== CITATION_TYPES.TEMPLATE_LOCK
      );
      const updatedFacts = [...filteredFacts, tradeCitation as unknown as Record<string, unknown>, templateCitation as unknown as Record<string, unknown>];
      
      if (currentData?.id) {
        await supabase
          .from("project_summaries")
          .update({
            verified_facts: updatedFacts as unknown as null,
            total_cost: subtotalWithMarkup,
            material_cost: materialTotal,
            labor_cost: laborTotal,
            template_items: templateItems as unknown as null,
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
            total_cost: subtotalWithMarkup,
            material_cost: materialTotal,
            labor_cost: laborTotal,
            template_items: templateItems as unknown as null,
          });
      }
      
      await supabase
        .from("projects")
        .update({ 
          trade: selectedTrade || '',
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);
      
      console.log("[DefinitionFlow] Trade & Template saved to DB immediately:", selectedTrade);
      
      // Save template document
      try {
        const materials = templateItems.filter(i => i.category === 'material');
        const labor = templateItems.filter(i => i.category === 'labor');
        const tradeName = selectedTrade === 'custom' && customTradeName ? customTradeName : (TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label || selectedTrade || 'Custom');
        const demolitionAmt = siteCondition === 'demolition' ? gfaValue * demolitionUnitPrice : 0;
        
        const documentSnapshot = {
          generated_at: new Date().toISOString(),
          trade: tradeName,
          gfa_sqft: gfaValue,
          waste_percent: wastePercent,
          markup_percent: markupPercent,
          demolition_cost: demolitionAmt,
          materials: materials.map(m => ({
            name: m.name, category: m.category, quantity: m.quantity, baseQuantity: m.baseQuantity,
            unit: m.unit, unitPrice: m.unitPrice, totalPrice: m.totalPrice, wasteApplied: m.applyWaste,
          })),
          labor: labor.map(l => ({
            name: l.name, category: l.category, quantity: l.quantity, unit: l.unit,
            unitPrice: l.unitPrice, totalPrice: l.totalPrice,
          })),
          summary: {
            material_total: materialTotal, labor_total: laborTotal, subtotal: subtotal,
            markup_amount: markupAmount, net_total: subtotalWithMarkup,
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
    }
    
    setFlowCitations([tradeCitation, templateCitation]);
    setTemplateLocked(true);
    setCurrentSubStep(1);
    toast.success("Template locked! Now let's plan the execution.");
  };
  
  // Stage 4 Step 1: Team size selection
  const handleTeamSizeSelect = (size: string) => {
    if (size === 'team') {
      setTeamSize(size);
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
    setCurrentSubStep(2);
  };
  
  // Handle team members change
  const handleTeamMembersChange = useCallback((members: TeamMember[]) => {
    setTeamMembers(members);
  }, []);
  
  // Stage 4 Step 2: Site condition change
  const handleSiteConditionChange = (condition: 'clear' | 'demolition') => {
    setSiteCondition(condition);
    if (condition === 'clear' && currentSubStep === 2) {
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
  
  // Confirm demolition
  const handleConfirmDemolition = () => {
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
  
  // Auto-transition to Stage 5 when Stage 4 is complete
  useEffect(() => {
    if (scheduledEndDate && templateLocked && !stage5Active && currentSubStep >= 3) {
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

      const hasEndDate = flowCitations.some(c => c.cite_type === CITATION_TYPES.END_DATE);
      if (!hasEndDate) {
        const endDateCitation = createCitation({
          cite_type: CITATION_TYPES.END_DATE,
          question_key: 'end_date',
          answer: format(scheduledEndDate, 'PPP'),
          value: scheduledEndDate.toISOString(),
          metadata: { end_date: scheduledEndDate.toISOString() },
        });
        setFlowCitations(prev => [...prev, endDateCitation]);
      }

      const timer = setTimeout(() => {
        setStage5Active(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [scheduledEndDate, templateLocked, stage5Active, currentSubStep, timeline, scheduledDate, flowCitations]);

  // Update TIMELINE citation when start date changes
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

  // Update END_DATE citation when end date changes
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
          mime_type: nf.file.type || (nf.type === 'blueprint' ? 'application/pdf' : 'image/jpeg'),
          uploaded_by: userId,
          uploaded_by_name: 'Owner',
          uploaded_by_role: 'owner',
        });

        const citationType = nf.type === 'blueprint'
          ? CITATION_TYPES.BLUEPRINT_UPLOAD
          : CITATION_TYPES.SITE_PHOTO;

        const citation = createCitation({
          cite_type: citationType,
          question_key: nf.type === 'blueprint' ? 'blueprint_upload' : 'site_photo_upload',
          answer: nf.name,
          value: urlData.publicUrl,
          metadata: {
            fileName: nf.name, file_name: nf.name, file_type: nf.type, file_path: filePath,
            storage_url: urlData.publicUrl, uploaded_at: new Date().toISOString(),
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
  }, [projectId, userId]);
  
  const handleRemoveFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);
  
  // Stage 4 Final: Lock the entire project
  const handleFinalLock = useCallback(async () => {
    setIsSaving(true);
    
    try {
      const hasSiteCitation = flowCitations.some(c => c.cite_type === CITATION_TYPES.SITE_CONDITION);
      const siteCitation = !hasSiteCitation ? createCitation({
        cite_type: CITATION_TYPES.SITE_CONDITION,
        question_key: 'site_condition',
        answer: siteCondition === 'clear' ? 'Clear Site' : 'Demolition Needed',
        value: siteCondition,
        metadata: { demolition_required: siteCondition === 'demolition', demolition_cost: demolitionCost },
      }) : null;
      
      const hasDemolitionCitation = flowCitations.some(c => c.cite_type === CITATION_TYPES.DEMOLITION_PRICE);
      const demolitionPriceCitation = (siteCondition === 'demolition' && !hasDemolitionCitation) ? createCitation({
        cite_type: CITATION_TYPES.DEMOLITION_PRICE,
        question_key: 'demolition_unit_price',
        answer: `$${demolitionUnitPrice.toFixed(2)}/sq ft`,
        value: demolitionUnitPrice,
        metadata: { unit_price: demolitionUnitPrice, total_cost: demolitionCost, gfa: gfaValue },
      }) : null;
      
      const hasTimelineCitation = flowCitations.some(c => c.cite_type === CITATION_TYPES.TIMELINE);
      const timelineCitation = !hasTimelineCitation ? createCitation({
        cite_type: CITATION_TYPES.TIMELINE,
        question_key: 'timeline',
        answer: timeline === 'asap' ? 'ASAP' : `Scheduled: ${scheduledDate ? format(scheduledDate, 'PPP') : 'TBD'}`,
        value: timeline,
        metadata: { start_date: timeline === 'asap' ? new Date().toISOString() : scheduledDate?.toISOString() },
      }) : null;
      
      const hasEndDateCitation = flowCitations.some(c => c.cite_type === CITATION_TYPES.END_DATE);
      const endDateCitation = (scheduledEndDate && !hasEndDateCitation) ? createCitation({
        cite_type: CITATION_TYPES.END_DATE,
        question_key: 'end_date',
        answer: format(scheduledEndDate, 'PPP'),
        value: scheduledEndDate.toISOString(),
        metadata: { end_date: scheduledEndDate.toISOString() },
      }) : null;
      
      const dnaCitation = createCitation({
        cite_type: CITATION_TYPES.DNA_FINALIZED,
        question_key: 'project_dna',
        answer: `Project DNA Locked: ${gfaValue.toLocaleString()} sq ft | $${subtotalWithMarkup.toLocaleString()} (net)`,
        value: {
          gfa: gfaValue, trade: selectedTrade, team_size: teamSize, site_condition: siteCondition,
          timeline: timeline, grand_total: subtotalWithMarkup,
          start_date: timeline === 'asap' ? new Date().toISOString() : scheduledDate?.toISOString(),
          end_date: scheduledEndDate?.toISOString(),
        },
        metadata: {
          finalized_at: new Date().toISOString(), template_items: templateItems,
          material_total: materialTotal, labor_total: laborTotal,
          demolition_cost: demolitionCost, demolition_unit_price: demolitionUnitPrice,
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
      
      const currentFacts = Array.isArray(currentData?.verified_facts) ? currentData.verified_facts : [];
      const updatedFacts = [...currentFacts, ...allCitations.map(c => c as unknown as Record<string, unknown>)];
      
      let error;
      if (currentData?.id) {
        const startDateValue = timeline === 'asap' ? new Date().toISOString().split('T')[0] : scheduledDate?.toISOString().split('T')[0] || null;
        const endDateValue = scheduledEndDate?.toISOString().split('T')[0] || null;
        
        const result = await supabase
          .from("project_summaries")
          .update({
            verified_facts: updatedFacts as unknown as null,
            total_cost: subtotalWithMarkup,
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
            total_cost: subtotalWithMarkup,
            material_cost: materialTotal,
            labor_cost: laborTotal,
            project_start_date: startDateValue,
            project_end_date: endDateValue,
          });
        error = result.error;
      }
      
      if (error) throw error;
      
      const tradeCitationFound = allCitations.find(c => c.cite_type === CITATION_TYPES.TRADE_SELECTION);
      if (tradeCitationFound) {
        const { error: tradeError } = await supabase
          .from("projects")
          .update({ 
            trade: tradeCitationFound.value as string,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId);
        
        if (tradeError) {
          console.error("[DefinitionFlow] Failed to update project trade:", tradeError);
        } else {
          console.log("[DefinitionFlow] Project trade updated to:", tradeCitationFound.value);
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
  }, [projectId, userId, flowCitations, siteCondition, timeline, scheduledDate, scheduledEndDate, templateItems, grandTotal, materialTotal, laborTotal, demolitionCost, demolitionUnitPrice, gfaValue, selectedTrade, teamSize, onFlowComplete, subtotalWithMarkup, markupAmount, subtotal, markupPercent, wastePercent, customTradeName]);
  
  const handleSkipUpload = useCallback(async () => {
    const skipCitation = createCitation({
      cite_type: CITATION_TYPES.VISUAL_VERIFICATION,
      question_key: 'visual_verification',
      answer: 'Skipped - No blueprints or site photos uploaded',
      value: 'skipped',
      metadata: {
        skipped: true,
        skipped_at: new Date().toISOString(),
        note: 'User skipped visual documentation upload. OBC compliance documents can still be added via Documents Table.',
      },
    });
    
    setFlowCitations(prev => [...prev, skipCitation]);
    await handleFinalLock();
  }, [handleFinalLock]);
  
  const handleConfirmUploads = useCallback(async () => {
    setIsUploading(true);
    
    try {
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
          mime_type: file.file.type || (file.type === 'blueprint' ? 'application/pdf' : 'image/jpeg'),
          uploaded_by: userId,
          uploaded_by_name: 'Owner',
          uploaded_by_role: 'owner',
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
            fileName: file.name, file_name: file.name, file_type: file.type, file_path: filePath,
            storage_url: urlData.publicUrl, uploaded_at: new Date().toISOString(),
            category: file.type === 'blueprint' ? 'technical' : 'visual',
          },
        });
        
        setFlowCitations(prev => [...prev, citation]);
        setUploadedFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, uploaded: true, storageUrl: urlData.publicUrl } : f
        ));
      }
      
      const verificationCitation = createCitation({
        cite_type: CITATION_TYPES.VISUAL_VERIFICATION,
        question_key: 'visual_verification',
        answer: `${uploadedFiles.length} document(s) uploaded`,
        value: {
          total_files: uploadedFiles.length,
          blueprints: uploadedFiles.filter(f => f.type === 'blueprint').length,
          photos: uploadedFiles.filter(f => f.type === 'site_photo').length,
        },
        metadata: { verified: true, verified_at: new Date().toISOString() },
      });
      
      setFlowCitations(prev => [...prev, verificationCitation]);
      
      toast.success(`${uploadedFiles.length} file(s) ready!`);
      await handleFinalLock();
      
    } catch (err) {
      console.error('[Stage5] Upload failed:', err);
      toast.error("Upload failed - please try again");
    } finally {
      setIsUploading(false);
    }
  }, [uploadedFiles, projectId, userId, handleFinalLock]);

  return {
    // State
    currentSubStep,
    isSaving,
    selectedTrade,
    customTradeName,
    isGeneratingTemplate,
    aiTemplateReady,
    templateLocked,
    templateItems,
    editingItem,
    wastePercent,
    markupPercent,
    teamSize,
    teamMembers,
    siteCondition,
    demolitionUnitPrice,
    timeline,
    scheduledDate,
    scheduledEndDate,
    stage5Active,
    uploadedFiles,
    isUploading,
    flowCitations,
    // Computed
    materialTotal,
    laborTotal,
    demolitionCost,
    subtotal,
    markupAmount,
    subtotalWithMarkup,
    taxAmount,
    grandTotal,
    // Handlers
    setEditingItem,
    setTimeline,
    setScheduledDate,
    setScheduledEndDate,
    handleWastePercentChange,
    handleMarkupPercentChange,
    handleDemolitionUnitPriceChange,
    handleTradeSelect,
    handleUpdateItem,
    handleDeleteItem,
    handleAddItem,
    handleLockTemplate,
    handleTeamSizeSelect,
    handleTeamMembersChange,
    handleSiteConditionChange,
    handleConfirmDemolition,
    handleFilesDrop,
    handleRemoveFile,
    handleSkipUpload,
    handleConfirmUploads,
  };
}
