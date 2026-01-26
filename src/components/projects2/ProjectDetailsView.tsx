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
  Sparkles,
  Cloud,
  MessageSquare,
  Loader2,
  Map
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { WeatherWidget } from "@/components/WeatherWidget";
import ActiveProjectTimeline from "@/components/ActiveProjectTimeline";
import ProjectSynthesis, { DualEngineOutput, SynthesisResult } from "./ProjectSynthesis";
import { FilterAnswers, AITriggers } from "./FilterQuestions";
import ConflictStatusIndicator from "./ConflictStatusIndicator";
import TeamMapWidget from "./TeamMapWidget";
import DocumentsPane from "./DocumentsPane";
import OperationalTruthCards from "./OperationalTruthCards";
import { buildOperationalTruth } from "@/types/operationalTruth";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

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

  const isTeamMode = summary?.mode === "team";

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
                  isTeamMode 
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                    : "border-amber-500 text-amber-600 dark:text-amber-400"
                )}
              >
                {isTeamMode ? t("projects.teamMode") : t("projects.soloMode")}
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

        {/* Conflict Status Indicator - Always visible in header */}
        <ConflictStatusIndicator
          synthesisResult={synthesisResult}
          dualEngineOutput={dualEngineOutput}
          size="md"
        />
      </div>

      {/* Operational Truth Cards - 8 Pillars */}
      <OperationalTruthCards 
        operationalTruth={buildOperationalTruth({
          aiAnalysis,
          dualEngineOutput,
          synthesisResult,
          filterAnswers,
          projectSize: aiConfig?.projectSize,
        })} 
      />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn(
          "grid w-full bg-muted/50",
          isTeamMode ? "grid-cols-5" : "grid-cols-4"
        )}>
          <TabsTrigger value="overview" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">{t("projects.overview")}</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t("projects.documents")}</span>
          </TabsTrigger>
          {isTeamMode && (
            <TabsTrigger value="map" className="gap-2">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">{t("projects.siteMap")}</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="timeline" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{t("projects.timeline")}</span>
          </TabsTrigger>
          <TabsTrigger value="weather" className="gap-2">
            <Cloud className="h-4 w-4" />
            <span className="hidden sm:inline">{t("projects.weather")}</span>
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

        {/* Documents Tab - Enhanced with Materials */}
        <TabsContent value="documents" className="mt-6">
          <DocumentsPane
            projectId={projectId}
            siteImages={project.site_images}
            aiAnalysis={aiAnalysis}
          />
        </TabsContent>

        {/* Team Map Tab - Only for Team Mode */}
        {isTeamMode && (
          <TabsContent value="map" className="mt-6">
            {project.address ? (
              <TeamMapWidget
                projectAddress={project.address}
                projectName={project.name}
              />
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Map className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">Add a project address to view site map</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

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

export default ProjectDetailsView;
