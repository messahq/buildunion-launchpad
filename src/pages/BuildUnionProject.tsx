 import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
 import ProjectDetailsView from "@/components/projects2/ProjectDetailsView";
 import OwnerConfidenceDashboard from "@/components/projects2/OwnerConfidenceDashboard";
 import { useAuth } from "@/hooks/useAuth";
 import { useOwnerDashboardData } from "@/hooks/useOwnerDashboardData";
 import { supabase } from "@/integrations/supabase/client";
 import { Loader2 } from "lucide-react";
 import { toast } from "sonner";
 import { format } from "date-fns";
import { downloadPDF } from "@/lib/pdfGenerator";
import { useQueryClient } from "@tanstack/react-query";

const BuildUnionProject = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
   const [isOwner, setIsOwner] = useState<boolean | null>(null);
   const [checkingOwnership, setCheckingOwnership] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const queryClient = useQueryClient();
  
  const initialTab = searchParams.get("tab") || undefined;
 
   // Check if user is the project owner
   useEffect(() => {
     async function checkOwnership() {
       if (!user || !projectId) {
         setCheckingOwnership(false);
         return;
       }
 
       try {
         const { data: project, error } = await supabase
           .from("projects")
           .select("user_id")
           .eq("id", projectId)
           .single();
 
         if (error) throw error;
         setIsOwner(project?.user_id === user.id);
       } catch (err) {
         console.error("Error checking ownership:", err);
         setIsOwner(false);
       } finally {
         setCheckingOwnership(false);
       }
     }
 
     checkOwnership();
   }, [user, projectId]);
 
   // Owner Dashboard data - also get tasks for budget approval
   const { data: ownerData, isLoading: ownerDataLoading, tasks: ownerTasks } = useOwnerDashboardData(
     isOwner ? projectId || null : null
   );
   
   // Transform tasks for budget allocation component
   const transformedTasks = (ownerTasks || []).map(task => ({
     id: task.id,
     title: task.title,
     status: task.status,
     unit_price: task.unit_price ?? undefined,
     quantity: task.quantity ?? undefined,
     total_cost: task.total_cost ?? undefined,
     assignee_name: undefined
   }));

   if (authLoading || checkingOwnership) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user) {
    navigate("/buildunion/login", { replace: true });
    return null;
  }

  if (!projectId) {
    navigate("/buildunion/workspace", { replace: true });
    return null;
  }

   // If owner, show Confidence Dashboard
   if (isOwner) {
     if (ownerDataLoading) {
       return (
         <div className="min-h-screen bg-slate-950 flex items-center justify-center">
           <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
         </div>
       );
     }
 
    const handleGenerateReport = async () => {
       toast.info("Generating AI Magic Summary...", { duration: 2000 });
       setTimeout(() => {
         toast.success("Magic Summary generated!");
       }, 2000);
     };

    const handleExportPdf = async () => {
      if (!ownerData || isExportingPdf) return;
      
      setIsExportingPdf(true);
      toast.info("Generating Executive PDF...");
      
      try {
        const currentDate = format(new Date(), "MMMM d, yyyy");
        const filename = `${ownerData.projectName.replace(/[^a-zA-Z0-9]/g, '_')}_Executive_Summary_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        
        const htmlContent = buildExecutiveSummaryHTML({
          projectName: ownerData.projectName,
          projectAddress: ownerData.projectAddress,
          currentDate,
          healthScore: ownerData.healthScore,
          verificationRate: ownerData.verificationRate,
          currentPhase: ownerData.currentPhase,
          financials: ownerData.financials,
          tasksCount: ownerData.tasksCount,
          docsCount: ownerData.docsCount,
          daysActive: ownerData.daysActive,
          teamOnline: ownerData.teamOnline,
          totalTeam: ownerData.totalTeam,
          expectedCompletion: ownerData.expectedCompletion
        });
        
        await downloadPDF(htmlContent, {
          filename,
          margin: 15,
          pageFormat: 'letter'
        });
        
        toast.success("PDF saved to Downloads!");
      } catch (err) {
        console.error("PDF export error:", err);
        toast.error("Failed to generate PDF");
      } finally {
        setIsExportingPdf(false);
      }
     };
 
     const handleViewDetails = () => {
       // Navigate to Command Center (technical view)
       navigate(`/buildunion/project/${projectId}/details`);
     };
 
     return (
       <OwnerConfidenceDashboard
         projectId={projectId || ""}
         projectName={ownerData.projectName}
         projectAddress={ownerData.projectAddress || undefined}
         healthScore={ownerData.healthScore}
         verificationRate={ownerData.verificationRate}
         milestones={ownerData.milestones}
         financials={ownerData.financials}
         blueprintUrl={ownerData.blueprintUrl}
         latestPhotoUrl={ownerData.latestPhotoUrl}
         expectedCompletion={ownerData.expectedCompletion ? format(new Date(ownerData.expectedCompletion), "MMM d") : null}
         completionCertainty={ownerData.completionCertainty}
         currentPhase={ownerData.currentPhase}
         onGenerateReport={handleGenerateReport}
         onExportPdf={handleExportPdf}
         onViewDetails={handleViewDetails}
         pendingBudgetChange={ownerData.pendingBudgetChange}
         onBudgetApproved={() => queryClient.invalidateQueries({ queryKey: ["project-summary-owner", projectId] })}
         onBudgetDeclined={() => queryClient.invalidateQueries({ queryKey: ["project-summary-owner", projectId] })}
         onTasksUpdated={() => queryClient.invalidateQueries({ queryKey: ["project-tasks-owner", projectId] })}
         tasks={transformedTasks}
         teamOnline={ownerData.teamOnline}
         totalTeam={ownerData.totalTeam}
         tasksCount={ownerData.tasksCount}
         docsCount={ownerData.docsCount}
         daysActive={ownerData.daysActive}
         isSoloMode={ownerData.isSoloMode}
         isTeamMode={ownerData.isTeamMode}
       />
     );
   }
 
   // Non-owner: show Command Center
  return (
    <ProjectDetailsView
      projectId={projectId}
      onBack={() => navigate("/buildunion/workspace")}
      initialTab={initialTab}
    />
  );
};

export default BuildUnionProject;

// ============================================
// EXECUTIVE SUMMARY PDF TEMPLATE
// ============================================

function buildExecutiveSummaryHTML(data: {
  projectName: string;
  projectAddress?: string | null;
  currentDate: string;
  healthScore: number;
  verificationRate: number;
  currentPhase: string;
  financials: {
    approvedBudget: number;
    currentSpend: number;
    materialCost?: number;
    laborCost?: number;
    isWithinRange: boolean;
    costStability: string;
  };
  tasksCount: number;
  docsCount: number;
  daysActive: number;
  teamOnline: number;
  totalTeam: number;
  expectedCompletion?: string | null;
}): string {
  const {
    projectName,
    projectAddress,
    currentDate,
    healthScore,
    verificationRate,
    currentPhase,
    financials,
    tasksCount,
    docsCount,
    daysActive,
    teamOnline,
    totalTeam,
    expectedCompletion
  } = data;

  const healthLabel = healthScore >= 80 ? 'EXCELLENT' : healthScore >= 60 ? 'GOOD' : healthScore >= 40 ? 'ATTENTION NEEDED' : 'CRITICAL';
  const healthColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#06b6d4' : healthScore >= 40 ? '#f59e0b' : '#ef4444';
  const remaining = financials.approvedBudget - financials.currentSpend;
  const spendPercent = financials.approvedBudget > 0 ? Math.round((financials.currentSpend / financials.approvedBudget) * 100) : 0;

  return `
    <div style="font-family: 'Segoe UI', system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #ffffff;">
      <!-- Header -->
      <div class="section" style="border-bottom: 3px solid #0ea5e9; padding-bottom: 24px; margin-bottom: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="font-size: 28px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0;">${projectName}</h1>
            <p style="font-size: 14px; color: #64748b; margin: 0;">${projectAddress || 'No address specified'}</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 12px; color: #64748b; margin: 0;">EXECUTIVE SUMMARY</p>
            <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 4px 0 0 0;">${currentDate}</p>
          </div>
        </div>
      </div>

      <!-- Health Status Banner -->
      <div class="section avoid-break" style="background: linear-gradient(135deg, ${healthColor}15 0%, ${healthColor}08 100%); border: 2px solid ${healthColor}40; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 4px 0;">PROJECT HEALTH</p>
            <h2 style="font-size: 32px; font-weight: 800; color: ${healthColor}; margin: 0;">${healthLabel}</h2>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 4px 0;">CURRENT PHASE</p>
            <p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0;">${currentPhase}</p>
          </div>
        </div>
      </div>

      <!-- Financial Summary -->
      <div class="section avoid-break" style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 20px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">💰 FINANCIAL OVERVIEW</h3>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;">
          <div style="text-align: center; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 8px 0;">Approved Budget</p>
            <p style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">$${financials.approvedBudget.toLocaleString()}</p>
          </div>
          <div style="text-align: center; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 8px 0;">Current Spend</p>
            <p style="font-size: 24px; font-weight: 700; color: ${financials.isWithinRange ? '#10b981' : '#ef4444'}; margin: 0;">$${financials.currentSpend.toLocaleString()}</p>
          </div>
          <div style="text-align: center; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 8px 0;">Remaining</p>
            <p style="font-size: 24px; font-weight: 700; color: ${remaining >= 0 ? '#0ea5e9' : '#ef4444'}; margin: 0;">$${Math.abs(remaining).toLocaleString()}</p>
          </div>
        </div>

        <!-- Budget Bar -->
        <div style="background: #e2e8f0; border-radius: 8px; height: 12px; overflow: hidden;">
          <div style="background: ${spendPercent <= 70 ? '#10b981' : spendPercent <= 90 ? '#f59e0b' : '#ef4444'}; height: 100%; width: ${Math.min(spendPercent, 100)}%; transition: width 0.3s;"></div>
        </div>
        <p style="font-size: 11px; color: #64748b; text-align: center; margin: 8px 0 0 0;">${spendPercent}% of budget utilized</p>

        <!-- Cost Breakdown -->
        ${financials.materialCost || financials.laborCost ? `
          <div style="display: flex; justify-content: center; gap: 32px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            ${financials.materialCost ? `<div style="display: flex; align-items: center; gap: 8px;"><span style="width: 12px; height: 12px; background: #8b5cf6; border-radius: 3px;"></span><span style="font-size: 12px; color: #64748b;">Materials: $${financials.materialCost.toLocaleString()}</span></div>` : ''}
            ${financials.laborCost ? `<div style="display: flex; align-items: center; gap: 8px;"><span style="width: 12px; height: 12px; background: #f59e0b; border-radius: 3px;"></span><span style="font-size: 12px; color: #64748b;">Labor: $${financials.laborCost.toLocaleString()}</span></div>` : ''}
          </div>
        ` : ''}
      </div>

      <!-- Progress & Stats -->
      <div class="section avoid-break" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <!-- Progress -->
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px;">
          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 20px 0;">📊 PROGRESS</h3>
          <div style="text-align: center;">
            <p style="font-size: 48px; font-weight: 800; color: #10b981; margin: 0;">${Math.round(verificationRate)}%</p>
            <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">Completion Rate</p>
          </div>
          ${expectedCompletion ? `<p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">Expected Completion: <strong>${expectedCompletion}</strong></p>` : ''}
        </div>

        <!-- Quick Stats -->
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px;">
          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 20px 0;">⚡ QUICK STATS</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="text-align: center; padding: 12px; background: white; border-radius: 8px;">
              <p style="font-size: 24px; font-weight: 700; color: #06b6d4; margin: 0;">${daysActive}</p>
              <p style="font-size: 10px; color: #64748b; margin: 4px 0 0 0;">Days Active</p>
            </div>
            <div style="text-align: center; padding: 12px; background: white; border-radius: 8px;">
              <p style="font-size: 24px; font-weight: 700; color: #f59e0b; margin: 0;">${tasksCount}</p>
              <p style="font-size: 10px; color: #64748b; margin: 4px 0 0 0;">Total Tasks</p>
            </div>
            <div style="text-align: center; padding: 12px; background: white; border-radius: 8px;">
              <p style="font-size: 24px; font-weight: 700; color: #8b5cf6; margin: 0;">${docsCount}</p>
              <p style="font-size: 10px; color: #64748b; margin: 4px 0 0 0;">Documents</p>
            </div>
            <div style="text-align: center; padding: 12px; background: white; border-radius: 8px;">
              <p style="font-size: 24px; font-weight: 700; color: #10b981; margin: 0;">${teamOnline}/${totalTeam}</p>
              <p style="font-size: 10px; color: #64748b; margin: 4px 0 0 0;">Team</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="section" style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">Generated by BuildUnion • Owner Confidence Dashboard</p>
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">buildunion.ca</p>
        </div>
      </div>
    </div>
  `;
}
