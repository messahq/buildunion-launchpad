import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Ruler, 
  Package, 
  FileText, 
  Shield, 
  AlertTriangle, 
  Users, 
  Gauge, 
  Brain,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
  CloudRain,
  Play,
  RotateCcw,
  RefreshCw,
  Database,
  CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OperationalTruth } from "@/types/operationalTruth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Data source origin type - extended to include "description" for user-provided explicit area
export type DataSourceOrigin = "photo_ai" | "blueprint" | "tasks" | "manual" | "config" | "default" | "description";

interface OperationalTruthCardsProps {
  operationalTruth: OperationalTruth;
  projectId?: string;
  projectAddress?: string | null;
  onUpdate?: () => void;
  // Callback when blueprint is manually validated
  onBlueprintValidated?: (validated: boolean) => void;
  // Callback when conflicts are manually ignored
  onConflictsIgnored?: (ignored: boolean) => void;
  // Callback to navigate to task timeline calendar
  onNavigateToTaskTimeline?: () => void;
  // Initial state from database (persisted overrides)
  initialBlueprintValidated?: boolean;
  initialConflictsIgnored?: boolean;
  // Data source origins for each pillar
  dataSourceOrigins?: {
    area?: DataSourceOrigin;
    materials?: DataSourceOrigin;
    blueprint?: DataSourceOrigin;
    obc?: DataSourceOrigin;
    conflict?: DataSourceOrigin;
    mode?: DataSourceOrigin;
    size?: DataSourceOrigin;
    confidence?: DataSourceOrigin;
  };
  // Linked citations per pillar (from Citation Registry)
  pillarCitations?: {
    area?: string[];
    materials?: string[];
    blueprint?: string[];
    obc?: string[];
    conflict?: string[];
    mode?: string[];
    size?: string[];
    confidence?: string[];
  };
}

interface VerificationReport {
  pillar: string;
  engine: "gemini" | "openai" | "dual";
  status: "success" | "warning" | "error";
  message: string;
  details?: string;
  timestamp: Date;
  acknowledged?: boolean; // User clicked "I Understood" or "Ignore"
}

interface PillarCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: "verified" | "pending" | "warning";
  iconColor?: string;
  onClick?: () => void;
  isLoading?: boolean;
  isClickable?: boolean;
  subtitle?: string;
  sourceOrigin?: DataSourceOrigin;
  linkedCitations?: string[]; // Array of citation IDs like ["P-001", "D-002"]
}

// Helper to get source label
const getSourceLabel = (origin?: DataSourceOrigin): string => {
  switch (origin) {
    case "photo_ai": return "📷 Photo AI";
    case "blueprint": return "📐 Blueprint";
    case "tasks": return "📋 Tasks";
    case "manual": return "✋ Manual";
    case "config": return "⚙️ Config";
    case "default": return "🔧 Default";
    case "description": return "📝 Description";
    default: return "";
  }
};

const PillarCard = ({ 
  icon, 
  label, 
  value, 
  status, 
  iconColor, 
  onClick, 
  isLoading,
  isClickable = false,
  subtitle,
  sourceOrigin,
  linkedCitations = []
}: PillarCardProps) => (
  <Card 
    className={cn(
      "transition-all duration-200",
      status === "verified" && "border-green-500/50 bg-green-500/5",
      status === "warning" && "border-amber-500/50 bg-amber-500/5",
      status === "pending" && "border-muted",
      isClickable && !isLoading && "cursor-pointer hover:scale-[1.02] hover:shadow-md",
      isLoading && "opacity-70"
    )}
    onClick={isClickable && !isLoading ? onClick : undefined}
  >
    <CardContent className="p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={cn(
          "transition-colors",
          iconColor || (
            status === "verified" ? "text-green-600 dark:text-green-400" : 
            status === "warning" ? "text-amber-600 dark:text-amber-400" :
            "text-muted-foreground"
          )
        )}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
        {/* Citation badges - show linked sources */}
        {linkedCitations.length > 0 && (
          <div className="flex items-center gap-0.5 ml-auto">
            {linkedCitations.slice(0, 2).map((citationId) => (
              <span 
                key={citationId}
                className="text-[9px] font-mono bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1 py-0.5 rounded border border-amber-500/30"
                title={`Linked source: ${citationId}`}
              >
                [{citationId}]
              </span>
            ))}
            {linkedCitations.length > 2 && (
              <span className="text-[9px] text-muted-foreground">
                +{linkedCitations.length - 2}
              </span>
            )}
          </div>
        )}
        {isClickable && status === "pending" && !isLoading && linkedCitations.length === 0 && (
          <Sparkles className="h-3 w-3 text-primary ml-auto" />
        )}
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          {status === "verified" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
          ) : status === "warning" ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
          )}
          <span className={cn(
            "text-sm font-medium truncate",
            status !== "pending" ? "text-foreground" : "text-muted-foreground"
          )}>
            {isLoading ? "Verifying..." : value}
          </span>
        </div>
        {/* Source origin label */}
        {sourceOrigin && status !== "pending" && !isLoading && (
          <span className="text-[10px] text-muted-foreground/60 mt-0.5 ml-5 font-medium">
            {getSourceLabel(sourceOrigin)}
          </span>
        )}
        {subtitle && status === "pending" && !isLoading && (
          <span className="text-[10px] text-muted-foreground/70 mt-0.5 ml-5">
            {subtitle}
          </span>
        )}
      </div>
    </CardContent>
  </Card>
);

