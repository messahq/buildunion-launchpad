import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import ProjectDetailsView from "@/components/projects2/ProjectDetailsView";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * This page always shows the Command Center (ProjectDetailsView)
 * Used by owners who want to see the technical/detailed view
 */
const BuildUnionProjectDetails = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [projectExists, setProjectExists] = useState<boolean | null>(null);
  const [checkingProject, setCheckingProject] = useState(true);
  
  const initialTab = searchParams.get("tab") || undefined;

  // Check if project exists
  useEffect(() => {
    async function checkProject() {
      if (!projectId || !user) {
        setCheckingProject(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("projects")
          .select("id")
          .eq("id", projectId)
          .maybeSingle();

        setProjectExists(!!data);
      } catch (err) {
        console.error("Error checking project:", err);
        setProjectExists(false);
      } finally {
        setCheckingProject(false);
      }
    }

    checkProject();
  }, [projectId, user]);

  if (authLoading || checkingProject) {
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

  if (!projectId || projectExists === false) {
    navigate("/buildunion/workspace", { replace: true });
    return null;
  }

  return (
    <ProjectDetailsView
      projectId={projectId}
      onBack={() => navigate(`/buildunion/project/${projectId}`)}
      initialTab={initialTab}
    />
  );
};

export default BuildUnionProjectDetails;