import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Brain, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown,
  FileText,
  Users,
  FileSignature,
  Map,
  Cloud,
  DollarSign,
  Eye,
  RefreshCw,
  Send,
  Loader2,
  Ruler,
  Package,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OperationalTruth } from "@/types/operationalTruth";
import { useTranslation } from "react-i18next";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface ProjectTabData {
  overview: {
    hasDescription: boolean;
    descriptionLength: number;
  };
  team: {
    memberCount: number;
    hasAssignedTasks: boolean;
  };
  documents: {
    documentCount: number;
    hasBlueprint: boolean;
    hasPhotos: boolean;
  };
  contracts: {
    contractCount: number;
    signedCount: number;
    pendingCount: number;
  };
  siteMap: {
    hasAddress: boolean;
    hasConflicts: boolean;
    conflictCount: number;
  };
  weather: {
    hasWeatherData: boolean;
    hasAlerts: boolean;
  };
  materials: {
    totalMaterialCost: number;
    totalLaborCost: number;
    grandTotal: number;
  };
}

interface SynthesisAnalysis {
  overallScore: number;
  pillarsAnalysis: {
    pillar: string;
    status: "verified" | "warning" | "pending";
    value: string;
    recommendation?: string;
  }[];
  tabsAnalysis: {
    tab: string;
    status: "complete" | "partial" | "empty";
    findings: string;
    recommendation?: string;
  }[];
  summary: string;
  actionItems: string[];
}

interface VerificationSynthesisPanelProps {
  operationalTruth: OperationalTruth;
  projectTabData: ProjectTabData;
  projectName: string;
  onSynthesisUpdate?: (synthesis: SynthesisAnalysis) => void;
  isLoading?: boolean;
}

// ============================================
// SYNTHESIS GENERATOR
// ============================================

