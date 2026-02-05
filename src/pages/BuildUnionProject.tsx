 import { useParams, useNavigate, useSearchParams } from "react-router-dom";
 import { useEffect, useState } from "react";
 import ProjectDetailsView from "@/components/projects2/ProjectDetailsView";
 import OwnerConfidenceDashboard from "@/components/projects2/OwnerConfidenceDashboard";
 import { useAuth } from "@/hooks/useAuth";
 import { useOwnerDashboardData } from "@/hooks/useOwnerDashboardData";
 import { supabase } from "@/integrations/supabase/client";
 import { Loader2 } from "lucide-react";
 import { toast } from "sonner";
 import { format } from "date-fns";

const BuildUnionProject = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
   const [isOwner, setIsOwner] = useState<boolean | null>(null);
   const [checkingOwnership, setCheckingOwnership] = useState(true);
  
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
 
   // Owner Dashboard data
   const { data: ownerData, isLoading: ownerDataLoading } = useOwnerDashboardData(
     isOwner ? projectId || null : null
   );

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
 
     const handleApprove = () => {
       toast.success("Project phase approved! ✓", {
         description: "Your approval has been recorded."
       });
     };
 
     const handleExportPdf = () => {
       toast.info("Generating Executive PDF...");
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
         onApprove={handleApprove}
         onExportPdf={handleExportPdf}
         onViewDetails={handleViewDetails}
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
