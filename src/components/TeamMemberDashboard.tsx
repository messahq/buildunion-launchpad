import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, 
  Package, 
  FileText, 
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TEAM_ROLES, TeamRole } from "@/hooks/useProjectTeam";

interface SharedProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  address: string | null;
  role: string;
  joined_at: string;
}

interface MaterialItem {
  name: string;
  quantity: number;
  unit: string;
  price?: number;
}

interface ProjectMaterials {
  projectId: string;
  projectName: string;
  materials: MaterialItem[];
}

const TeamMemberDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sharedProjects, setSharedProjects] = useState<SharedProject[]>([]);
  const [projectMaterials, setProjectMaterials] = useState<ProjectMaterials[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSharedProjects = async () => {
      try {
        // Get projects where user is a member
        const { data: memberships, error: membershipError } = await supabase
          .from("project_members")
          .select("project_id, role, joined_at")
          .eq("user_id", user.id);

        if (membershipError) throw membershipError;

        if (!memberships || memberships.length === 0) {
          setSharedProjects([]);
          setLoading(false);
          return;
        }

        // Get project details
        const projectIds = memberships.map(m => m.project_id);
        const { data: projects, error: projectsError } = await supabase
          .from("projects")
          .select("id, name, description, status, address")
          .in("id", projectIds);

        if (projectsError) throw projectsError;

        // Combine data
        const combined = (projects || []).map(project => {
          const membership = memberships.find(m => m.project_id === project.id);
          return {
            ...project,
            role: membership?.role || "member",
            joined_at: membership?.joined_at || "",
          };
        });

        setSharedProjects(combined);

        // Fetch materials from project summaries
        const { data: summaries } = await supabase
          .from("project_summaries")
          .select("project_id, line_items")
          .in("project_id", projectIds);

        if (summaries) {
          const materialsData: ProjectMaterials[] = summaries
            .filter(s => s.line_items && Array.isArray(s.line_items))
            .map(s => {
              const project = projects?.find(p => p.id === s.project_id);
              return {
                projectId: s.project_id || "",
                projectName: project?.name || "Unknown Project",
                materials: (s.line_items as any[]).map(item => ({
                  name: item.description || item.name || "Item",
                  quantity: item.quantity || 1,
                  unit: item.unit || "pcs",
                  price: item.unitPrice || item.price,
                })),
              };
            });
          setProjectMaterials(materialsData);
        }
      } catch (error) {
        console.error("Error fetching shared projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSharedProjects();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <Clock className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "draft":
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (sharedProjects.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Shared Projects</h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            You haven't been added to any projects yet. When a project owner invites you, your assigned projects will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="projects" className="gap-2">
            <Briefcase className="h-4 w-4" />
            My Projects
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2">
            <Package className="h-4 w-4" />
            Materials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          {sharedProjects.map((project) => {
            const roleInfo = TEAM_ROLES[project.role as TeamRole] || TEAM_ROLES.member;
            return (
              <Card key={project.id} className="border-slate-200 hover:border-amber-300 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-slate-900">
                        {project.name}
                      </CardTitle>
                      {project.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {project.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(project.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{roleInfo.icon}</span>
                        <span className="font-medium">{roleInfo.label}</span>
                      </div>
                      {project.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="truncate max-w-[200px]">{project.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>Joined {new Date(project.joined_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => navigate(`/buildunion/project/${project.id}`)}
                    >
                      View Project
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          {projectMaterials.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="py-8 text-center">
                <Package className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">No material lists available yet</p>
              </CardContent>
            </Card>
          ) : (
            projectMaterials.map((pm) => (
              <Card key={pm.projectId} className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-600" />
                    {pm.projectName}
                  </CardTitle>
                  <CardDescription>
                    {pm.materials.length} item{pm.materials.length !== 1 ? 's' : ''} in material list
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      {pm.materials.map((material, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50"
                        >
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-900">
                              {material.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span>
                              {material.quantity} {material.unit}
                            </span>
                            {material.price !== undefined && (
                              <span className="font-medium text-slate-900">
                                ${(material.price * material.quantity).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamMemberDashboard;
