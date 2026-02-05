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
 
     // Extract financials from summary
     const totalCost = summary?.total_cost || 0;
     const materialCost = summary?.material_cost || 0;
     const laborCost = summary?.labor_cost || 0;
     const currentSpend = materialCost + laborCost;
     const approvedBudget = totalCost > 0 ? totalCost : 50000; // Default budget
 
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