export default function OperationalTruthCards({ 
  operationalTruth, 
  projectId,
  projectAddress,
  onUpdate,
  onBlueprintValidated,
  onConflictsIgnored,
  onNavigateToTaskTimeline,
  initialBlueprintValidated = false,
  initialConflictsIgnored = false,
  dataSourceOrigins = {},
  pillarCitations = {},
}: OperationalTruthCardsProps) {
  const { t } = useTranslation();
  const [loadingPillar, setLoadingPillar] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState(0);
  const [reports, setReports] = useState<VerificationReport[]>([]);
  // Initialize from database-persisted values
  const [manuallyValidatedBlueprint, setManuallyValidatedBlueprint] = useState(initialBlueprintValidated);
  const [manuallyIgnoredConflicts, setManuallyIgnoredConflicts] = useState(initialConflictsIgnored);
  // Track if OBC warnings/errors have been acknowledged by user (turns pillar green)
  const [obcAcknowledged, setObcAcknowledged] = useState(false);
  // Animation state for sync pulse effect
  const [syncAnimationActive, setSyncAnimationActive] = useState(false);
  const [previousVerificationRate, setPreviousVerificationRate] = useState<number | null>(null);
  
  // Sync with props when they change (e.g., after database load)
  useEffect(() => {
    setManuallyValidatedBlueprint(initialBlueprintValidated);
  }, [initialBlueprintValidated]);
  
  useEffect(() => {
    setManuallyIgnoredConflicts(initialConflictsIgnored);
  }, [initialConflictsIgnored]);
  
  // Load obcAcknowledged from database on mount
  useEffect(() => {
    const loadObcAcknowledged = async () => {
      if (!projectId) return;
      try {
        const { data } = await supabase
          .from("project_summaries")
          .select("ai_workflow_config")
          .eq("project_id", projectId)
          .maybeSingle();
        
        const config = data?.ai_workflow_config as { obcResult?: { acknowledged?: boolean } } | null;
        if (config?.obcResult?.acknowledged) {
          setObcAcknowledged(true);
        }
      } catch (error) {
        console.error("Failed to load OBC acknowledged state:", error);
      }
    };
    loadObcAcknowledged();
  }, [projectId]);
  
  const {
    confirmedArea,
    areaUnit,
    materialsCount,
    blueprintStatus,
    obcCompliance,
    conflictStatus,
    projectMode,
    projectSize,
    confidenceLevel,
  } = operationalTruth;

  // Determine effective blueprint status (manual override takes priority)
  const effectiveBlueprintStatus = manuallyValidatedBlueprint ? "analyzed" : blueprintStatus;
  
  // Determine effective conflict status (manual ignore takes priority)
  const effectiveConflictStatus = manuallyIgnoredConflicts ? "aligned" : conflictStatus;

  // CRITICAL: Recalculate verification rate based on EFFECTIVE statuses (with overrides)
  // This is "the clock" - the single source of truth for project verification
  const effectiveVerificationRate = useMemo(() => {
    let verifiedPillars = 0;
    
    // Pillar 1: Confirmed Area
    if (confirmedArea !== null) verifiedPillars++;
    
    // Pillar 2: Materials Count
    if (materialsCount > 0) verifiedPillars++;
    
    // Pillar 3: Blueprint Status (with manual override OR citation auto-verification)
    const hasBlueprintCitations = (pillarCitations.blueprint?.length ?? 0) > 0;
    if (effectiveBlueprintStatus !== "pending" || hasBlueprintCitations) verifiedPillars++;
    
    // Pillar 4: OBC Compliance (with acknowledge override)
    if (obcCompliance !== "pending" || obcAcknowledged) verifiedPillars++;
    
    // Pillar 5: Conflict Status (with manual override)
    if (effectiveConflictStatus !== "pending") verifiedPillars++;
    
    // Pillars 6-8: Mode, Size, Confidence are always "verified"
    verifiedPillars += 3;
    
    return Math.round((verifiedPillars / 8) * 100);
  }, [confirmedArea, materialsCount, effectiveBlueprintStatus, obcCompliance, obcAcknowledged, effectiveConflictStatus, pillarCitations.blueprint]);
  
  // Use the effective verification rate (not the props one)
  const verificationRate = effectiveVerificationRate;
  
  // Trigger sync animation when verification rate changes
  useEffect(() => {
    if (previousVerificationRate !== null && previousVerificationRate !== verificationRate) {
      setSyncAnimationActive(true);
      const timer = setTimeout(() => setSyncAnimationActive(false), 1500);
      return () => clearTimeout(timer);
    }
    setPreviousVerificationRate(verificationRate);
  }, [verificationRate, previousVerificationRate]);

  const addReport = (report: Omit<VerificationReport, "timestamp">) => {
    setReports(prev => [...prev, { ...report, timestamp: new Date() }]);
  };

  // Gemini: Verify Confirmed Area
  const verifyConfirmedArea = async () => {
    if (!projectId) {
      toast.error("Project ID required");
      return;
    }
    
    setLoadingPillar("area");
    try {
      // Fetch photo_estimate from project_summaries
      const { data: summary, error } = await supabase
        .from("project_summaries")
        .select("photo_estimate, ai_workflow_config")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) throw error;

      const photoEstimate = summary?.photo_estimate as any;
      const aiConfig = summary?.ai_workflow_config as any;
      
      // Extract area from various sources
      const detectedArea = photoEstimate?.area || 
                          aiConfig?.aiAnalysis?.area ||
                          photoEstimate?.blueprintAnalysis?.detectedArea;
      
      if (detectedArea) {
        addReport({
          pillar: "Confirmed Area",
          engine: "gemini",
          status: "success",
          message: `Area verified: ${detectedArea.toLocaleString()} ${areaUnit}`,
          details: `Source: ${photoEstimate?.area ? 'Photo Analysis' : 'Blueprint Analysis'}. Confidence: ${photoEstimate?.areaConfidence || 'medium'}`
        });
        toast.success(`Area confirmed: ${detectedArea.toLocaleString()} ${areaUnit}`);
      } else {
        addReport({
          pillar: "Confirmed Area",
          engine: "gemini",
          status: "warning",
          message: "No area data found in analysis",
          details: "Upload site photos or blueprints to enable area detection"
        });
        toast.info("No area data found - upload photos or blueprints");
      }
      
      onUpdate?.();
    } catch (error) {
      console.error("Error verifying area:", error);
      addReport({
        pillar: "Confirmed Area",
        engine: "gemini",
        status: "error",
        message: "Failed to verify area",
        details: error instanceof Error ? error.message : "Unknown error"
      });
      toast.error("Failed to verify area");
    } finally {
      setLoadingPillar(null);
    }
  };

  // Gemini: Verify Materials
  const verifyMaterials = async () => {
    if (!projectId) {
      toast.error("Project ID required");
      return;
    }
    
    setLoadingPillar("materials");
    try {
      const { data: summary, error } = await supabase
        .from("project_summaries")
        .select("photo_estimate, ai_workflow_config")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) throw error;

      const photoEstimate = summary?.photo_estimate as any;
      const aiConfig = summary?.ai_workflow_config as any;
      
      const materials = photoEstimate?.materials || aiConfig?.aiAnalysis?.materials || [];
      
      if (materials.length > 0) {
        const materialsList = materials.slice(0, 3).map((m: any) => m.item).join(", ");
        addReport({
          pillar: "Materials",
          engine: "gemini",
          status: "success",
          message: `${materials.length} materials detected`,
          details: `Items: ${materialsList}${materials.length > 3 ? ` +${materials.length - 3} more` : ''}`
        });
        toast.success(`${materials.length} materials verified`);
      } else {
        addReport({
          pillar: "Materials",
          engine: "gemini",
          status: "warning",
          message: "No materials detected",
          details: "AI analysis has not identified materials yet"
        });
        toast.info("No materials detected yet");
      }
      
      onUpdate?.();
    } catch (error) {
      console.error("Error verifying materials:", error);
      addReport({
        pillar: "Materials",
        engine: "gemini",
        status: "error",
        message: "Failed to verify materials",
        details: error instanceof Error ? error.message : "Unknown error"
      });
      toast.error("Failed to verify materials");
    } finally {
      setLoadingPillar(null);
    }
  };

  // OpenAI: Verify OBC Status using dedicated edge function
  const verifyOBCStatus = async () => {
    if (!projectId) {
      toast.error("Project ID required");
      return;
    }
    
    setLoadingPillar("obc");
    try {
      // Fetch project data for OBC check
      const { data: summary } = await supabase
        .from("project_summaries")
        .select("photo_estimate, blueprint_analysis, ai_workflow_config, mode")
        .eq("project_id", projectId)
        .maybeSingle();

      const { data: project } = await supabase
        .from("projects")
        .select("name, description, trade, trades")
        .eq("id", projectId)
        .maybeSingle();

      // Extract materials from photo estimate or blueprint
      const photoEstimate = summary?.photo_estimate as { materials?: { name: string }[] } | null;
      const blueprintAnalysis = summary?.blueprint_analysis as { materials?: { name: string }[] } | null;
      const materials = photoEstimate?.materials || blueprintAnalysis?.materials || [];
      
      // Get workflow config for additional flags
      const workflowConfig = summary?.ai_workflow_config as {
        projectSize?: string;
        filterAnswers?: {
          complexity?: string;
          workType?: string[];
        };
      } | null;

      // Determine changes from filter answers or trade info
      const workTypes = workflowConfig?.filterAnswers?.workType || [];
      const trades = project?.trades || [];
      
      const hasStructural = workTypes.some(w => 
        w.toLowerCase().includes('structural') || w.toLowerCase().includes('load')
      );
      const hasMechanical = workTypes.some(w => 
        w.toLowerCase().includes('hvac') || w.toLowerCase().includes('mechanical') || w.toLowerCase().includes('plumbing')
      ) || trades.includes('plumber') || trades.includes('hvac_technician');
      const hasElectrical = workTypes.some(w => 
        w.toLowerCase().includes('electrical')
      ) || trades.includes('electrician');

      // Build OBC check input - map internal status values to OBC input format
      const blueprintInputStatus = blueprintStatus === "analyzed" ? "uploaded" as const : 
                                   blueprintStatus === "none" || blueprintStatus === "pending" ? "none" as const : 
                                   "none" as const;
      
      const conflictInputStatus = conflictStatus === "conflict_detected" ? "detected" as const : 
                                  conflictStatus === "aligned" ? "none" as const : 
                                  "none" as const;

      const obcInput = {
        project_type: project?.trade || project?.name || "renovation",
        scope_of_work: project?.description || "Interior renovation work",
        confirmed_area_sqft: confirmedArea > 0 ? confirmedArea : undefined,
        materials: materials.length > 0 ? materials : undefined,
        blueprint_status: blueprintInputStatus,
        structural_changes: hasStructural || undefined,
        mechanical_changes: hasMechanical || undefined,
        electrical_changes: hasElectrical || undefined,
        load_bearing_work: hasStructural || undefined,
        project_mode: (summary?.mode as "solo" | "team") || "solo",
        conflict_status: conflictInputStatus,
        data_confidence: materialsCount > 5 && confirmedArea > 0 ? "high" as const : 
                        materialsCount > 0 || confirmedArea > 0 ? "medium" as const : "low" as const
      };

      // Call dedicated OBC status check edge function
      const { data, error } = await supabase.functions.invoke("obc-status-check", {
        body: { projectData: obcInput }
      });

      if (error) throw error;

      if (data?.result) {
        const result = data.result;
        const status = result.obc_status === "PASS" ? "success" : 
                      result.obc_status === "CONDITIONAL" ? "warning" : "error";
        
        // Save OBC result to ai_workflow_config in project_summaries
        try {
          const { data: existingSummary } = await supabase
            .from("project_summaries")
            .select("ai_workflow_config")
            .eq("project_id", projectId)
            .maybeSingle();

          const existingConfig = (existingSummary?.ai_workflow_config as Record<string, unknown>) || {};
          
          await supabase
            .from("project_summaries")
            .update({
              ai_workflow_config: {
                ...existingConfig,
                obcResult: {
                  status: result.obc_status,
                  riskLevel: result.risk_level,
                  reasoning: result.reasoning,
                  missingInfo: result.missing_information,
                  requiresProfessionalReview: result.requires_professional_review,
                  notes: result.notes,
                  checkedAt: new Date().toISOString(),
                  acknowledged: false // User hasn't acknowledged yet
                }
              }
            })
            .eq("project_id", projectId);

          console.log("OBC result saved to ai_workflow_config");
        } catch (saveError) {
          console.error("Failed to save OBC result:", saveError);
        }
        
        addReport({
          pillar: "OBC Status",
          engine: "openai",
          status,
          message: result.obc_status === "PASS" ? "No permit required - Clear" :
                  result.obc_status === "CONDITIONAL" ? "Conditional - Review recommended" :
                  "Permit may be required",
          details: [
            `Risk Level: ${result.risk_level}`,
            ...result.reasoning,
            result.missing_information.length > 0 ? `Missing: ${result.missing_information.join(", ")}` : "",
            result.notes || ""
          ].filter(Boolean).join("\n"),
          acknowledged: false
        });
        
        toast.success(`OBC Status: ${result.obc_status} (${result.risk_level} risk)`);
      } else {
        addReport({
          pillar: "OBC Status",
          engine: "openai",
          status: "warning",
          message: "Could not determine OBC status",
          details: "Insufficient project data for compliance check",
          acknowledged: false
        });
      }
      
      onUpdate?.();
    } catch (error) {
      console.error("Error verifying OBC:", error);
      addReport({
        pillar: "OBC Status",
        engine: "openai",
        status: "error",
        message: "OBC verification failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
      toast.error("Failed to verify OBC status");
    } finally {
      setLoadingPillar(null);
    }
  };

  // Dual Engine: Conflict Check (includes weather alerts)
  const verifyConflicts = async () => {
    if (!projectId) {
      toast.error("Project ID required");
      return;
    }
    
    setLoadingPillar("conflict");
    try {
      // Fetch project data for conflict analysis
      const { data: summary, error } = await supabase
        .from("project_summaries")
        .select("photo_estimate, blueprint_analysis, ai_workflow_config")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) throw error;

      const photoEstimate = summary?.photo_estimate as any;
      const blueprintAnalysis = summary?.blueprint_analysis as any;
      
      // Check for area discrepancy
      const photoArea = photoEstimate?.area;
      const blueprintArea = blueprintAnalysis?.detectedArea;
      
      let hasConflict = false;
      let conflictDetails = "";
      const conflictItems: string[] = [];
      
      if (photoArea && blueprintArea) {
        const difference = Math.abs(photoArea - blueprintArea);
        const percentDiff = (difference / Math.max(photoArea, blueprintArea)) * 100;
        
        if (percentDiff > 10) {
          hasConflict = true;
          conflictItems.push(`Area mismatch: Photo ${photoArea} vs Blueprint ${blueprintArea} ${areaUnit}`);
        }
      }
      
      // Check weather alerts if we have a project address
      let weatherAlerts: Array<{ type: string; severity: string; message: string }> = [];
      if (projectAddress && projectAddress.length > 5) {
        try {
          const { data: weatherData, error: weatherError } = await supabase.functions.invoke("get-weather", {
            body: { location: projectAddress, days: 3 }
          });
          
          if (!weatherError && weatherData) {
            // Collect current weather alerts
            if (weatherData.current?.alerts?.length > 0) {
              weatherAlerts = [...weatherAlerts, ...weatherData.current.alerts];
            }
            
            // Collect forecast alerts (next 3 days)
            if (weatherData.forecast) {
              for (const day of weatherData.forecast) {
                if (day.alerts?.length > 0) {
                  weatherAlerts = [...weatherAlerts, ...day.alerts.map((a: any) => ({
                    ...a,
                    date: day.date
                  }))];
                }
              }
            }
            
            // Add weather report
            const dangerAlerts = weatherAlerts.filter(a => a.severity === "danger");
            const warningAlerts = weatherAlerts.filter(a => a.severity === "warning");
            
            if (dangerAlerts.length > 0) {
              hasConflict = true;
              const alertMessages = dangerAlerts.slice(0, 2).map(a => a.message).join("; ");
              conflictItems.push(`⚠️ DANGER: ${alertMessages}`);
              
              addReport({
                pillar: "Weather Alert",
                engine: "dual",
                status: "warning",
                message: `${dangerAlerts.length} dangerous weather condition(s) detected`,
                details: dangerAlerts.map(a => `${a.type}: ${a.message}`).join(" | ")
              });
            } else if (warningAlerts.length > 0) {
              addReport({
                pillar: "Weather Check",
                engine: "dual",
                status: "warning",
                message: `${warningAlerts.length} weather warning(s) for project site`,
                details: warningAlerts.slice(0, 3).map(a => a.message).join(" | ")
              });
            } else {
              addReport({
                pillar: "Weather Check",
                engine: "dual",
                status: "success",
                message: "No weather hazards detected",
                details: `Location: ${weatherData.location?.name || projectAddress}. Safe conditions for next 3 days.`
              });
            }
          }
        } catch (weatherErr) {
          console.error("Weather check failed:", weatherErr);
          // Don't fail the whole conflict check if weather fails
        }
      } else {
        // No address - note it but don't fail
        addReport({
          pillar: "Weather Check",
          engine: "dual",
          status: "warning",
          message: "Weather check skipped",
          details: "Add a project address to enable weather hazard monitoring"
        });
      }
      
      // Compile conflict details
      if (conflictItems.length > 0) {
        conflictDetails = conflictItems.join(" | ");
      }
      
      // Final conflict report
      if (hasConflict) {
        addReport({
          pillar: "Conflict Check",
          engine: "dual",
          status: "warning",
          message: `${conflictItems.length} issue(s) detected`,
          details: conflictDetails
        });
        toast.warning("Issues detected - review reports below");
      } else {
        addReport({
          pillar: "Conflict Check",
          engine: "dual",
          status: "success",
          message: "All systems verified",
          details: "Data sources aligned, no weather hazards detected"
        });
        toast.success("Verification complete - no issues");
      }
      
      onUpdate?.();
    } catch (error) {
      console.error("Error checking conflicts:", error);
      addReport({
        pillar: "Conflict Check",
        engine: "dual",
        status: "error",
        message: "Conflict check failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
      toast.error("Failed to check conflicts");
    } finally {
      setLoadingPillar(null);
    }
  };

  const clearReports = () => {
    setReports([]);
    setRunAllProgress(0);
  };

  // Run All Verifications - Sequential execution of all pending checks
  const runAllVerifications = useCallback(async () => {
    if (!projectId) {
      toast.error("Project ID required for verification");
      return;
    }
    
    if (isRunningAll) return;
    
    setIsRunningAll(true);
    setRunAllProgress(0);
    setReports([]); // Clear previous reports
    
    const pendingChecks: Array<{ 
      name: string; 
      key: string;
      fn: () => Promise<void>;
      isPending: boolean;
    }> = [
      { 
        name: "Confirmed Area", 
        key: "area",
        fn: verifyConfirmedArea, 
        isPending: !confirmedArea 
      },
      { 
        name: "Materials", 
        key: "materials",
        fn: verifyMaterials, 
        isPending: materialsCount === 0 
      },
      { 
        name: "OBC Status", 
        key: "obc",
        fn: verifyOBCStatus, 
        isPending: obcCompliance === "pending" 
      },
      { 
        name: "Conflict Check", 
        key: "conflict",
        fn: verifyConflicts, 
        isPending: effectiveConflictStatus === "pending"  // Use effective status (manual ignore = not pending)
      },
    ];
    
    // Filter only pending checks
    const checksToRun = pendingChecks.filter(check => check.isPending);
    
    if (checksToRun.length === 0) {
      toast.info("All verifications already complete");
      setIsRunningAll(false);
      return;
    }
    
    toast.info(`Running ${checksToRun.length} verification(s)...`);
    
    let completed = 0;
    const totalChecks = checksToRun.length;
    
    for (const check of checksToRun) {
      try {
        setLoadingPillar(check.key);
        await check.fn();
        completed++;
        setRunAllProgress(Math.round((completed / totalChecks) * 100));
        
        // Small delay between checks for visual feedback
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Verification failed for ${check.name}:`, error);
        addReport({
          pillar: check.name,
          engine: "dual",
          status: "error",
          message: `Verification failed for ${check.name}`,
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    
    setLoadingPillar(null);
    setIsRunningAll(false);
    
    // Generate summary report
    const successCount = reports.filter(r => r.status === "success").length;
    const warningCount = reports.filter(r => r.status === "warning").length;
    const errorCount = reports.filter(r => r.status === "error").length;
    
    addReport({
      pillar: "📋 Verification Summary",
      engine: "dual",
      status: errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "success",
      message: `Completed: ${successCount} passed, ${warningCount} warnings, ${errorCount} failed`,
      details: `${checksToRun.length} pillar(s) verified. Overall status: ${
        errorCount > 0 ? "Issues require attention" : 
        warningCount > 0 ? "Review warnings before proceeding" : 
        "All systems verified"
      }`
    });
    
    if (errorCount === 0 && warningCount === 0) {
      toast.success("All verifications passed!");
    } else if (errorCount > 0) {
      toast.error(`${errorCount} verification(s) failed`);
    } else {
      toast.warning(`${warningCount} warning(s) detected`);
    }
    
    onUpdate?.();
  }, [
    projectId, isRunningAll, confirmedArea, materialsCount, 
    obcCompliance, conflictStatus, onUpdate
  ]);

  // Calculate pending checks count - USE EFFECTIVE STATUSES
  // This ensures the "Run All" button reflects the true pending state after manual overrides
  const pendingChecksCount = [
    !confirmedArea,
    materialsCount === 0,
    obcCompliance === "pending",
    effectiveConflictStatus === "pending" // Use effective status (not raw conflictStatus)
  ].filter(Boolean).length;

  // Display progress: pillar-based verification rate (using effective rate)
  const displayProgress = isRunningAll ? runAllProgress : verificationRate;

  return (
    <div className="space-y-4">
      {/* Verification Progress + Run All Button - Matching ProjectTimelineBar style */}
      <div className={cn(
        "flex items-center gap-4 p-4 rounded-xl border-2 border-amber-400/40 bg-gradient-to-r from-amber-100 via-orange-50 to-yellow-50 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-yellow-900/20 transition-all duration-500",
        syncAnimationActive && "ring-2 ring-emerald-400 ring-offset-2 animate-pulse shadow-lg shadow-emerald-400/30"
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/20 text-amber-600 transition-all duration-500",
          syncAnimationActive && "bg-emerald-500/30 text-emerald-500 scale-110"
        )}>
          <Brain className={cn("h-5 w-5", syncAnimationActive && "animate-spin")} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground">{t("operationalTruth.title")}</span>
            <span className={cn(
              "text-xs text-muted-foreground transition-all duration-300",
              syncAnimationActive && "text-emerald-500 font-medium"
            )}>
              {Math.round((8 - pendingChecksCount) * (100/8))}% verified
            </span>
            {syncAnimationActive && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 font-medium animate-pulse flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                SYNCING
              </span>
            )}
            {verificationRate === 100 && !isRunningAll && !syncAnimationActive && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                VERIFIED
              </span>
            )}
            {isRunningAll && !syncAnimationActive && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-medium animate-pulse flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                RUNNING
              </span>
            )}
          </div>
          
          {/* Single progress bar for pillar verification */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden relative">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  syncAnimationActive
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                    : verificationRate === 100
                      ? "bg-gradient-to-r from-green-500 to-emerald-500" 
                      : "bg-gradient-to-r from-amber-500 to-orange-500"
                )}
                style={{ width: `${displayProgress}%` }}
              />
              {/* Shimmer effect on sync */}
              {syncAnimationActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1s_ease-in-out_infinite]" />
              )}
              {/* Tick marks */}
              <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                {[25, 50, 75].map((tick) => (
                  <div 
                    key={tick} 
                    className="w-px h-full bg-background/30" 
                    style={{ marginLeft: `${tick}%`, position: 'absolute', left: 0 }} 
                  />
                ))}
              </div>
            </div>
            <span className={cn(
              "text-sm font-medium text-foreground min-w-[40px] text-right transition-all duration-300",
              syncAnimationActive && "text-emerald-500 scale-110"
            )}>
              {displayProgress}%
            </span>
          </div>
        </div>
        
        {/* Buttons container */}
        <div className="flex items-center gap-2">
          {/* Run All Verifications Button - Amber themed */}
          <Button
            size="sm"
            variant="outline"
            onClick={runAllVerifications}
            disabled={isRunningAll || !projectId || pendingChecksCount === 0}
            className={cn(
              "gap-2 min-w-[140px] font-medium transition-all",
              pendingChecksCount > 0 
                ? "border-amber-500 bg-amber-500 hover:bg-amber-600 text-white hover:text-white" 
                : "border-green-500/50 text-green-600 hover:bg-green-500/10"
            )}
          >
            {isRunningAll ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : pendingChecksCount > 0 ? (
              <>
                <Play className="h-4 w-4" />
                Run All ({pendingChecksCount})
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                All Complete
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Run All progress indicator when running */}
      {isRunningAll && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            Running verification checks... {runAllProgress}% complete
          </span>
        </div>
      )}

      {/* Click hint - only show when not running */}
      {!isRunningAll && pendingChecksCount > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Click individual pillars or use "Run All" to trigger AI verification
        </p>
      )}

      {/* 8 Pillars Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Pillar 1: Confirmed Area - Clickable */}
        <PillarCard
          icon={<Ruler className="h-4 w-4" />}
          label={t("operationalTruth.confirmedArea")}
          value={confirmedArea ? `${confirmedArea.toLocaleString()} ${areaUnit}` : t("operationalTruth.pending")}
          status={confirmedArea ? "verified" : "pending"}
          isClickable={!confirmedArea && !!projectId}
          isLoading={loadingPillar === "area"}
          onClick={verifyConfirmedArea}
          subtitle={!confirmedArea ? t("operationalTruth.areaNotDetected", "Area not detected by AI") : undefined}
          sourceOrigin={dataSourceOrigins.area}
          linkedCitations={pillarCitations.area}
        />

        {/* Pillar 2: Materials Count - Clickable */}
        <PillarCard
          icon={<Package className="h-4 w-4" />}
          label={t("operationalTruth.materials")}
          value={materialsCount > 0 ? `${materialsCount} ${t("operationalTruth.items")}` : t("operationalTruth.noneDetected")}
          status={materialsCount > 0 ? "verified" : "pending"}
          isClickable={materialsCount === 0 && !!projectId}
          isLoading={loadingPillar === "materials"}
          onClick={verifyMaterials}
          sourceOrigin={dataSourceOrigins.materials}
          linkedCitations={pillarCitations.materials}
        />

        {/* Pillar 3: Blueprint Status - Clickable for manual validation */}
        {/* Auto-verified if citations are linked, otherwise clickable to ignore */}
        <PillarCard
          icon={<FileText className="h-4 w-4" />}
          label={t("operationalTruth.blueprint")}
          value={
            // If has linked citations -> auto verified
            (pillarCitations.blueprint?.length ?? 0) > 0
              ? t("operationalTruth.analyzed")
              : effectiveBlueprintStatus === "analyzed" 
                ? (manuallyValidatedBlueprint ? t("operationalTruth.manuallyVerified", "Manually Verified") : t("operationalTruth.analyzed")) 
                : effectiveBlueprintStatus === "none" 
                  ? t("operationalTruth.notProvided") 
                  : t("operationalTruth.pending")
          }
          status={
            // Green if has citations OR manually validated OR analyzed
            (pillarCitations.blueprint?.length ?? 0) > 0 || effectiveBlueprintStatus === "analyzed" 
              ? "verified" 
              : effectiveBlueprintStatus === "none" 
                ? "warning" 
                : "pending"
          }
          isClickable={
            // Only clickable if no citations AND not analyzed
            (pillarCitations.blueprint?.length ?? 0) === 0 && effectiveBlueprintStatus !== "analyzed" && !!projectId
          }
          onClick={() => {
            if ((pillarCitations.blueprint?.length ?? 0) === 0 && effectiveBlueprintStatus !== "analyzed") {
              setManuallyValidatedBlueprint(true);
              onBlueprintValidated?.(true);
              addReport({
                pillar: "Blueprint",
                engine: "dual",
                status: "success",
                message: t("operationalTruth.blueprintManuallyValidated", "Blueprint manually validated by user"),
                details: t("operationalTruth.blueprintManuallyValidatedDetails", "User confirmed blueprint data is correct or not required for this project")
              });
              toast.success(t("operationalTruth.blueprintValidated", "Blueprint validated"));
              onUpdate?.();
            }
          }}
          subtitle={
            // Show "Click to ignore it" when no citations and status is none/pending
            (pillarCitations.blueprint?.length ?? 0) === 0 && effectiveBlueprintStatus !== "analyzed"
              ? (effectiveBlueprintStatus === "none" 
                  ? t("operationalTruth.clickToIgnore", "Click to ignore it")
                  : t("operationalTruth.clickToValidate", "Click to manually validate"))
              : undefined
          }
          sourceOrigin={
            (pillarCitations.blueprint?.length ?? 0) > 0 
              ? "blueprint" 
              : manuallyValidatedBlueprint 
                ? "manual" 
                : dataSourceOrigins.blueprint
          }
          linkedCitations={pillarCitations.blueprint}
        />

        {/* Pillar 4: OBC Compliance - Clickable, turns green when acknowledged */}
        <PillarCard
          icon={<Shield className="h-4 w-4" />}
          label={t("operationalTruth.obcStatus")}
          value={
            obcAcknowledged 
              ? t("operationalTruth.acknowledged", "Acknowledged")
              : obcCompliance === "clear" 
                ? t("operationalTruth.clear") 
                : obcCompliance === "permit_required" 
                  ? t("operationalTruth.permitRequired") 
                  : t("operationalTruth.pending")
          }
          status={
            obcAcknowledged 
              ? "verified" 
              : obcCompliance === "clear" 
                ? "verified" 
                : obcCompliance === "permit_required" 
                  ? "warning" 
                  : "pending"
          }
          isClickable={obcCompliance === "pending" && !obcAcknowledged && !!projectId}
          isLoading={loadingPillar === "obc"}
          onClick={verifyOBCStatus}
          sourceOrigin={obcAcknowledged ? "manual" : dataSourceOrigins.obc}
          linkedCitations={pillarCitations.obc}
        />

        {/* Pillar 5: Conflict Status - Clickable or can be ignored */}
        <PillarCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label={t("operationalTruth.conflictCheck")}
          value={
            effectiveConflictStatus === "aligned" 
              ? (manuallyIgnoredConflicts ? t("operationalTruth.ignored", "Ignored") : t("operationalTruth.aligned"))
              : effectiveConflictStatus === "conflict_detected" 
                ? t("operationalTruth.conflicts") 
                : t("operationalTruth.pending")
          }
          status={effectiveConflictStatus === "aligned" ? "verified" : effectiveConflictStatus === "conflict_detected" ? "warning" : "pending"}
          isClickable={effectiveConflictStatus === "pending" && !!projectId}
          isLoading={loadingPillar === "conflict"}
          onClick={verifyConflicts}
          subtitle={effectiveConflictStatus === "pending" ? t("operationalTruth.clickToCheck", "Click to check conflicts") : undefined}
          sourceOrigin={manuallyIgnoredConflicts ? "manual" : dataSourceOrigins.conflict}
          linkedCitations={pillarCitations.conflict}
        />

        {/* Pillar 6: Project Mode - Not clickable */}
        <PillarCard
          icon={<Users className="h-4 w-4" />}
          label={t("operationalTruth.projectMode")}
          value={projectMode === "team" ? t("projects.teamMode") : t("projects.soloMode")}
          status="verified"
          iconColor={projectMode === "team" ? "text-emerald-500" : "text-amber-500"}
          sourceOrigin={dataSourceOrigins.mode || "config"}
          linkedCitations={pillarCitations.mode}
        />

        {/* Pillar 7: Project Size - Not clickable */}
        <PillarCard
          icon={<Gauge className="h-4 w-4" />}
          label={t("operationalTruth.projectSize")}
          value={t(`operationalTruth.${projectSize}`)}
          status="verified"
          sourceOrigin={dataSourceOrigins.size || "config"}
          linkedCitations={pillarCitations.size}
        />

        {/* Pillar 8: Confidence Level - Not clickable */}
        <PillarCard
          icon={<Brain className="h-4 w-4" />}
          label={t("operationalTruth.aiConfidence")}
          value={t(`operationalTruth.${confidenceLevel}`)}
          status={confidenceLevel === "high" ? "verified" : confidenceLevel === "medium" ? "verified" : "warning"}
          sourceOrigin={dataSourceOrigins.confidence || "photo_ai"}
          linkedCitations={pillarCitations.confidence}
        />
      </div>

      {/* Verification Reports Section */}
      {reports.length > 0 && (
        <Card className="mt-4 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Verification Reports
                <span className="text-xs text-muted-foreground font-normal">
                  ({reports.length} result{reports.length !== 1 ? 's' : ''})
                </span>
              </h4>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={runAllVerifications}
                  disabled={isRunningAll || pendingChecksCount === 0}
                  className="gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Re-run
                </Button>
                <Button variant="ghost" size="sm" onClick={clearReports}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {reports.map((report, index) => {
                const isConflictOrWeatherReport = 
                  report.pillar === "Conflict Check" || 
                  report.pillar === "Weather Alert" ||
                  report.pillar === "Weather Check";
                const isOBCReport = report.pillar === "OBC Status";
                const canIgnore = isConflictOrWeatherReport && (report.status === "warning" || report.status === "error");
                const canAcknowledge = isOBCReport && (report.status === "warning" || report.status === "error") && !report.acknowledged;
                
                // Handle acknowledgment - also updates the OBC pillar status to green
                const handleAcknowledge = async () => {
                  // Update report state to acknowledged
                  setReports(prev => prev.map((r, i) => 
                    i === index ? { ...r, acknowledged: true, status: "success" as const } : r
                  ));
                  
                  // Update OBC pillar state to show as verified/green
                  setObcAcknowledged(true);
                  
                  // Persist acknowledgment to database
                  if (projectId) {
                    try {
                      const { data: existingSummary } = await supabase
                        .from("project_summaries")
                        .select("ai_workflow_config")
                        .eq("project_id", projectId)
                        .maybeSingle();

                      const existingConfig = (existingSummary?.ai_workflow_config as Record<string, unknown>) || {};
                      const obcResult = (existingConfig.obcResult as Record<string, unknown>) || {};
                      
                      await supabase
                        .from("project_summaries")
                        .update({
                          ai_workflow_config: {
                            ...existingConfig,
                            obcResult: {
                              ...obcResult,
                              acknowledged: true,
                              acknowledgedAt: new Date().toISOString()
                            }
                          }
                        })
                        .eq("project_id", projectId);
                    } catch (error) {
                      console.error("Failed to save acknowledgment:", error);
                    }
                  }
                  
                  toast.success(t("operationalTruth.acknowledged", "Acknowledged - Thank you for reviewing"));
                  onUpdate?.();
                };
                
                return (
                  <div 
                    key={index}
                    className={cn(
                      "p-3 rounded-lg border text-sm transition-all duration-300",
                      report.acknowledged && "bg-green-500/10 border-green-500/50",
                      !report.acknowledged && report.status === "success" && "bg-green-500/10 border-green-500/50",
                      !report.acknowledged && report.status === "warning" && "bg-amber-500/10 border-amber-500/50",
                      !report.acknowledged && report.status === "error" && "bg-red-500/5 border-red-500/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium flex items-center gap-2">
                        {report.pillar}
                        {report.acknowledged && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Acknowledged
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* "I Understood" button for OBC warnings/errors */}
                        {canAcknowledge && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleAcknowledge}
                            className="h-6 px-2 text-xs gap-1 text-amber-600 hover:text-green-600 hover:bg-green-500/10 border border-amber-500/50 hover:border-green-500/50"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {t("operationalTruth.iUnderstood", "I Understood")}
                          </Button>
                        )}
                        {/* Ignore button for conflict/weather warnings */}
                        {canIgnore && !manuallyIgnoredConflicts && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setManuallyIgnoredConflicts(true);
                                onConflictsIgnored?.(true);
                                addReport({
                                  pillar: "Conflict Check",
                                  engine: "dual",
                                  status: "success",
                                  message: t("operationalTruth.issuesIgnored", "Issues manually ignored by user"),
                                  details: t("operationalTruth.issuesIgnoredDetails", "User acknowledged and chose to proceed despite warnings")
                                });
                                toast.success(t("operationalTruth.conflictsIgnored", "Issues ignored - status updated"));
                                onUpdate?.();
                              }}
                              className="h-6 px-2 text-xs gap-1 text-amber-600 hover:text-green-600 hover:bg-green-500/10"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {t("operationalTruth.ignoreIssues", "Ignore Issues")}
                            </Button>
                            {onNavigateToTaskTimeline && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  addReport({
                                    pillar: "Conflict Check",
                                    engine: "dual",
                                    status: "warning",
                                    message: t("operationalTruth.navigatedToTimeline", "User navigated to Timeline to reschedule tasks"),
                                    details: t("operationalTruth.navigatedToTimelineDetails", "Opening task calendar for drag-and-drop rescheduling")
                                  });
                                  onNavigateToTaskTimeline();
                                }}
                                className="h-6 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                              >
                                <CalendarDays className="h-3 w-3" />
                                {t("operationalTruth.rescheduleTasks", "Reschedule Tasks")}
                              </Button>
                            )}
                          </>
                        )}
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          report.engine === "gemini" && "bg-blue-500/20 text-blue-600",
                          report.engine === "openai" && "bg-emerald-500/20 text-emerald-600",
                          report.engine === "dual" && "bg-purple-500/20 text-purple-600"
                        )}>
                          {report.engine === "gemini" ? "Gemini" : report.engine === "openai" ? "OpenAI" : "Dual Engine"}
                        </span>
                      </div>
                    </div>
                    <p className={cn(
                      "text-sm",
                      report.acknowledged && "text-green-700 dark:text-green-400",
                      !report.acknowledged && report.status === "success" && "text-green-700 dark:text-green-400",
                      !report.acknowledged && report.status === "warning" && "text-amber-700 dark:text-amber-400",
                      !report.acknowledged && report.status === "error" && "text-red-700 dark:text-red-400"
                    )}>
                      {report.acknowledged ? t("operationalTruth.reviewedAndAcknowledged", "Reviewed and acknowledged by user") : report.message}
                    </p>
                    {report.details && !report.acknowledged && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.details}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
