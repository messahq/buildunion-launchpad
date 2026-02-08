import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { buildOperationalTruth, type OperationalTruth } from "@/types/operationalTruth";

interface Milestone {
  id: string;
  name: string;
  status: "completed" | "current" | "upcoming";
  date?: string;
}

interface FinancialSummary {
  approvedBudget: number;
  currentSpend: number;
  remainingBudget: number;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  materialCost: number;
  laborCost: number;
  remainingLaborCost: number;
  otherCost: number;
  remainingOtherCost: number;
  tasksCost: number;
  plannedTasksCost: number;
  completedWorkValue: number;
  progressPercent: number;
  isProjectComplete: boolean;
  isWithinRange: boolean;
  hasUnexpectedCosts: boolean;
  costStability: "stable" | "warning" | "critical";
  budgetVersion?: 'initial' | 'change_order';
  budgetUpdatedAt?: string;
}

// Photo Estimate structure from AI analysis
interface PhotoEstimate {
  area?: number;
  areaUnit?: string;
  materials?: Array<{ item: string; quantity: number; unit: string }>;
  confidence?: string;
}

// Blueprint Analysis structure
interface BlueprintAnalysis {
  analyzed?: boolean;
  totalArea?: number;
}

interface OwnerDashboardData {
  healthScore: number;
  verificationRate: number;
  milestones: Milestone[];
  financials: FinancialSummary;
  blueprintUrl: string | null;
  latestPhotoUrl: string | null;
  expectedCompletion: string | null;
  completionCertainty: number;
  currentPhase: string;
  projectName: string;
  projectAddress: string | null;
  teamOnline: number;
  totalTeam: number;
  tasksCount: number;
  docsCount: number;
  daysActive: number;
  budgetStatus: 'initial' | 'change_order' | 'none';
  budgetLastUpdated: string | null;
  pendingBudgetChange: {
    submittedBy: string;
    submittedByName?: string;
    submittedAt: string;
    proposedGrandTotal: number;
    previousGrandTotal: number;
    proposedLineItems?: {
      materials?: Array<{ item: string; totalPrice: number }>;
      labor?: Array<{ item: string; totalPrice: number }>;
      other?: Array<{ item: string; totalPrice: number }>;
    };
    reason?: string;
    status: 'pending' | 'approved' | 'declined';
  } | null;
  // Project mode from AI analysis
  mode: 'solo' | 'team';
  isSoloMode: boolean;
  isTeamMode: boolean;
  // Truth Matrix data
  operationalTruth: OperationalTruth | null;
  verifiedFacts: Record<string, unknown> | null;
  photoEstimate: PhotoEstimate | null;
  blueprintAnalysisData: BlueprintAnalysis | null;
}
 
 export function useOwnerDashboardData(projectId: string | null) {
   // Fetch project data
   const { data: project } = useQuery({
     queryKey: ["project-owner-view", projectId],
     queryFn: async () => {
       if (!projectId) return null;
       const { data, error } = await supabase
         .from("projects")
         .select("*")
         .eq("id", projectId)
         .single();
       if (error) throw error;
       return data;
     },
     enabled: !!projectId,
   });
 
   // Fetch summary data
   const { data: summary } = useQuery({
     queryKey: ["project-summary-owner", projectId],
     queryFn: async () => {
       if (!projectId) return null;
       const { data, error } = await supabase
         .from("project_summaries")
         .select("*")
         .eq("project_id", projectId)
         .maybeSingle();
       if (error) throw error;
       return data;
     },
     enabled: !!projectId,
   });
 
    // Fetch tasks for progress with assignee names
    const { data: tasks } = useQuery({
      queryKey: ["project-tasks-owner", projectId],
      queryFn: async () => {
        if (!projectId) return [];
        const { data, error } = await supabase
          .from("project_tasks")
          .select("*")
          .eq("project_id", projectId)
          .is("archived_at", null);
        if (error) throw error;
        
        // Fetch assignee names from profiles
        if (data && data.length > 0) {
          const assigneeIds = [...new Set(data.map(t => t.assigned_to).filter(Boolean))];
          if (assigneeIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name")
              .in("user_id", assigneeIds);
            
            const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
            
            return data.map(task => ({
              ...task,
              assignee_name: profileMap.get(task.assigned_to) || null
            }));
          }
        }
        
        return data || [];
      },
      enabled: !!projectId,
    });
 
   // Fetch documents for blueprint
   const { data: documents } = useQuery({
     queryKey: ["project-docs-owner", projectId],
     queryFn: async () => {
       if (!projectId) return [];
       const { data, error } = await supabase
         .from("project_documents")
         .select("*")
         .eq("project_id", projectId);
       if (error) throw error;
       return data || [];
     },
     enabled: !!projectId,
   });
 
  // Fetch team members
  const { data: teamMembers } = useQuery({
    queryKey: ["project-team-owner", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

   // Calculate dashboard data
   const dashboardData = useMemo<OwnerDashboardData>(() => {
     // Calculate task completion
     const totalTasks = tasks?.length || 0;
     const completedTasks = tasks?.filter(t => t.status === "completed").length || 0;
     const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
 
      // Extract financials from summary - prefer line_items over direct fields
      const totalCost = summary?.total_cost || 0;
      
      // ===== AI WORKFLOW CONFIG - Budget Version Tracking =====
      const aiConfig = summary?.ai_workflow_config as {
        budgetVersion?: 'initial' | 'change_order';
        budgetUpdatedAt?: string;
        grandTotal?: number;
        latestBudgetDocId?: string;
        userEdits?: { wastePercent?: number };
        pendingBudgetChange?: {
          submittedBy: string;
          submittedByName?: string;
          submittedAt: string;
          proposedGrandTotal: number;
          previousGrandTotal: number;
          proposedLineItems?: {
            materials?: Array<{ item: string; totalPrice: number }>;
            labor?: Array<{ item: string; totalPrice: number }>;
            other?: Array<{ item: string; totalPrice: number }>;
          };
          reason?: string;
          status: 'pending' | 'approved' | 'declined';
        };
      } | null;
      
      // Get waste percent from config or default to 10%
      const wastePercent = aiConfig?.userEdits?.wastePercent ?? 10;
      
      // Parse line_items JSON to get actual material/labor costs
      const lineItems = summary?.line_items as {
        materials?: Array<{ 
          totalPrice?: number;
          quantity?: number;
          baseQuantity?: number;
          unitPrice?: number;
          isEssential?: boolean;
          item?: string;
        }>;
        labor?: Array<{ totalPrice?: number }>;
        other?: Array<{ totalPrice?: number }>;
      } | null;
      
      // ===== IRON LAW #1: Materials Total MUST use GROSS (with waste) =====
      // For essential materials, calculate GROSS = baseQty × (1 + waste%) × unitPrice
      const calculatedMaterialCost = lineItems?.materials?.reduce((sum, item) => {
        const baseQty = item.baseQuantity ?? item.quantity ?? 0;
        const unitPrice = item.unitPrice ?? 0;
        const isEssential = item.isEssential !== false;
        
        // Calculate GROSS quantity with waste for essential materials
        const grossQty = isEssential 
          ? Math.ceil(baseQty * (1 + wastePercent / 100))
          : baseQty;
        
        // Use dynamically calculated GROSS price if we have unitPrice
        // Otherwise fall back to stored totalPrice (which should already be GROSS)
        const grossTotalPrice = unitPrice > 0 ? grossQty * unitPrice : (Number(item.totalPrice) || 0);
        
        return sum + grossTotalPrice;
      }, 0) || 0;
      
      const calculatedLaborCost = lineItems?.labor?.reduce(
        (sum, item) => sum + (Number(item.totalPrice) || 0), 0
      ) || 0;
      const calculatedOtherCost = lineItems?.other?.reduce(
        (sum, item) => sum + (Number(item.totalPrice) || 0), 0
      ) || 0;
      
      const budgetVersion = aiConfig?.budgetVersion || 'initial';
      const budgetUpdatedAt = aiConfig?.budgetUpdatedAt || null;
      const pendingBudgetChange = aiConfig?.pendingBudgetChange || null;
      
      // If ai_workflow_config has a grandTotal, prefer it (most recent budget)
      const aiConfigGrandTotal = aiConfig?.grandTotal || 0;
      
      // Use calculated GROSS values if available, otherwise fall back to summary fields
      const materialCost = calculatedMaterialCost > 0 ? calculatedMaterialCost : (summary?.material_cost || 0);
      const laborCost = calculatedLaborCost > 0 ? calculatedLaborCost : (summary?.labor_cost || 0);
      const otherCost = calculatedOtherCost;

    // Current Spend = only COMPLETED tasks (realized expenditures)
    const completedTasksCost = tasks?.filter(t => t.status === 'completed')
      .reduce((sum, task) => sum + (Number(task.total_cost) || 0), 0) || 0;

    // Total planned task costs (for reference/budget planning)
    // Calculate task cost: prefer total_cost, fallback to unit_price * quantity
    const allTasksCost = tasks?.reduce((sum, task) => {
      const taskCost = Number(task.total_cost) || 
        (Number(task.unit_price) || 0) * (Number(task.quantity) || 1);
      return sum + taskCost;
    }, 0) || 0;

    // Same calculation for completed tasks
    const completedTasksCostCalculated = tasks?.filter(t => t.status === 'completed')
      .reduce((sum, task) => {
        const taskCost = Number(task.total_cost) || 
          (Number(task.unit_price) || 0) * (Number(task.quantity) || 1);
        return sum + taskCost;
      }, 0) || 0;

    // ===== FINANCIAL LOGIC FIX =====
    // ===== DYNAMIC FINANCIAL LOGIC =====
    // Calculate progress percentage based on completed tasks value OR count
    const progressPercent = allTasksCost > 0 
      ? Math.min(100, (completedTasksCostCalculated / allTasksCost) * 100)
      : (tasks && tasks.length > 0 
          ? Math.min(100, ((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100))
          : 0);
    
    // Progress ratio for proportional calculations (0-1)
    const progressRatio = progressPercent / 100;
    
    // Labor and Others costs move from Remaining to Current Spend proportionally with progress
    // At 0% progress: 0% of Labor/Others in Current Spend
    // At 50% progress: 50% of Labor/Others in Current Spend  
    // At 100% progress: 100% of Labor/Others in Current Spend
    const realizedLaborCost = laborCost * progressRatio;
    const realizedOtherCost = otherCost * progressRatio;
    
    // Remaining Labor/Others = what's left in the "budget" (Plan vs Execution)
    // These decrease as work is completed
    const remainingLaborCost = laborCost * (1 - progressRatio);
    const remainingOtherCost = otherCost * (1 - progressRatio);
    
    // Completed Work Value = ALL realized work (labor + others + explicit tasks)
    // This is what shows in "Completed Tasks" - the actual value of work done
    const completedWorkValue = realizedLaborCost + realizedOtherCost + completedTasksCostCalculated;
    
    // Current Spend = Materials (purchased) + Completed Tasks + Proportional Labor/Others
    const calculatedCurrentSpend = materialCost + completedTasksCostCalculated + realizedLaborCost + realizedOtherCost;

    // Full project budget = all costs combined
    // Net subtotal (before tax)
    const subtotal = materialCost + laborCost + otherCost + allTasksCost;
    
    // ===== TAX INTEGRATION (HST 13%) =====
    const taxRate = 0.13; // Ontario HST
    const taxAmount = subtotal * taxRate;
    
    // Grand Total (Gross = Net + Tax) - matches PDF
    const grandTotal = subtotal + taxAmount;
    
    // Approved Budget = Grand Total (bruttó) to match PDF
     // Priority: 1) AI Config grandTotal (latest budget), 2) total_cost from DB, 3) calculated grandTotal
     const approvedBudget = aiConfigGrandTotal > 0
       ? aiConfigGrandTotal
       : totalCost > 0 && totalCost >= grandTotal
      ? totalCost
      : grandTotal > 0
        ? grandTotal
        : 25000; // Minimum default
    
    // Current Spend also needs to include proportional tax
    // As costs are realized, their tax portion is also realized
    const realizedSubtotal = materialCost + completedTasksCostCalculated + realizedLaborCost + realizedOtherCost;
    const realizedTax = realizedSubtotal * taxRate;
    const calculatedCurrentSpendGross = realizedSubtotal + realizedTax;
    
    // ===== 100% COMPLETION SYNC =====
    // When progress reaches 100%, force Remaining to $0
    // This ensures Current Spend === Approved Budget at completion
    const isProjectComplete = progressPercent >= 100;
    const currentSpend = isProjectComplete ? approvedBudget : calculatedCurrentSpendGross;
    const remainingBudget = isProjectComplete ? 0 : Math.max(0, approvedBudget - calculatedCurrentSpendGross);

     // Calculate health score (simplified)
     let healthScore = 50;
     if (taskProgress >= 50) healthScore += 20;
     if (currentSpend <= approvedBudget * 0.8) healthScore += 15;
     if (summary?.baseline_locked_at) healthScore += 10;
     if (documents && documents.length > 0) healthScore += 5;
     healthScore = Math.min(100, healthScore);
 
     // Build milestones from phases
     const phases = ["Planning", "Preparation", "Execution", "Verification", "Completion"];
     const currentPhaseIndex = Math.floor(taskProgress / 25);
     const milestones: Milestone[] = phases.map((phase, index) => ({
       id: `phase-${index}`,
       name: phase,
       status: index < currentPhaseIndex ? "completed" : index === currentPhaseIndex ? "current" : "upcoming"
     }));
 
     // Get blueprint URL
     const blueprintDoc = documents?.find(d => 
       d.file_name.toLowerCase().includes("blueprint") || 
       d.file_name.toLowerCase().includes("plan") ||
       d.file_name.toLowerCase().endsWith(".pdf")
     );
 
     // Get latest photo from site_images
     const siteImages = project?.site_images as string[] | null;
     const latestPhotoUrl = siteImages && siteImages.length > 0 ? siteImages[siteImages.length - 1] : null;
 
     // Expected completion from summary dates
     const expectedCompletion = summary?.project_end_date || null;
     const completionCertainty = Math.round(60 + taskProgress * 0.32);
 
     // Determine current phase name
     const currentPhase = phases[currentPhaseIndex] || "Planning";
 
    // Calculate days active since project creation
    const projectCreatedAt = project?.created_at ? new Date(project.created_at) : new Date();
    const daysActive = Math.max(1, differenceInDays(new Date(), projectCreatedAt));

    // Project mode from summary
    const projectMode = (summary?.mode === 'team' ? 'team' : 'solo') as 'solo' | 'team';
    const isSoloMode = projectMode === 'solo';
    const isTeamMode = projectMode === 'team';

    // Team stats - owner + members (only relevant for Team Mode)
    const totalTeam = isTeamMode ? (teamMembers?.length || 0) + 1 : 1; // Solo = just owner
    const teamOnline = isTeamMode ? Math.min(totalTeam, Math.ceil(totalTeam * 0.6)) : 1; // Solo = 1 (you)

    // ===== TRUTH MATRIX DATA =====
    // Extract photo_estimate from summary
    const photoEstimate = summary?.photo_estimate as PhotoEstimate | null;
    
    // Extract blueprint_analysis from summary
    const blueprintAnalysisData = summary?.blueprint_analysis as BlueprintAnalysis | null;
    
    // Extract verified_facts from summary
    const verifiedFacts = (summary?.verified_facts || {}) as Record<string, unknown>;
    
    // Build Operational Truth using the centralized function
    const operationalTruth = buildOperationalTruth({
      aiAnalysis: photoEstimate ? {
        area: photoEstimate.area || null,
        areaUnit: photoEstimate.areaUnit || 'sq ft',
        materials: photoEstimate.materials || [],
        hasBlueprint: blueprintAnalysisData?.analyzed || false,
        confidence: photoEstimate.confidence || 'low',
      } : undefined,
      blueprintAnalysis: blueprintAnalysisData ? {
        analyzed: blueprintAnalysisData.analyzed || false,
      } : undefined,
      filterAnswers: {
        workflowFilter: {
          subcontractorCount: isTeamMode ? '3+' : '1-2',
        },
      },
      projectSize: totalCost > 50000 ? 'large' : totalCost > 10000 ? 'medium' : 'small',
      obcAcknowledged: verifiedFacts.obcAcknowledged === true,
    });

     return {
       healthScore,
       verificationRate: taskProgress,
       milestones,
       financials: {
         approvedBudget,
         currentSpend,
          remainingBudget,
         subtotal,
         taxAmount,
         taxRate,
          materialCost,
          laborCost,
         remainingLaborCost,
          otherCost,
         remainingOtherCost,
          tasksCost: completedTasksCostCalculated,
          plannedTasksCost: allTasksCost,
         completedWorkValue,
          progressPercent: Math.round(progressPercent),
          isProjectComplete,
          isWithinRange: currentSpend <= approvedBudget,
          // When project is complete, only show warning if OVER budget (not just near 90%)
          // During project, warn if approaching budget threshold
          hasUnexpectedCosts: isProjectComplete 
            ? currentSpend > approvedBudget  // Only if overspent at completion
            : currentSpend > approvedBudget * 0.9,  // Warning threshold during project
          // Cost stability: if complete and within budget = stable
          costStability: isProjectComplete && currentSpend <= approvedBudget 
            ? "stable" 
            : currentSpend <= approvedBudget * 0.7 ? "stable" : 
              currentSpend <= approvedBudget * 0.9 ? "warning" : "critical"
          ,budgetVersion,
          budgetUpdatedAt,
       },
       blueprintUrl: blueprintDoc?.file_path || null,
       latestPhotoUrl,
       expectedCompletion,
       completionCertainty,
       currentPhase,
       projectName: project?.name || "Project",
      projectAddress: project?.address || null,
      teamOnline,
      totalTeam,
      tasksCount: totalTasks,
      docsCount: documents?.length || 0,
       daysActive,
      budgetStatus: aiConfig?.budgetVersion || 'none',
      budgetLastUpdated: budgetUpdatedAt,
      pendingBudgetChange,
      mode: projectMode,
      isSoloMode,
      isTeamMode,
      // Truth Matrix data
      operationalTruth,
      verifiedFacts,
      photoEstimate,
      blueprintAnalysisData,
     };
  }, [project, summary, tasks, documents, teamMembers]);
 
   return {
     data: dashboardData,
     isLoading: !project && !!projectId,
     project,
     summary,
     tasks: tasks || []
   };
 }