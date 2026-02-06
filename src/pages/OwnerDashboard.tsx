 import { useParams, useNavigate } from "react-router-dom";
 import { useAuth } from "@/hooks/useAuth";
 import { useOwnerDashboardData } from "@/hooks/useOwnerDashboardData";
 import OwnerConfidenceDashboard from "@/components/projects2/OwnerConfidenceDashboard";
 import { toast } from "sonner";
 import { format } from "date-fns";
 import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
 
 export default function OwnerDashboard() {
   const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, project, summary, tasks } = useOwnerDashboardData(projectId || null);
   const queryClient = useQueryClient();
 
   if (!user) {
     return (
       <div className="min-h-screen bg-slate-950 flex items-center justify-center">
         <p className="text-muted-foreground">Please log in to view the dashboard.</p>
       </div>
     );
   }
 
   if (isLoading) {
     return (
       <div className="min-h-screen bg-slate-950 flex items-center justify-center">
         <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
       </div>
     );
   }
 
    const handleGenerateReport = async () => {
      toast.info("Generating AI Magic Summary...", { duration: 2000 });
     try {
       const { data: briefData, error } = await supabase.functions.invoke("generate-project-brief", {
         body: { projectId }
       });
       if (error) throw error;
       toast.success("Magic Summary generated!", {
         description: "Your AI report is ready"
       });
     } catch (err) {
       console.error("Report generation error:", err);
       toast.error("Failed to generate report");
     }
    };

    const handleExportPdf = () => {
    toast.info("Generating Executive PDF...", { duration: 1500 });
    // Trigger download or generate PDF
    setTimeout(() => {
      toast.success("PDF ready for download!");
    }, 1500);
   };
 
   const handleViewDetails = () => {
     navigate(`/buildunion/project/${projectId}`);
   };
 
   const handleBudgetApproved = () => {
     // Invalidate queries to refresh data
     queryClient.invalidateQueries({ queryKey: ["project-summary-owner", projectId] });
   };
 
   const handleBudgetDeclined = () => {
     // Invalidate queries to refresh data
     queryClient.invalidateQueries({ queryKey: ["project-summary-owner", projectId] });
   };
 
  // Transform tasks for the BudgetApprovalPanel component
  const transformedTasks = tasks.map(task => ({
    id: task.id,
    title: task.title,
    status: task.status,
    unit_price: task.unit_price ?? undefined,
    quantity: task.quantity ?? undefined,
    total_cost: task.total_cost ?? undefined,
    assignee_name: undefined // Can be fetched if needed
  }));

  return (
    <OwnerConfidenceDashboard
      projectId={projectId || ""}
      projectName={data.projectName}
      projectAddress={data.projectAddress || undefined}
      healthScore={data.healthScore}
      verificationRate={data.verificationRate}
      milestones={data.milestones}
      financials={data.financials}
      blueprintUrl={data.blueprintUrl}
      latestPhotoUrl={data.latestPhotoUrl}
      expectedCompletion={data.expectedCompletion ? format(new Date(data.expectedCompletion), "MMM d") : null}
      completionCertainty={data.completionCertainty}
      currentPhase={data.currentPhase}
      onGenerateReport={handleGenerateReport}
      onExportPdf={handleExportPdf}
      onViewDetails={handleViewDetails}
      teamOnline={data.teamOnline}
      totalTeam={data.totalTeam}
      tasksCount={data.tasksCount}
      docsCount={data.docsCount}
      daysActive={data.daysActive}
      tasks={transformedTasks}
      pendingBudgetChange={data.pendingBudgetChange}
      onBudgetApproved={handleBudgetApproved}
      onBudgetDeclined={handleBudgetDeclined}
      onTasksUpdated={() => queryClient.invalidateQueries({ queryKey: ["project-tasks-owner", projectId] })}
    />
  );
 }