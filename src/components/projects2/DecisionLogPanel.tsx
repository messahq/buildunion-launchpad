import { useState, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Eye, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Shield,
  FileCheck,
  DollarSign,
  ClipboardList
} from "lucide-react";
import { ProBadge } from "@/components/ui/pro-badge";
import { cn } from "@/lib/utils";
import type { OBCValidationDetails, OBCReference } from "@/types/operationalTruth";

interface EngineOutput {
  engine: "gemini" | "openai";
  type: "visual" | "regulatory" | "synthesis";
  result: string;
  confidence?: number;
  timestamp?: string;
}

interface DecisionLogPanelProps {
  geminiOutput?: string | null;
  openaiOutput?: string | null;
  synthesisResult?: {
    answer?: string;
    verification_status?: string;
    sources?: any[];
  } | null;
  detectedArea?: number | null;
  blueprintArea?: number | null;
  materials?: any[];
  obcDetails?: OBCValidationDetails | null;
  isPro?: boolean;
  className?: string;
}

export const DecisionLogPanel = forwardRef<HTMLDivElement, DecisionLogPanelProps>(({
  geminiOutput,
  openaiOutput,
  synthesisResult,
  detectedArea,
  blueprintArea,
  materials = [],
  obcDetails,
  isPro = false,
  className,
}, ref) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate conflict status
  const hasAreaConflict = detectedArea && blueprintArea && 
    Math.abs(detectedArea - blueprintArea) > (detectedArea * 0.1);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "conflict":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const engineOutputs: EngineOutput[] = [
    ...(geminiOutput ? [{
      engine: "gemini" as const,
      type: "visual" as const,
      result: geminiOutput,
      confidence: 0.92,
    }] : []),
    ...(openaiOutput ? [{
      engine: "openai" as const,
      type: "regulatory" as const,
      result: openaiOutput,
      confidence: 0.88,
    }] : []),
  ];

  if (!isPro) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            {t("decisionLog.title", "AI Decision Log")}
            <ProBadge tier="pro" size="sm" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("decisionLog.upgradeMessage", "Upgrade to Pro to see detailed AI reasoning and engine outputs.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("transition-all", className)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                {t("decisionLog.title", "AI Decision Log")}
                {hasAreaConflict && (
                  <Badge variant="destructive" className="text-[10px] px-1.5">
                    {t("decisionLog.conflictDetected", "CONFLICT")}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <ScrollArea className="max-h-[400px]">
              {/* Summary Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("decisionLog.enginesUsed", "Engines Used")}:
                  </span>
                  <div className="flex gap-1">
                    {geminiOutput && (
                      <Badge variant="outline" className="text-[10px]">
                        <Eye className="h-3 w-3 mr-1" />
                        Gemini
                      </Badge>
                    )}
                    {openaiOutput && (
                      <Badge variant="outline" className="text-[10px]">
                        <FileText className="h-3 w-3 mr-1" />
                        GPT-5
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Area Comparison */}
                {(detectedArea || blueprintArea) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("decisionLog.areaComparison", "Area Comparison")}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <span className="text-muted-foreground">
                            {t("decisionLog.photoDetected", "Photo AI")}:
                          </span>
                          <span className="font-medium">
                            {detectedArea ? `${detectedArea} sq ft` : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <span className="text-muted-foreground">
                            {t("decisionLog.blueprint", "Blueprint")}:
                          </span>
                          <span className="font-medium">
                            {blueprintArea ? `${blueprintArea} sq ft` : "—"}
                          </span>
                        </div>
                      </div>
                      {hasAreaConflict && (
                        <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span>
                            {t("decisionLog.areaConflictWarning", 
                              "Area measurements differ by more than 10%. Manual verification recommended."
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* OBC Regulatory Analysis Section */}
                {obcDetails && (
                  <>
                    <Separator />
                    <Collapsible
                      open={expandedSections["obc"]}
                      onOpenChange={() => toggleSection("obc")}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between cursor-pointer p-2 rounded-md hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <Shield className={cn(
                              "h-4 w-4",
                              obcDetails.status === "validated" ? "text-green-500" :
                              obcDetails.status === "warning" ? "text-amber-500" :
                              obcDetails.status === "permit_required" ? "text-blue-500" :
                              "text-muted-foreground"
                            )} />
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {t("decisionLog.obcAnalysis", "OBC Regulatory Analysis")}
                            </h4>
                            <Badge 
                              variant={obcDetails.permitRequired ? "default" : "secondary"}
                              className={cn(
                                "text-[10px] px-1.5",
                                obcDetails.permitRequired && "bg-amber-500 hover:bg-amber-600"
                              )}
                            >
                              {obcDetails.permitRequired 
                                ? t("decisionLog.permitRequired", "Permit Required") 
                                : t("decisionLog.noPermit", "No Permit")}
                            </Badge>
                          </div>
                          {expandedSections["obc"] ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 space-y-3">
                          {/* Compliance Score */}
                          {obcDetails.complianceScore > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {t("decisionLog.complianceScore", "Compliance Score")}
                                </span>
                                <span className={cn(
                                  "font-medium",
                                  obcDetails.complianceScore >= 80 ? "text-green-600" :
                                  obcDetails.complianceScore >= 60 ? "text-amber-600" :
                                  "text-red-600"
                                )}>
                                  {obcDetails.complianceScore}%
                                </span>
                              </div>
                              <Progress 
                                value={obcDetails.complianceScore} 
                                className="h-1.5"
                              />
                            </div>
                          )}

                          {/* Permit Details */}
                          {obcDetails.permitRequired && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs">
                                <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground block">
                                    {t("decisionLog.permitType", "Type")}
                                  </span>
                                  <span className="font-medium capitalize">
                                    {obcDetails.permitType || "Building"}
                                  </span>
                                </div>
                              </div>
                              {obcDetails.estimatedPermitCost && (
                                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs">
                                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                  <div>
                                    <span className="text-muted-foreground block">
                                      {t("decisionLog.estimatedCost", "Est. Cost")}
                                    </span>
                                    <span className="font-medium">
                                      ${obcDetails.estimatedPermitCost.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* OBC References */}
                          {obcDetails.references && obcDetails.references.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs">
                                <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium">
                                  {t("decisionLog.obcReferences", "OBC References")} ({obcDetails.references.length})
                                </span>
                              </div>
                              <div className="space-y-1">
                                {obcDetails.references.map((ref: OBCReference, index: number) => (
                                  <div 
                                    key={index}
                                    className={cn(
                                      "p-2 rounded-md text-xs",
                                      ref.relevance === "direct" ? "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500" :
                                      ref.relevance === "related" ? "bg-amber-50 dark:bg-amber-950/30 border-l-2 border-amber-500" :
                                      "bg-muted/30"
                                    )}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-mono font-medium text-foreground">
                                        {ref.code}
                                      </span>
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "text-[9px] px-1",
                                          ref.relevance === "direct" ? "border-blue-500 text-blue-600" :
                                          ref.relevance === "related" ? "border-amber-500 text-amber-600" :
                                          ""
                                        )}
                                      >
                                        {ref.relevance}
                                      </Badge>
                                    </div>
                                    <p className="font-medium text-foreground/90">{ref.title}</p>
                                    <p className="text-muted-foreground mt-0.5">{ref.summary}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recommendations */}
                          {obcDetails.recommendations && obcDetails.recommendations.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-xs font-medium text-muted-foreground">
                                {t("decisionLog.recommendations", "Recommendations")}
                              </span>
                              <ul className="space-y-1">
                                {obcDetails.recommendations.map((rec: string, index: number) => (
                                  <li key={index} className="flex items-start gap-2 text-xs">
                                    <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Regulatory Notes */}
                          {obcDetails.notes && obcDetails.notes.length > 0 && (
                            <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                <span className="font-medium text-amber-800 dark:text-amber-400">
                                  {t("decisionLog.regulatoryNotes", "Important Notes")}
                                </span>
                              </div>
                              <ul className="space-y-0.5 text-amber-700 dark:text-amber-300">
                                {obcDetails.notes.map((note: string, index: number) => (
                                  <li key={index}>• {note}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}

                {/* Engine Outputs */}
                {engineOutputs.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("decisionLog.rawOutputs", "Engine Outputs")}
                      </h4>
                      {engineOutputs.map((output, index) => (
                        <Collapsible
                          key={index}
                          open={expandedSections[`engine-${index}`]}
                          onOpenChange={() => toggleSection(`engine-${index}`)}
                        >
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
                              <div className="flex items-center gap-2">
                                {output.engine === "gemini" ? (
                                  <Eye className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <FileText className="h-4 w-4 text-green-500" />
                                )}
                                <span className="text-sm font-medium capitalize">
                                  {output.engine} — {output.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {output.confidence && (
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(output.confidence * 100)}%
                                  </span>
                                )}
                                {expandedSections[`engine-${index}`] ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 p-3 rounded-md bg-muted/30 text-xs font-mono whitespace-pre-wrap max-h-[150px] overflow-auto">
                              {output.result}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </>
                )}

                {/* Synthesis Result */}
                {synthesisResult?.answer && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t("decisionLog.synthesis", "Synthesis Result")}
                        </h4>
                        {getStatusIcon(synthesisResult.verification_status || "pending")}
                      </div>
                      <p className="text-sm text-foreground/80">
                        {synthesisResult.answer}
                      </p>
                    </div>
                  </>
                )}

                {/* Materials Detected */}
                {materials.length > 0 && (
                  <>
                    <Separator />
                    <Collapsible
                      open={expandedSections["materials"]}
                      onOpenChange={() => toggleSection("materials")}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between cursor-pointer">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {t("decisionLog.materialsDetected", "Materials Detected")} ({materials.length})
                          </h4>
                          {expandedSections["materials"] ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 space-y-1">
                          {materials.map((material, index) => (
                            <div 
                              key={index}
                              className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30"
                            >
                              <span>{material.name || material.material}</span>
                              <span className="text-muted-foreground">
                                {material.quantity} {material.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
});

DecisionLogPanel.displayName = "DecisionLogPanel";
