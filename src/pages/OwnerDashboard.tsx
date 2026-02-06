import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerDashboardData } from "@/hooks/useOwnerDashboardData";
import OwnerConfidenceDashboard from "@/components/projects2/OwnerConfidenceDashboard";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function OwnerDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, tasks } = useOwnerDashboardData(projectId || null);
  const queryClient = useQueryClient();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to view the dashboard.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleViewDetails = () => {
    navigate(`/buildunion/project/${projectId}`);
  };

  const handleBudgetApproved = () => {
    queryClient.invalidateQueries({ queryKey: ["project-summary-owner", projectId] });
  };

  const handleBudgetDeclined = () => {
    queryClient.invalidateQueries({ queryKey: ["project-summary-owner", projectId] });
  };

  const transformedTasks = tasks.map(task => ({
    id: task.id,
    title: task.title,
    status: task.status,
    unit_price: task.unit_price ?? undefined,
    quantity: task.quantity ?? undefined,
    total_cost: task.total_cost ?? undefined,
    assignee_name: undefined
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
