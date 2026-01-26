import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  MapPin, 
  Wrench, 
  Calendar, 
  FileText, 
  Users, 
  Sparkles,
  Cloud,
  ClipboardList,
  FileSignature,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { WeatherWidget } from "@/components/WeatherWidget";
import ActiveProjectTimeline from "@/components/ActiveProjectTimeline";
import ProjectSynthesis, { DualEngineOutput, SynthesisResult } from "./ProjectSynthesis";
import { FilterAnswers, AITriggers } from "./FilterQuestions";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface ProjectData {
  id: string;
  name: string;
  address: string | null;
  trade: string | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  site_images: string[] | null;
}

interface ProjectSummaryData {
  id: string;
  mode: string;
  status: string;
  photo_estimate: Record<string, unknown> | null;
  calculator_results: unknown[];
  ai_workflow_config: {
    filterAnswers?: FilterAnswers;
    aiTriggers?: AITriggers;
    projectSize?: string;
    projectSizeReason?: string;
    aiAnalysis?: {
      area: number | null;
      areaUnit: string;
      materials: Array<{ item: string; quantity: number; unit: string }>;
      hasBlueprint: boolean;
      confidence: string;
    };
    dualEngineOutput?: DualEngineOutput;
    synthesisResult?: SynthesisResult;
  } | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  total_cost: number | null;
  line_items: unknown[];
}

interface ProjectDetailsViewProps {
  projectId: string;
  onBack: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

const ProjectDetailsView = ({ projectId, onBack }: ProjectDetailsViewProps) => {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [summary, setSummary] = useState<ProjectSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      setLoading(true);
      try {
        // Fetch project and summary in parallel
        const [projectResult, summaryResult] = await Promise.all([
          supabase
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .maybeSingle(),
          supabase
            .from("project_summaries")
            .select("*")
            .eq("project_id", projectId)
            .maybeSingle()
        ]);

        if (projectResult.error) throw projectResult.error;
        if (!projectResult.data) {
          toast.error("Project not found");
          onBack();
          return;
        }

        setProject(projectResult.data as ProjectData);
        
        if (summaryResult.data) {
          setSummary(summaryResult.data as unknown as ProjectSummaryData);
        }
      } catch (error) {
        console.error("Error loading project:", error);
        toast.error("Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, onBack]);

  // Extract data from summary
  const aiConfig = summary?.ai_workflow_config;
  const filterAnswers = aiConfig?.filterAnswers;
  const aiTriggers = aiConfig?.aiTriggers;
  const aiAnalysis = aiConfig?.aiAnalysis;
  const dualEngineOutput = aiConfig?.dualEngineOutput;
  const synthesisResult = aiConfig?.synthesisResult;

  // Status indicators
  const hasPhotoEstimate = !!summary?.photo_estimate && Object.keys(summary.photo_estimate).length > 0;
  const hasClientInfo = !!(summary?.client_name || summary?.client_email);
  const hasLineItems = Array.isArray(summary?.line_items) && summary.line_items.length > 0;
  const totalCost = summary?.total_cost || 0;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              <Badge 
                variant="outline" 
                className={cn(
                  "capitalize",
                  summary?.mode === "team" 
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                    : "border-amber-500 text-amber-600 dark:text-amber-400"
                )}
              >
                {summary?.mode || "solo"} mode
              </Badge>
              <Badge 
                variant="outline" 
                className="capitalize bg-muted/50"
              >
                {project.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {project.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {project.address}
                </span>
              )}
              {project.trade && (
                <span className="flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5" />
                  {project.trade.replace("_", " ")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(project.created_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard 
          icon={<Sparkles className="h-4 w-4" />}
          label="Photo Analysis"
          value={hasPhotoEstimate ? "Complete" : "Pending"}
          active={hasPhotoEstimate}
        />
        <StatusCard 
          icon={<ClipboardList className="h-4 w-4" />}
          label="Line Items"
          value={hasLineItems ? `${(summary?.line_items || []).length} items` : "None"}
          active={hasLineItems}
        />
        <StatusCard 
          icon={<Users className="h-4 w-4" />}
          label="Client Info"
          value={hasClientInfo ? summary?.client_name || "Added" : "Missing"}
          active={hasClientInfo}
        />
        <StatusCard 
          icon={<FileSignature className="h-4 w-4" />}
          label="Total"
          value={totalCost > 0 ? `$${totalCost.toLocaleString()}` : "$0"}
          active={totalCost > 0}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50">
          <TabsTrigger value="overview" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="weather" className="gap-2">
            <Cloud className="h-4 w-4" />
            <span className="hidden sm:inline">Weather</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* AI Synthesis Card (if filter answers exist) */}
          {filterAnswers && aiTriggers && (
            <ProjectSynthesis
              filterAnswers={filterAnswers}
              aiTriggers={aiTriggers}
              dualEngineOutput={dualEngineOutput}
              synthesisResult={synthesisResult}
            />
          )}

          {/* Project Description */}
          {project.description && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Project Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis Summary */}
          {aiAnalysis && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  AI Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">Detected Area</div>
                    <div className="text-lg font-semibold">
                      {aiAnalysis.area 
                        ? `${aiAnalysis.area.toLocaleString()} ${aiAnalysis.areaUnit}`
                        : "N/A"
                      }
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">Materials</div>
                    <div className="text-lg font-semibold">
                      {aiAnalysis.materials?.length || 0} items
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">Project Size</div>
                    <div className="text-lg font-semibold capitalize">
                      {aiConfig?.projectSize || "Unknown"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">Confidence</div>
                    <div className="text-lg font-semibold capitalize">
                      {aiAnalysis.confidence || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Materials List */}
                {aiAnalysis.materials && aiAnalysis.materials.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Detected Materials</div>
                    <div className="flex flex-wrap gap-2">
                      {aiAnalysis.materials.slice(0, 8).map((m, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {m.item}: {m.quantity} {m.unit}
                        </Badge>
                      ))}
                      {aiAnalysis.materials.length > 8 && (
                        <Badge variant="outline" className="text-xs">
                          +{aiAnalysis.materials.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Empty state if no AI data */}
          {!filterAnswers && !aiAnalysis && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No AI analysis data available for this project</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Project Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.site_images && project.site_images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {project.site_images.map((path, i) => (
                    <div 
                      key={i}
                      className="aspect-square rounded-lg bg-muted/50 border flex items-center justify-center overflow-hidden"
                    >
                      <img 
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/project-documents/${path}`}
                        alt={`Site image ${i + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">No documents uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="mt-6">
          <ActiveProjectTimeline 
            projectId={projectId}
            projectName={project.name}
          />
        </TabsContent>

        {/* Weather Tab */}
        <TabsContent value="weather" className="mt-6">
          {project.address ? (
            <WeatherWidget 
              location={project.address}
              showForecast={true}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Cloud className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">Add a project address to see weather data</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

interface StatusCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  active: boolean;
}

const StatusCard = ({ icon, label, value, active }: StatusCardProps) => (
  <Card className={cn(
    "transition-colors",
    active ? "border-green-500/50 bg-green-500/5" : "border-muted"
  )}>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={cn(
          "transition-colors",
          active ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
        )}>
          {icon}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {active ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
        <span className={cn(
          "text-sm font-medium truncate",
          active ? "text-foreground" : "text-muted-foreground"
        )}>
          {value}
        </span>
      </div>
    </CardContent>
  </Card>
);

export default ProjectDetailsView;