function generateSynthesis(
  operationalTruth: OperationalTruth,
  projectTabData: ProjectTabData,
  userInstruction?: string
): SynthesisAnalysis {
  const pillarsAnalysis: SynthesisAnalysis["pillarsAnalysis"] = [];
  const tabsAnalysis: SynthesisAnalysis["tabsAnalysis"] = [];
  const actionItems: string[] = [];
  let totalScore = 0;
  let maxScore = 0;

  // Analyze 8 Pillars
  // 1. Confirmed Area
  pillarsAnalysis.push({
    pillar: "Confirmed Area",
    status: operationalTruth.confirmedArea ? "verified" : "pending",
    value: operationalTruth.confirmedArea 
      ? `${operationalTruth.confirmedArea.toLocaleString()} ${operationalTruth.areaUnit}`
      : "Not detected",
    recommendation: !operationalTruth.confirmedArea 
      ? "Upload site photos or blueprints for AI area detection" 
      : undefined,
  });
  maxScore += 15;
  if (operationalTruth.confirmedArea) totalScore += 15;
  else actionItems.push("Add site photos for automatic area detection");

  // 2. Materials Count
  pillarsAnalysis.push({
    pillar: "Materials",
    status: operationalTruth.materialsCount > 0 ? "verified" : "pending",
    value: operationalTruth.materialsCount > 0 
      ? `${operationalTruth.materialsCount} items detected` 
      : "None detected",
    recommendation: operationalTruth.materialsCount === 0 
      ? "AI will extract materials from photos and blueprints" 
      : undefined,
  });
  maxScore += 15;
  if (operationalTruth.materialsCount > 0) totalScore += 15;
  else actionItems.push("Upload project photos for material extraction");

  // 3. Blueprint Status
  pillarsAnalysis.push({
    pillar: "Blueprint",
    status: operationalTruth.blueprintStatus === "analyzed" ? "verified" : 
            operationalTruth.blueprintStatus === "none" ? "warning" : "pending",
    value: operationalTruth.blueprintStatus === "analyzed" ? "Analyzed" : 
           operationalTruth.blueprintStatus === "none" ? "Not provided" : "Pending",
    recommendation: operationalTruth.blueprintStatus !== "analyzed" 
      ? "Upload PDF blueprints for enhanced accuracy" 
      : undefined,
  });
  maxScore += 10;
  if (operationalTruth.blueprintStatus === "analyzed") totalScore += 10;
  else if (operationalTruth.blueprintStatus === "none") totalScore += 5;

  // 4. OBC Compliance
  pillarsAnalysis.push({
    pillar: "OBC Status",
    status: operationalTruth.obcCompliance === "clear" ? "verified" : 
            operationalTruth.obcCompliance === "permit_required" ? "warning" : "pending",
    value: operationalTruth.obcCompliance === "clear" ? "Clear - No permit required" : 
           operationalTruth.obcCompliance === "permit_required" ? "Permit Required" : "Pending analysis",
    recommendation: operationalTruth.obcCompliance === "pending" 
      ? "Complete project details for OBC validation" 
      : operationalTruth.obcCompliance === "permit_required"
      ? "Obtain required permits before starting work"
      : undefined,
  });
  maxScore += 15;
  if (operationalTruth.obcCompliance === "clear") totalScore += 15;
  else if (operationalTruth.obcCompliance === "permit_required") {
    totalScore += 10;
    actionItems.push("Apply for required building permits");
  }
  else actionItems.push("Complete regulatory compliance check");

  // 5. Conflict Status
  pillarsAnalysis.push({
    pillar: "Conflict Check",
    status: operationalTruth.conflictStatus === "aligned" ? "verified" : 
            operationalTruth.conflictStatus === "conflict_detected" ? "warning" : "pending",
    value: operationalTruth.conflictStatus === "aligned" ? "No conflicts" : 
           operationalTruth.conflictStatus === "conflict_detected" ? "Conflicts detected" : "Pending",
    recommendation: operationalTruth.conflictStatus === "conflict_detected" 
      ? "Review and resolve detected conflicts in Decision Log" 
      : undefined,
  });
  maxScore += 15;
  if (operationalTruth.conflictStatus === "aligned") totalScore += 15;
  else if (operationalTruth.conflictStatus === "conflict_detected") {
    totalScore += 5;
    actionItems.push("Resolve site-vs-blueprint conflicts");
  }

  // 6. Project Mode
  pillarsAnalysis.push({
    pillar: "Project Mode",
    status: "verified",
    value: operationalTruth.projectMode === "team" ? "Team Mode" : "Solo Mode",
  });
  maxScore += 10;
  totalScore += 10;

  // 7. Project Size
  pillarsAnalysis.push({
    pillar: "Project Size",
    status: "verified",
    value: operationalTruth.projectSize.charAt(0).toUpperCase() + operationalTruth.projectSize.slice(1),
  });
  maxScore += 10;
  totalScore += 10;

  // 8. Confidence Level
  pillarsAnalysis.push({
    pillar: "AI Confidence",
    status: operationalTruth.confidenceLevel === "high" ? "verified" : 
            operationalTruth.confidenceLevel === "medium" ? "verified" : "warning",
    value: operationalTruth.confidenceLevel.charAt(0).toUpperCase() + operationalTruth.confidenceLevel.slice(1),
    recommendation: operationalTruth.confidenceLevel === "low" 
      ? "Add more project data to improve AI confidence" 
      : undefined,
  });
  maxScore += 10;
  if (operationalTruth.confidenceLevel === "high") totalScore += 10;
  else if (operationalTruth.confidenceLevel === "medium") totalScore += 7;
  else totalScore += 3;

  // Analyze Project Tabs
  // Overview
  tabsAnalysis.push({
    tab: "Overview",
    status: projectTabData.overview.hasDescription ? "complete" : "partial",
    findings: projectTabData.overview.hasDescription 
      ? `Description: ${projectTabData.overview.descriptionLength} characters` 
      : "No project description",
    recommendation: !projectTabData.overview.hasDescription 
      ? "Add a detailed project description" 
      : undefined,
  });

  // Team
  tabsAnalysis.push({
    tab: "Team",
    status: projectTabData.team.memberCount > 0 ? 
            (projectTabData.team.hasAssignedTasks ? "complete" : "partial") : "empty",
    findings: projectTabData.team.memberCount > 0 
      ? `${projectTabData.team.memberCount} members${projectTabData.team.hasAssignedTasks ? " with assigned tasks" : ""}` 
      : "No team members",
    recommendation: projectTabData.team.memberCount === 0 && operationalTruth.projectMode === "team"
      ? "Invite team members to collaborate"
      : !projectTabData.team.hasAssignedTasks && projectTabData.team.memberCount > 0
      ? "Assign tasks to team members"
      : undefined,
  });
  if (operationalTruth.projectMode === "team" && projectTabData.team.memberCount === 0) {
    actionItems.push("Invite team members for collaboration");
  }

  // Documents
  tabsAnalysis.push({
    tab: "Documents",
    status: projectTabData.documents.documentCount > 0 ? 
            (projectTabData.documents.hasBlueprint ? "complete" : "partial") : "empty",
    findings: projectTabData.documents.documentCount > 0 
      ? `${projectTabData.documents.documentCount} documents${projectTabData.documents.hasBlueprint ? " (with blueprints)" : ""}` 
      : "No documents uploaded",
    recommendation: projectTabData.documents.documentCount === 0 
      ? "Upload project documents and blueprints" 
      : undefined,
  });

  // Contracts
  tabsAnalysis.push({
    tab: "Contracts",
    status: projectTabData.contracts.signedCount > 0 ? "complete" : 
            projectTabData.contracts.contractCount > 0 ? "partial" : "empty",
    findings: projectTabData.contracts.contractCount > 0 
      ? `${projectTabData.contracts.contractCount} contracts (${projectTabData.contracts.signedCount} signed, ${projectTabData.contracts.pendingCount} pending)` 
      : "No contracts created",
    recommendation: projectTabData.contracts.pendingCount > 0 
      ? "Follow up on pending contract signatures" 
      : projectTabData.contracts.contractCount === 0
      ? "Create a project contract for client"
      : undefined,
  });
  if (projectTabData.contracts.pendingCount > 0) {
    actionItems.push(`Follow up on ${projectTabData.contracts.pendingCount} pending contracts`);
  }

  // Site Map
  tabsAnalysis.push({
    tab: "Site Map",
    status: projectTabData.siteMap.hasAddress ? 
            (projectTabData.siteMap.hasConflicts ? "partial" : "complete") : "empty",
    findings: projectTabData.siteMap.hasAddress 
      ? `Site mapped${projectTabData.siteMap.hasConflicts ? ` with ${projectTabData.siteMap.conflictCount} conflicts` : ""}` 
      : "No site address",
    recommendation: projectTabData.siteMap.hasConflicts 
      ? "Review conflict markers on site map" 
      : !projectTabData.siteMap.hasAddress
      ? "Add project address for site mapping"
      : undefined,
  });

  // Weather
  tabsAnalysis.push({
    tab: "Weather",
    status: projectTabData.weather.hasWeatherData ? 
            (projectTabData.weather.hasAlerts ? "partial" : "complete") : "empty",
    findings: projectTabData.weather.hasWeatherData 
      ? `Weather data available${projectTabData.weather.hasAlerts ? " (alerts active)" : ""}` 
      : "No weather data",
    recommendation: projectTabData.weather.hasAlerts 
      ? "Review active weather alerts before scheduling work" 
      : undefined,
  });
  if (projectTabData.weather.hasAlerts) {
    actionItems.push("Review weather alerts before outdoor work");
  }

  // Materials
  tabsAnalysis.push({
    tab: "Materials",
    status: projectTabData.materials.grandTotal > 0 ? "complete" : "empty",
    findings: projectTabData.materials.grandTotal > 0 
      ? `Total: $${projectTabData.materials.grandTotal.toLocaleString()} (Materials: $${projectTabData.materials.totalMaterialCost.toLocaleString()}, Labor: $${projectTabData.materials.totalLaborCost.toLocaleString()})` 
      : "No cost breakdown",
    recommendation: projectTabData.materials.grandTotal === 0 
      ? "AI will calculate costs from detected materials" 
      : undefined,
  });

  // Calculate overall score
  const overallScore = Math.round((totalScore / maxScore) * 100);

  // Generate summary
  const verifiedPillars = pillarsAnalysis.filter(p => p.status === "verified").length;
  const completeTabs = tabsAnalysis.filter(t => t.status === "complete").length;
  
  let summary = `Project verification at ${overallScore}%. `;
  summary += `${verifiedPillars} of 8 operational pillars verified. `;
  summary += `${completeTabs} of 7 project sections complete. `;
  
  if (actionItems.length > 0) {
    summary += `${actionItems.length} action items require attention.`;
  } else {
    summary += "Project is fully prepared for execution.";
  }

  // Handle user instruction
  if (userInstruction) {
    const instruction = userInstruction.toLowerCase();
    if (instruction.includes("update") || instruction.includes("refresh")) {
      summary = "Refreshing project data... " + summary;
    }
    if (instruction.includes("focus") && instruction.includes("contract")) {
      actionItems.unshift("Priority: Complete contract management");
    }
    if (instruction.includes("focus") && instruction.includes("team")) {
      actionItems.unshift("Priority: Complete team setup");
    }
  }

  return {
    overallScore,
    pillarsAnalysis,
    tabsAnalysis,
    summary,
    actionItems,
  };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function VerificationSynthesisPanel({
  operationalTruth,
  projectTabData,
  projectName,
  onSynthesisUpdate,
  isLoading = false,
}: VerificationSynthesisPanelProps) {
  const { t } = useTranslation();
  const [instruction, setInstruction] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [synthesis, setSynthesis] = useState<SynthesisAnalysis | null>(null);
  const [showPillars, setShowPillars] = useState(true);
  const [showTabs, setShowTabs] = useState(false);

  const runSynthesis = async (userInstruction?: string) => {
    setIsAnalyzing(true);
    
    // Simulate AI processing delay for UX
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const result = generateSynthesis(operationalTruth, projectTabData, userInstruction);
    setSynthesis(result);
    onSynthesisUpdate?.(result);
    setIsAnalyzing(false);
    setInstruction("");
  };

  const handleSubmitInstruction = () => {
    if (instruction.trim()) {
      runSynthesis(instruction.trim());
    }
  };

  // Auto-run synthesis on mount
  useEffect(() => {
    runSynthesis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusIcon = (status: "verified" | "warning" | "pending" | "complete" | "partial" | "empty") => {
    switch (status) {
      case "verified":
      case "complete":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning":
      case "partial":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Brain className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab.toLowerCase()) {
      case "overview": return <Eye className="h-4 w-4" />;
      case "team": return <Users className="h-4 w-4" />;
      case "documents": return <FileText className="h-4 w-4" />;
      case "contracts": return <FileSignature className="h-4 w-4" />;
      case "site map": return <Map className="h-4 w-4" />;
      case "weather": return <Cloud className="h-4 w-4" />;
      case "materials": return <DollarSign className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getPillarIcon = (pillar: string) => {
    switch (pillar.toLowerCase()) {
      case "confirmed area": return <Ruler className="h-4 w-4" />;
      case "materials": return <Package className="h-4 w-4" />;
      case "blueprint": return <FileText className="h-4 w-4" />;
      case "obc status": return <Shield className="h-4 w-4" />;
      case "conflict check": return <AlertTriangle className="h-4 w-4" />;
      case "project mode": return <Users className="h-4 w-4" />;
      case "project size": return <Ruler className="h-4 w-4" />;
      case "ai confidence": return <Brain className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Dual-Engine Synthesis
                {synthesis && (
                  <Badge 
                    variant={synthesis.overallScore >= 80 ? "default" : 
                            synthesis.overallScore >= 50 ? "secondary" : "destructive"}
                    className="text-[10px]"
                  >
                    {synthesis.overallScore}% Verified
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Analyzing 8 Pillars + 7 Project Sections
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => runSynthesis()}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Progress */}
        {synthesis && (
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Verification Progress</span>
              <span className="text-sm text-muted-foreground">{synthesis.overallScore}%</span>
            </div>
            <Progress value={synthesis.overallScore} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">{synthesis.summary}</p>
          </div>
        )}

        {/* 8 Pillars Analysis */}
        <Collapsible open={showPillars} onOpenChange={setShowPillars}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                8 Pillars of Operational Truth
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                showPillars && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            {synthesis && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {synthesis.pillarsAnalysis.map((pillar, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "p-3 rounded-lg border",
                      pillar.status === "verified" && "bg-green-500/5 border-green-500/30",
                      pillar.status === "warning" && "bg-amber-500/5 border-amber-500/30",
                      pillar.status === "pending" && "bg-muted/30 border-border"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getPillarIcon(pillar.pillar)}
                      <span className="text-xs font-medium">{pillar.pillar}</span>
                      {getStatusIcon(pillar.status)}
                    </div>
                    <div className="text-sm text-foreground">{pillar.value}</div>
                    {pillar.recommendation && (
                      <div className="text-xs text-muted-foreground mt-1">
                        → {pillar.recommendation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Project Tabs Analysis */}
        <Collapsible open={showTabs} onOpenChange={setShowTabs}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                7 Project Sections
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                showTabs && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            {synthesis && (
              <div className="space-y-2">
                {synthesis.tabsAnalysis.map((tab, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "p-3 rounded-lg border flex items-start gap-3",
                      tab.status === "complete" && "bg-green-500/5 border-green-500/30",
                      tab.status === "partial" && "bg-amber-500/5 border-amber-500/30",
                      tab.status === "empty" && "bg-muted/30 border-border"
                    )}
                  >
                    <div className="mt-0.5">{getTabIcon(tab.tab)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{tab.tab}</span>
                        {getStatusIcon(tab.status)}
                      </div>
                      <div className="text-xs text-muted-foreground">{tab.findings}</div>
                      {tab.recommendation && (
                        <div className="text-xs text-primary mt-1">
                          → {tab.recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Action Items */}
        {synthesis && synthesis.actionItems.length > 0 && (
          <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Action Items ({synthesis.actionItems.length})</span>
            </div>
            <ul className="space-y-1">
              {synthesis.actionItems.map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instruction Input */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Give instructions to update the synthesis:
          </div>
          <div className="flex gap-2">
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g., 'Focus on contract completion' or 'Update team assignments'"
              className="min-h-[60px] text-sm resize-none"
              disabled={isAnalyzing}
            />
          </div>
          <Button 
            size="sm" 
            onClick={handleSubmitInstruction}
            disabled={!instruction.trim() || isAnalyzing}
            className="w-full gap-2"
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Analyze with Instruction
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
