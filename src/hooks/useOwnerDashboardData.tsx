 import { useMemo } from "react";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
 
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
  otherCost: number;
  tasksCost: number;
  plannedTasksCost: number;
  progressPercent: number;
  isProjectComplete: boolean;
   isWithinRange: boolean;
   hasUnexpectedCosts: boolean;
   costStability: "stable" | "warning" | "critical";
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
 
   // Fetch tasks for progress
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
     
     // Parse line_items JSON to get actual material/labor costs
     const lineItems = summary?.line_items as {
       materials?: Array<{ totalPrice?: number }>;
       labor?: Array<{ totalPrice?: number }>;
       other?: Array<{ totalPrice?: number }>;
     } | null;
     
     // Calculate actual costs from line_items (Materials tab data)
     const calculatedMaterialCost = lineItems?.materials?.reduce(
       (sum, item) => sum + (Number(item.totalPrice) || 0), 0
     ) || 0;
     const calculatedLaborCost = lineItems?.labor?.reduce(
       (sum, item) => sum + (Number(item.totalPrice) || 0), 0
     ) || 0;
     const calculatedOtherCost = lineItems?.other?.reduce(
       (sum, item) => sum + (Number(item.totalPrice) || 0), 0
     ) || 0;
     
     // Use calculated values if available, otherwise fall back to summary fields
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
    // If total_cost from DB is set and >= grandTotal, use it; otherwise use grandTotal
    const approvedBudget = totalCost > 0 && totalCost >= grandTotal
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

    // Team stats - owner + members
    const totalTeam = (teamMembers?.length || 0) + 1; // +1 for owner
    const teamOnline = Math.min(totalTeam, Math.ceil(totalTeam * 0.6)); // Simulate ~60% online

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
          otherCost,
          tasksCost: completedTasksCostCalculated,
          plannedTasksCost: allTasksCost,
          progressPercent: Math.round(progressPercent),
          isProjectComplete,
          isWithinRange: currentSpend <= approvedBudget,
          hasUnexpectedCosts: currentSpend > approvedBudget * 0.9,
          costStability: currentSpend <= approvedBudget * 0.7 ? "stable" : 
                         currentSpend <= approvedBudget * 0.9 ? "warning" : "critical"
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
      daysActive
     };
  }, [project, summary, tasks, documents, teamMembers]);
 
   return {
     data: dashboardData,
     isLoading: !project && !!projectId,
     project,
     summary
   };
 }