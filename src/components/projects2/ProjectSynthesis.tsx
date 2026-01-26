import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Sparkles, 
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileText,
  Zap,
  Shield,
  Brain
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterAnswers, AITriggers } from "./FilterQuestions";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface DualEngineOutput {
  gemini: {
    role: string;
    model: string;
    area: number | null;
    areaUnit: string;
    confidence: "high" | "medium" | "low";
    surfaceType: string;
    roomType: string;
    visualFindings: string[];
    rawExcerpt?: string;
  };
  openai: {
    role: string;
    model: string;
    obcReferences: (string | { code: string; title: string; relevance: string; summary: string })[];
    regulatoryNotes: string[];
    permitRequired: boolean;
    validationStatus: "validated" | "warning" | "pending";
    permitType?: "building" | "electrical" | "plumbing" | "hvac" | "none";
    inspectionRequired?: boolean;
    estimatedPermitCost?: number | null;
    complianceScore?: number;
    recommendations?: string[];
    rawExcerpt?: string;
  };
}

export interface SynthesisResult {
  operationalTruth: {
    confirmedArea: number | null;
    areaUnit: string;
    materialsCount: number;
    hasBlueprint: boolean;
  };
  conflicts: Array<{
    field: string;
    geminiValue: string;
    openaiValue: string;
    severity: "high" | "medium" | "low";
    resolution?: string;
  }>;
  verificationStatus: "verified" | "conflicts_detected" | "pending";
}

export interface ProjectSynthesisProps {
  filterAnswers: FilterAnswers;
  aiTriggers: AITriggers;
  dualEngineOutput?: DualEngineOutput;
  synthesisResult?: SynthesisResult;
  isLoading?: boolean;
}

// ============================================
// AI EXPLANATION MESSAGE GENERATOR
// ============================================

function generateExplanationMessage(
  filterAnswers: FilterAnswers, 
  aiTriggers: AITriggers,
  dualEngineOutput?: DualEngineOutput
): string[] {
  const messages: string[] = [];
  
  // Opening message
  messages.push("I asked these questions because BuildUnion doesn't estimate—it analyzes.");
  
  // Based on filter answers, explain what was activated
  if (filterAnswers.inputFilter.dataAvailability === "both" && aiTriggers.ragEnabled) {
    messages.push("✓ With both blueprints and photos available, I've enabled visual comparison (RAG) to detect discrepancies between plans and site reality.");
  }
  
  if (filterAnswers.inputFilter.siteModifications !== "none" && filterAnswers.inputFilter.siteModifications !== "unknown") {
    messages.push(`✓ Since you indicated ${filterAnswers.inputFilter.siteModifications === "significant" ? "significant" : "minor"} site modifications, Conflict Detection is active to flag plan-vs-reality differences.`);
  }
  
  if (aiTriggers.obcSearch) {
    const workTypes: string[] = [];
    if (filterAnswers.technicalFilter.affectsStructure) workTypes.push("structural work");
    if (filterAnswers.technicalFilter.affectsMechanical) workTypes.push("mechanical systems");
    if (filterAnswers.technicalFilter.affectsFacade) workTypes.push("facade modifications");
    
    if (dualEngineOutput?.openai?.obcReferences?.length) {
      messages.push(`✓ OpenAI validated Ontario Building Code compliance for ${workTypes.join(" and ")}: [${dualEngineOutput.openai.obcReferences.join(", ")}]`);
    } else {
      messages.push(`✓ Because you selected ${workTypes.join(" and ")}, OpenAI will validate OBC compliance when processing completes.`);
    }
  }
  
  if (aiTriggers.recommendTeamMode) {
    const reasons: string[] = [];
    if (filterAnswers.technicalFilter.hasProjectManager !== "no") reasons.push("you have a designated project lead");
    if (filterAnswers.workflowFilter.subcontractorCount !== "1-2") reasons.push(`${filterAnswers.workflowFilter.subcontractorCount} trades to coordinate`);
    if (filterAnswers.technicalFilter.affectsStructure) reasons.push("structural work requires coordination");
    
    messages.push(`→ Team Mode is recommended because ${reasons.join(", ")}.`);
  }
  
  // Add detection results if available
  if (dualEngineOutput?.gemini?.area) {
    messages.push(`📐 Detected area: ${dualEngineOutput.gemini.area.toLocaleString()} ${dualEngineOutput.gemini.areaUnit}`);
  }
  
  return messages;
}

// ============================================
// TYPEWRITER EFFECT HOOK
// ============================================

