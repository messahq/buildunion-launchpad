import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Loader2,
  MessageSquare,
  Calendar,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ProjectSynthesis {
  id: string;
  project_id: string;
  question: string;
  answer: string;
  verification_status: string;
  created_at: string;
  project?: {
    name: string;
  };
}

const ProjectFacts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [facts, setFacts] = useState<ProjectSynthesis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFacts();
    }
  }, [user]);

  const fetchFacts = async () => {
    if (!user) return;

    try {
      // First get the user's projects
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user.id);

      if (projectsError) throw projectsError;

      if (!projects || projects.length === 0) {
        setFacts([]);
        setIsLoading(false);
        return;
      }

      const projectIds = projects.map(p => p.id);
      const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));

      // Then get the syntheses for those projects
      const { data, error } = await supabase
        .from("project_syntheses")
        .select("*")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Add project names to the data
      const factsWithProjects = (data || []).map(fact => ({
        ...fact,
        project: { name: projectMap[fact.project_id] || "Unknown Project" }
      }));

      setFacts(factsWithProjects);
    } catch (err) {
      console.error("Error fetching facts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "verified") {
      return (
        <Badge className="bg-green-500/10 text-green-700 border-green-300 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Verified
        </Badge>
      );
    }
    if (status === "conflict_notified") {
      return (
        <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Conflict
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <FileText className="h-3 w-3" />
        Saved
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        </CardContent>
      </Card>
    );
  }

  if (facts.length === 0) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg">Project Facts</CardTitle>
          </div>
          <CardDescription>
            Verified insights from M.E.S.S.A. analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No saved facts yet</p>
            <p className="text-xs mt-1">Use M.E.S.S.A. to analyze documents and save verified insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg">Project Facts</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {facts.length} saved
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/buildunion/facts")}
              className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-1 h-7"
            >
              View All
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <CardDescription>
          Verified insights from M.E.S.S.A. dual-engine analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="divide-y divide-slate-100">
            {facts.map(fact => (
              <div 
                key={fact.id} 
                className="p-4 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                onClick={() => navigate(`/buildunion/project/${fact.project_id}`)}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {fact.question}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="text-cyan-600 font-medium">{fact.project?.name}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(fact.created_at), "MMM d, yyyy")}
                      </span>
                    </p>
                  </div>
                  {getStatusBadge(fact.verification_status)}
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">
                  {fact.answer}
                </p>
                <div className="mt-2 flex items-center text-xs text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  View in project <ChevronRight className="h-3 w-3 ml-1" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ProjectFacts;
