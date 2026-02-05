 import { useParams, useNavigate } from "react-router-dom";
 import { useAuth } from "@/hooks/useAuth";
 import { useOwnerDashboardData } from "@/hooks/useOwnerDashboardData";
 import OwnerConfidenceDashboard from "@/components/projects2/OwnerConfidenceDashboard";
 import { toast } from "sonner";
 import { format } from "date-fns";
 import { Loader2 } from "lucide-react";
 
 export default function OwnerDashboard() {
   const { projectId } = useParams<{ projectId: string }>();
   const navigate = useNavigate();
   const { user } = useAuth();
   const { data, isLoading, project, summary } = useOwnerDashboardData(projectId || null);
 
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
     // TODO: Integrate with generate-project-brief edge function
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
     // TODO: Generate PDF with project brief
   };
 
   const handleViewDetails = () => {
     navigate(`/buildunion/project/${projectId}`);
   };
 
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
       onApprove={handleApprove}
       onExportPdf={handleExportPdf}
       onViewDetails={handleViewDetails}
     />
   );
 }