function useTypewriter(messages: string[], speed: number = 25) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentMessageIndex >= messages.length) {
      setIsComplete(true);
      return;
    }

    const currentMessage = messages[currentMessageIndex];
    
    if (currentCharIndex < currentMessage.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + currentMessage[currentCharIndex]);
        setCurrentCharIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      // Move to next message
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + "\n\n");
        setCurrentMessageIndex(prev => prev + 1);
        setCurrentCharIndex(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentMessageIndex, currentCharIndex, messages, speed]);

  const skipToEnd = () => {
    setDisplayedText(messages.join("\n\n"));
    setIsComplete(true);
  };

  return { displayedText, isComplete, skipToEnd };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProjectSynthesis({
  filterAnswers,
  aiTriggers,
  dualEngineOutput,
  synthesisResult,
  isLoading = false,
}: ProjectSynthesisProps) {
  const [showDecisionLog, setShowDecisionLog] = useState(false);
  
  const explanationMessages = generateExplanationMessage(filterAnswers, aiTriggers, dualEngineOutput);
  const { displayedText, isComplete, skipToEnd } = useTypewriter(explanationMessages, 15);

  const hasConflicts = synthesisResult?.conflicts && synthesisResult.conflicts.length > 0;
  const verificationStatus = synthesisResult?.verificationStatus || "pending";

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Project Synthesis
                {hasConflicts ? (
                  <Badge variant="destructive" className="text-[10px]">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    CONFLICT DETECTED
                  </Badge>
                ) : verificationStatus === "verified" ? (
                  <Badge className="text-[10px] bg-green-500/20 text-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    VERIFIED
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    <Zap className="h-3 w-3 mr-1" />
                    ANALYZING
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Dual-Engine Analysis: Gemini (Visual) + OpenAI (Regulatory)
              </p>
            </div>
          </div>
          
          {!isComplete && (
            <Button variant="ghost" size="sm" onClick={skipToEnd}>
              Skip
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* AI Explanation Message with Typewriter Effect */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="text-sm text-foreground whitespace-pre-wrap min-h-[80px]">
            {displayedText}
            {!isComplete && <span className="animate-pulse">▊</span>}
          </div>
        </div>

        {/* Operational Truth Summary */}
        {synthesisResult?.operationalTruth && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground">Confirmed Area</div>
              <div className="text-lg font-semibold text-foreground">
                {synthesisResult.operationalTruth.confirmedArea 
                  ? `${synthesisResult.operationalTruth.confirmedArea.toLocaleString()} ${synthesisResult.operationalTruth.areaUnit}`
                  : "Pending"
                }
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground">Materials</div>
              <div className="text-lg font-semibold text-foreground">
                {synthesisResult.operationalTruth.materialsCount} items
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground">Blueprint</div>
              <div className="text-lg font-semibold text-foreground">
                {synthesisResult.operationalTruth.hasBlueprint ? "Analyzed" : "None"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground">OBC Status</div>
              <div className="text-lg font-semibold text-foreground flex items-center gap-1">
                {dualEngineOutput?.openai?.permitRequired ? (
                  <>
                    <Shield className="h-4 w-4 text-amber-500" />
                    Required
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Clear
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conflict Display */}
        {hasConflicts && (
          <div className="p-4 rounded-lg border-2 border-destructive/50 bg-destructive/10">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-semibold text-destructive">
                {synthesisResult!.conflicts.length} Discrepancy Detected
              </span>
            </div>
            <div className="space-y-2">
              {synthesisResult!.conflicts.map((conflict, i) => (
                <div key={i} className="p-3 rounded-lg bg-background/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">{conflict.field}</span>
                    <Badge 
                      variant={conflict.severity === "high" ? "destructive" : "outline"}
                      className="text-[10px]"
                    >
                      {conflict.severity}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Gemini (Visual):</span>
                      <span className="ml-1 text-foreground">{conflict.geminiValue}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">OpenAI (Text):</span>
                      <span className="ml-1 text-foreground">{conflict.openaiValue}</span>
                    </div>
                  </div>
                  {conflict.resolution && (
                    <div className="mt-2 text-xs text-primary">
                      Resolution: {conflict.resolution}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Triggers Active */}
        <div className="flex flex-wrap gap-2">
          {aiTriggers.ragEnabled && (
            <Badge variant="outline" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              RAG Active
            </Badge>
          )}
          {aiTriggers.obcSearch && (
            <Badge variant="outline" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              OBC Search
            </Badge>
          )}
          {aiTriggers.conflictDetection && (
            <Badge variant="outline" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Conflict Detection
            </Badge>
          )}
          {aiTriggers.reportGeneration && (
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Reports Enabled
            </Badge>
          )}
        </div>

        {/* Decision Log (Collapsible) */}
        <Collapsible open={showDecisionLog} onOpenChange={setShowDecisionLog}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="text-xs text-muted-foreground">Decision Log (Raw Engine Output)</span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                showDecisionLog && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-2">
            {dualEngineOutput ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Gemini Output */}
                <div className="p-3 rounded-lg border bg-blue-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Eye className="h-3 w-3 text-blue-500" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-foreground">{dualEngineOutput.gemini.role}</div>
                      <div className="text-[10px] text-muted-foreground">{dualEngineOutput.gemini.model}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Area: {dualEngineOutput.gemini.area || "N/A"} {dualEngineOutput.gemini.areaUnit}</div>
                    <div>Surface: {dualEngineOutput.gemini.surfaceType}</div>
                    <div>Confidence: {dualEngineOutput.gemini.confidence}</div>
                  </div>
                  {dualEngineOutput.gemini.rawExcerpt && (
                    <div className="mt-2 p-2 rounded bg-muted/50 text-[10px] text-muted-foreground font-mono max-h-[80px] overflow-y-auto">
                      {dualEngineOutput.gemini.rawExcerpt}
                    </div>
                  )}
                </div>

                {/* OpenAI Output */}
                <div className="p-3 rounded-lg border bg-green-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Shield className="h-3 w-3 text-green-500" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-foreground">{dualEngineOutput.openai.role}</div>
                      <div className="text-[10px] text-muted-foreground">{dualEngineOutput.openai.model}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Status: {dualEngineOutput.openai.validationStatus}</div>
                    <div>Permit: {dualEngineOutput.openai.permitRequired ? "Required" : "Not Required"}</div>
                    {dualEngineOutput.openai.obcReferences.length > 0 && (
                      <div>OBC: {dualEngineOutput.openai.obcReferences.join(", ")}</div>
                    )}
                  </div>
                  {dualEngineOutput.openai.rawExcerpt && (
                    <div className="mt-2 p-2 rounded bg-muted/50 text-[10px] text-muted-foreground font-mono max-h-[80px] overflow-y-auto">
                      {dualEngineOutput.openai.rawExcerpt}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Engine output will appear here after analysis completes.
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
