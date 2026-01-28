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
  Brain,
  MapPin,
  Package,
  Ruler
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterAnswers, AITriggers } from "./FilterQuestions";
import { SourceTag, ReferencesSection } from "@/components/citations";
import { CitationSource } from "@/types/citation";

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

export interface AIAnalysisCitationProps {
  filterAnswers: FilterAnswers;
  aiTriggers: AITriggers;
  dualEngineOutput?: DualEngineOutput;
  synthesisResult?: SynthesisResult;
  detectedArea?: number | null;
  areaUnit?: string;
  materials?: Array<{ item: string; quantity: number; unit: string }>;
  isLoading?: boolean;
}

// ============================================
// CITATION SOURCES GENERATOR
// ============================================

function generateCitationSources(
  dualEngineOutput?: DualEngineOutput,
  detectedArea?: number | null,
  materials?: Array<{ item: string; quantity: number; unit: string }>
): CitationSource[] {
  const sources: CitationSource[] = [];
  
  // Area detection citation - PRECISION EXTRACTION
  if (detectedArea && dualEngineOutput?.gemini) {
    const confidence = dualEngineOutput.gemini.confidence;
    const extractionMethod = confidence === "high" 
      ? "directly read from visible text in image" 
      : confidence === "medium"
      ? "extracted via pattern matching"
      : "estimated from visual proportions";
    
    sources.push({
      id: "area-detection",
      sourceId: "PHOTO-AI",
      documentName: "Photo Analysis Report",
      documentType: "image",
      contextSnippet: `Gemini Vision detected EXACTLY ${detectedArea.toLocaleString()} ${dualEngineOutput.gemini.areaUnit} - ${extractionMethod}. Surface: ${dualEngineOutput.gemini.surfaceType}. Confidence: ${confidence}. This is the BASE AREA - waste buffer (+10%) applied separately.`,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Materials citation - BASE AREA CLARITY
  if (materials && materials.length > 0) {
    const baseAreaMaterial = materials.find(m => 
      m.unit === "sq ft" && m.quantity === detectedArea
    );
    
    sources.push({
      id: "materials-estimation",
      sourceId: "MAT-AI",
      documentName: "Material Estimation Report",
      documentType: "log",
      contextSnippet: `AI calculated ${materials.length} material items using BASE AREA of ${detectedArea?.toLocaleString() || 'detected'} sq ft. Essential materials (flooring, underlayment) use base quantity with +10% waste buffer displayed separately.`,
      timestamp: new Date().toISOString(),
    });
  }
  
  // OBC Compliance citation
  if (dualEngineOutput?.openai?.obcReferences?.length) {
    const obcRefs = dualEngineOutput.openai.obcReferences.map(ref => 
      typeof ref === 'string' ? ref : ref.code
    ).join(", ");
    
    sources.push({
      id: "obc-compliance",
      sourceId: "OBC-REG",
      documentName: "Ontario Building Code Analysis",
      documentType: "regulation",
      contextSnippet: `OpenAI regulatory engine validated against: ${obcRefs}. Permit ${dualEngineOutput.openai.permitRequired ? "required" : "not required"}.`,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Blueprint citation if available
  if (dualEngineOutput?.gemini?.visualFindings?.length) {
    sources.push({
      id: "visual-analysis",
      sourceId: "VIS-AI",
      documentName: "Visual Inspection Report",
      documentType: "image",
      contextSnippet: dualEngineOutput.gemini.visualFindings.slice(0, 3).join("; "),
      timestamp: new Date().toISOString(),
    });
  }
  
  return sources;
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

export default function AIAnalysisCitation({
  filterAnswers,
  aiTriggers,
  dualEngineOutput,
  synthesisResult,
  detectedArea,
  areaUnit = "sq ft",
  materials = [],
  isLoading = false,
}: AIAnalysisCitationProps) {
  const [showDecisionLog, setShowDecisionLog] = useState(false);
  
  // Generate citation sources from analysis data
  const citationSources = generateCitationSources(dualEngineOutput, detectedArea, materials);
  
  // Find specific sources for inline citations
  const areaSource = citationSources.find(s => s.sourceId === "PHOTO-AI");
  const materialsSource = citationSources.find(s => s.sourceId === "MAT-AI");
  const obcSource = citationSources.find(s => s.sourceId === "OBC-REG");
  
  const hasConflicts = synthesisResult?.conflicts && synthesisResult.conflicts.length > 0;
  const verificationStatus = synthesisResult?.verificationStatus || "pending";

  // Generate explanation messages
  const explanationMessages: string[] = [
    "BuildUnion doesn't estimate—it analyzes and cites every source.",
  ];
  
  if (aiTriggers.ragEnabled) {
    explanationMessages.push("✓ Visual comparison (RAG) enabled to detect plan-vs-reality discrepancies.");
  }
  
  if (aiTriggers.obcSearch) {
    explanationMessages.push("✓ Ontario Building Code compliance validated by OpenAI regulatory engine.");
  }
  
  if (aiTriggers.recommendTeamMode) {
    explanationMessages.push("→ Team Mode recommended for multi-trade coordination.");
  }

  const { displayedText, isComplete, skipToEnd } = useTypewriter(explanationMessages, 15);

  return (
    <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-yellow-50/30 dark:from-amber-900/20 dark:via-orange-900/10 dark:to-yellow-900/10 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                AI Analysis
                {hasConflicts ? (
                  <Badge variant="destructive" className="text-[10px]">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    CONFLICT DETECTED
                  </Badge>
                ) : verificationStatus === "verified" ? (
                  <Badge className="text-[10px] bg-green-500/20 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    VERIFIED
                  </Badge>
                ) : (
                  <Badge className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Zap className="h-3 w-3 mr-1" />
                    ANALYZING
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Dual-Engine: Gemini (Visual) + OpenAI (Regulatory) — Every fact is cited
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
        {/* AI Explanation with Typewriter */}
        <div className="p-4 rounded-lg bg-white/50 dark:bg-black/20 border border-amber-200 dark:border-amber-800">
          <div className="text-sm text-foreground whitespace-pre-wrap min-h-[60px]">
            {displayedText}
            {!isComplete && <span className="animate-pulse text-amber-500">▊</span>}
          </div>
        </div>

        {/* Cited Analysis Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Detected Area with Citation */}
          <div className="p-4 rounded-lg bg-white/80 dark:bg-black/30 border border-amber-200/50 dark:border-amber-700/30">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Detected Area
              </span>
              {areaSource && <SourceTag source={areaSource} />}
            </div>
            <div className="text-2xl font-bold text-foreground">
              {detectedArea ? (
                <>
                  {detectedArea.toLocaleString()} <span className="text-base font-normal text-muted-foreground">{areaUnit}</span>
                </>
              ) : (
                <span className="text-muted-foreground text-lg">Pending...</span>
              )}
            </div>
            {dualEngineOutput?.gemini && (
              <div className="mt-2 text-xs text-muted-foreground">
                Surface: {dualEngineOutput.gemini.surfaceType} • 
                Room: {dualEngineOutput.gemini.roomType} •
                <Badge 
                  variant="outline" 
                  className={cn(
                    "ml-1 text-[10px]",
                    dualEngineOutput.gemini.confidence === "high" && "border-green-500 text-green-600",
                    dualEngineOutput.gemini.confidence === "medium" && "border-amber-500 text-amber-600",
                    dualEngineOutput.gemini.confidence === "low" && "border-red-500 text-red-600"
                  )}
                >
                  {dualEngineOutput.gemini.confidence} confidence
                </Badge>
              </div>
            )}
          </div>

          {/* Materials with Citation */}
          <div className="p-4 rounded-lg bg-white/80 dark:bg-black/30 border border-amber-200/50 dark:border-amber-700/30">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Materials Detected
              </span>
              {materialsSource && <SourceTag source={materialsSource} />}
            </div>
            <div className="text-2xl font-bold text-foreground">
              {materials.length} <span className="text-base font-normal text-muted-foreground">items</span>
            </div>
            {materials.length > 0 && (
              <div className="mt-2 space-y-1 max-h-[100px] overflow-y-auto">
                {materials.slice(0, 5).map((m, i) => (
                  <div key={i} className="flex justify-between text-xs text-muted-foreground">
                    <span className="truncate max-w-[150px]">{m.item}</span>
                    <span className="font-medium text-foreground">{m.quantity} {m.unit}</span>
                  </div>
                ))}
                {materials.length > 5 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    +{materials.length - 5} more items
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* OBC Compliance Row */}
        {dualEngineOutput?.openai && (
          <div className="p-4 rounded-lg bg-white/80 dark:bg-black/30 border border-amber-200/50 dark:border-amber-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  OBC Compliance
                </span>
                {obcSource && <SourceTag source={obcSource} />}
              </div>
              <div className="flex items-center gap-2">
                {dualEngineOutput.openai.permitRequired ? (
                  <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Permit Required
                  </Badge>
                ) : (
                  <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    No Permit Needed
                  </Badge>
                )}
              </div>
            </div>
            {dualEngineOutput.openai.obcReferences.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {dualEngineOutput.openai.obcReferences.slice(0, 4).map((ref, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {typeof ref === 'string' ? ref : ref.code}
                  </Badge>
                ))}
              </div>
            )}
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
                      <span className="text-muted-foreground">Gemini:</span>
                      <span className="ml-1 text-foreground">{conflict.geminiValue}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">OpenAI:</span>
                      <span className="ml-1 text-foreground">{conflict.openaiValue}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Triggers Active */}
        <div className="flex flex-wrap gap-2">
          {aiTriggers.ragEnabled && (
            <Badge variant="outline" className="text-xs border-amber-500/50">
              <Eye className="h-3 w-3 mr-1" />
              RAG Active
            </Badge>
          )}
          {aiTriggers.obcSearch && (
            <Badge variant="outline" className="text-xs border-amber-500/50">
              <FileText className="h-3 w-3 mr-1" />
              OBC Search
            </Badge>
          )}
          {aiTriggers.conflictDetection && (
            <Badge variant="outline" className="text-xs border-amber-500/50">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Conflict Detection
            </Badge>
          )}
          {aiTriggers.reportGeneration && (
            <Badge variant="outline" className="text-xs border-amber-500/50">
              <Sparkles className="h-3 w-3 mr-1" />
              Reports Enabled
            </Badge>
          )}
        </div>

        {/* References Section */}
        {citationSources.length > 0 && (
          <ReferencesSection references={citationSources} />
        )}

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
                  </div>
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
