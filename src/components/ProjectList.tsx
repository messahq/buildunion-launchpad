import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Folder, Plus, Calendar, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const ProjectList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 border-green-200";
      case "completed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "draft":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!user) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="py-12 text-center">
          <Folder className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Sign in to view your projects</h3>
          <p className="text-slate-500 mb-6">Create an account to start managing your construction projects.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/buildunion/login")}>
              Log In
            </Button>
            <Button onClick={() => navigate("/buildunion/register")} className="bg-amber-600 hover:bg-amber-700">
              Register
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="py-12 text-center">
          <Folder className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No projects yet</h3>
          <p className="text-slate-500 mb-6">Start your first project and let M.E.S.S.A. analyze your documents.</p>
          <Button onClick={() => navigate("/buildunion/workspace/new")} className="bg-amber-600 hover:bg-amber-700 gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Project
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Projects</h2>
          <p className="text-slate-500 text-sm">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => navigate("/buildunion/workspace/new")} className="bg-amber-600 hover:bg-amber-700 gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card 
            key={project.id} 
            className="border-slate-200 bg-white hover:border-amber-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
            onClick={() => navigate(`/buildunion/project/${project.id}`)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <Folder className="h-5 w-5 text-amber-600" />
                </div>
                <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                  {project.status}
                </Badge>
              </div>
              <CardTitle className="text-lg font-semibold text-slate-900 mt-3 group-hover:text-amber-700 transition-colors">
                {project.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.description && (
                <CardDescription className="text-slate-500 text-sm mb-3 line-clamp-2">
                  {project.description}
                </CardDescription>
              )}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(project.created_at)}
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Documents
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProjectList;
