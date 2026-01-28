import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
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
  Ruler,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  Crown,
  Loader2,
  RefreshCw
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
  projectSize?: "small" | "medium" | "large";
  projectSizeReason?: string;
  confidence?: "low" | "medium" | "high";
  surfaceType?: string;
  roomType?: string;
  hasBlueprint?: boolean;
  // Editable callbacks
  onAreaChange?: (newArea: number | null) => void;
  onMaterialsChange?: (materials: Array<{ item: string; quantity: number; unit: string }>) => void;
  // Re-analyze callback
  onReanalyze?: () => void;
  isReanalyzing?: boolean;
}

// ============================================
// CITATION SOURCES GENERATOR
// ============================================

function generateCitationSources(
  dualEngineOutput?: DualEngineOutput,
  detectedArea?: number | null,
  materials?: Array<{ item: string; quantity: number; unit: string }>,
  surfaceType?: string,
  wasManuallyEdited?: boolean,
  lastModified?: Date | null
): CitationSource[] {
  const sources: CitationSource[] = [];
  
  // Derive work type description from surface type
  const getWorkTypeDescription = (surface: string | undefined): string => {
    const s = (surface || "").toLowerCase();
    if (s.includes("tile") || s.includes("csempe") || s.includes("ceramic") || s.includes("porcelain")) {
      return "tile, grout, adhesive";
    }
    if (s.includes("paint") || s.includes("festés") || s.includes("festeni")) {
      return "paint, primer, supplies";
    }
    if (s.includes("hardwood") || s.includes("laminate") || s.includes("vinyl")) {
      return "flooring, underlayment";
    }
    if (s.includes("carpet") || s.includes("szőnyeg")) {
      return "carpet, padding, supplies";
    }
    if (s.includes("concrete") || s.includes("beton")) {
      return "concrete, reinforcement";
    }
    // Default based on materials detected
    if (materials && materials.length > 0) {
      const firstItem = materials[0]?.item?.toLowerCase() || "";
      if (firstItem.includes("tile")) return "tile, grout, adhesive";
      if (firstItem.includes("paint")) return "paint, primer, supplies";
    }
    return "primary materials";
  };
  
  const workTypeDesc = getWorkTypeDescription(surfaceType);
  
  // Area detection citation - check if manually edited first, then AI, then fallback
  if (detectedArea) {
    if (wasManuallyEdited && lastModified) {
      // User manually edited the area after AI detection
      const timeStr = lastModified.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      sources.push({
        id: "area-manual-edit",
        sourceId: "EDIT",
        documentName: "Manual Edit",
        documentType: "log",
        contextSnippet: `Area was manually adjusted to ${detectedArea.toLocaleString()} sq ft at ${timeStr}. Materials recalculated based on this value.`,
        timestamp: lastModified.toISOString(),
      });
    } else if (dualEngineOutput?.gemini) {
      // AI-detected area citation (original detection from photo)
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
        linkedPillar: 'area', // Auto-link to Area pillar
      });
    } else {
      // Fallback: area exists but no AI engine output (rare case)
      sources.push({
        id: "area-input",
        sourceId: "USER",
        documentName: "User Input",
        documentType: "log",
        contextSnippet: `Project area set to ${detectedArea.toLocaleString()} sq ft. This is the BASE AREA - waste buffer (+10%) applied separately.`,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  // Materials citation - DYNAMIC WORK TYPE
  if (materials && materials.length > 0) {
    const materialsNote = wasManuallyEdited 
      ? `Recalculated for ${detectedArea?.toLocaleString() || 'specified'} sq ft after manual area edit.`
      : `AI calculated ${materials.length} material items using BASE AREA of ${detectedArea?.toLocaleString() || 'detected'} sq ft.`;
    
    sources.push({
      id: "materials-estimation",
      sourceId: "MAT-AI",
      documentName: "Material Estimation Report",
      documentType: "log",
      contextSnippet: `${materialsNote} Essential materials (${workTypeDesc}) use base quantity with +10% waste buffer displayed separately.`,
      timestamp: lastModified?.toISOString() || new Date().toISOString(),
      linkedPillar: 'materials', // Auto-link to Materials pillar
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

// Project size color mapping
const SIZE_COLORS = {
  small: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  medium: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
  large: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
};

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
  projectSize = "medium",
  projectSizeReason = "",
  confidence = "medium",
  surfaceType = "unknown",
  roomType = "unknown",
  hasBlueprint = false,
  onAreaChange,
  onMaterialsChange,
  onReanalyze,
  isReanalyzing = false,
}: AIAnalysisCitationProps) {
  const [showDecisionLog, setShowDecisionLog] = useState(false);
  
  // Editable state
  const [editableArea, setEditableArea] = useState<number | null>(detectedArea ?? null);
  const [editableMaterials, setEditableMaterials] = useState([...materials]);
  const [isEditingArea, setIsEditingArea] = useState(false);
  const [editingMaterialIndex, setEditingMaterialIndex] = useState<number | null>(null);
  const [newMaterialName, setNewMaterialName] = useState("");
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [isEditingMaterials, setIsEditingMaterials] = useState(false);
  
  // Track if area was manually edited (not just user-provided initially, but actively edited)
  const [wasAreaManuallyEdited, setWasAreaManuallyEdited] = useState(false);
  
  // Track last area modification timestamp
  const [areaLastModified, setAreaLastModified] = useState<Date | null>(null);
  
  // Sync with props - prioritize raw AI detection from dualEngineOutput
  useEffect(() => {
    if (detectedArea) {
      setEditableArea(detectedArea);
    } else if (dualEngineOutput?.gemini?.area) {
      // Use the raw Gemini-detected area (true base, no waste)
      setEditableArea(dualEngineOutput.gemini.area);
    } else if (materials && materials.length > 0) {
      // Last resort: back-calculate from materials
      // Materials quantity includes +10% waste, so calculate base: total / 1.1
      const areaFromMaterials = materials.find(m => m.unit === "sq ft")?.quantity;
      if (areaFromMaterials && areaFromMaterials > 0) {
        const baseArea = Math.round(areaFromMaterials / 1.1);
        setEditableArea(baseArea);
      }
    }
  }, [detectedArea, materials, dualEngineOutput]);
  
  useEffect(() => {
    setEditableMaterials([...materials]);
  }, [materials]);
  
  // Calculate waste buffer (10%)
  const wasteBuffer = editableArea ? Math.round(editableArea * 0.1) : 0;
  const totalWithWaste = editableArea ? editableArea + wasteBuffer : null;
  
  // Handlers - recalculate materials when area changes
  const handleAreaChange = (newArea: number) => {
    const previousArea = editableArea;
    setEditableArea(newArea);
    setIsEditingArea(false);
    setWasAreaManuallyEdited(true); // Mark as manually edited
    setAreaLastModified(new Date()); // Record modification timestamp
    onAreaChange?.(newArea);
    
    // Auto-recalculate materials based on area ratio if we have previous area
    if (previousArea && previousArea > 0 && newArea !== previousArea) {
      const ratio = newArea / previousArea;
      const updatedMaterials = editableMaterials.map(mat => ({
        ...mat,
        quantity: Math.round(mat.quantity * ratio)
      }));
      setEditableMaterials(updatedMaterials);
      onMaterialsChange?.(updatedMaterials);
    }
  };

  const handleMaterialQuantityChange = (index: number, newQuantity: number) => {
    const updated = [...editableMaterials];
    updated[index].quantity = newQuantity;
    setEditableMaterials(updated);
    setEditingMaterialIndex(null);
    onMaterialsChange?.(updated);
  };

  const handleAddMaterial = () => {
    if (!newMaterialName.trim()) return;
    
    const updated = [
      ...editableMaterials,
      { item: newMaterialName.trim(), quantity: 1, unit: "units" }
    ];
    setEditableMaterials(updated);
    setNewMaterialName("");
    setShowAddMaterial(false);
    onMaterialsChange?.(updated);
  };

  const handleRemoveMaterial = (index: number) => {
    const updated = editableMaterials.filter((_, i) => i !== index);
    setEditableMaterials(updated);
    onMaterialsChange?.(updated);
  };
  
  // Generate citation sources from analysis data - pass edit flag and timestamp
  const citationSources = generateCitationSources(
    dualEngineOutput, 
    editableArea, 
    editableMaterials, 
    surfaceType,
    wasAreaManuallyEdited,
    areaLastModified
  );
  
  // Find specific sources for inline citations (check for any area source type)
  const areaSource = citationSources.find(s => 
    s.sourceId === "PHOTO-AI" || s.sourceId === "USER" || s.sourceId === "EDIT"
  );
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
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                AI Analysis Complete
                <Badge className={cn("text-[10px]", SIZE_COLORS[projectSize])}>
                  {projectSize.toUpperCase()} PROJECT
                </Badge>
                {hasConflicts ? (
                  <Badge variant="destructive" className="text-[10px]">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    CONFLICT
                  </Badge>
                ) : verificationStatus === "verified" ? (
                  <Badge className="text-[10px] bg-green-500/20 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    VERIFIED
                  </Badge>
                ) : null}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {projectSizeReason || "AI determined project scope: " + editableMaterials.length + " materials"}
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
        {/* Cited Analysis Results - Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30">
          {/* Detected Area with Citation - EDITABLE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Detected Area
                </span>
                {areaSource && <SourceTag source={areaSource} />}
              </div>
              {!isEditingArea && editableArea && (
                <button 
                  onClick={() => setIsEditingArea(true)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Edit area"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            
            {isEditingArea ? (
              <div className="flex items-center gap-2">
                <NumericInput
                  value={editableArea}
                  onChange={(val) => setEditableArea(val)}
                  className="h-8 w-24 text-sm"
                  autoFocus
                />
                <span className="text-sm text-muted-foreground">{areaUnit}</span>
                <button 
                  onClick={() => handleAreaChange(editableArea || 0)}
                  className="p-1 hover:bg-green-500/20 rounded text-green-600"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => {
                    setEditableArea(detectedArea ?? null);
                    setIsEditingArea(false);
                  }}
                  className="p-1 hover:bg-red-500/20 rounded text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                {editableArea ? (
                  <div className="space-y-1">
                    {/* Base Area */}
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-foreground">
                        {editableArea.toLocaleString()}
                      </span>
                      <span className="text-base text-muted-foreground">{areaUnit}</span>
                      <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                        base
                      </Badge>
                    </div>
                    {/* Waste Buffer Display */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">+{wasteBuffer.toLocaleString()} {areaUnit}</span>
                      <Badge className="text-[10px] bg-amber-500/20 text-amber-600 border-amber-500/50">
                        +10% waste
                      </Badge>
                      <span className="text-foreground font-semibold">= {totalWithWaste?.toLocaleString()} {areaUnit}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {onReanalyze && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onReanalyze}
                        disabled={isReanalyzing}
                        className="text-sm border-primary/50 text-primary hover:bg-primary/10"
                      >
                        {isReanalyzing ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Re-analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 mr-1" />
                            Re-analyze
                          </>
                        )}
                      </Button>
                    )}
                    <button 
                      onClick={() => setIsEditingArea(true)}
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      or add manually
                    </button>
                  </div>
                )}
              </>
            )}
            
            {/* Surface/Room info + Last Modified */}
            <div className="text-xs text-muted-foreground mt-2 space-x-2">
              {surfaceType !== "unknown" && (
                <span>Surface: {surfaceType}</span>
              )}
              {roomType !== "unknown" && (
                <span>• {roomType}</span>
              )}
              {confidence !== "high" && (
                <Badge variant="outline" className="text-[10px] ml-1">
                  {confidence} confidence
                </Badge>
              )}
            </div>
            {hasBlueprint && (
              <div className="text-xs text-primary mt-1">📄 Blueprint data included</div>
            )}
          </div>

          {/* Materials with Citation - EDITABLE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Materials ({editableMaterials.length})
                </span>
                {materialsSource && <SourceTag source={materialsSource} />}
              </div>
              <div className="flex items-center gap-1">
                {!isEditingMaterials ? (
                  <button 
                    onClick={() => setIsEditingMaterials(true)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Edit materials"
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsEditingMaterials(false)}
                    className="p-1 hover:bg-green-500/20 rounded transition-colors text-green-600"
                    title="Done editing"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                )}
                <button 
                  onClick={() => setShowAddMaterial(true)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Add material"
                >
                  <Plus className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </div>
            
            {/* Add material input */}
            {showAddMaterial && (
              <div className="flex items-center gap-2 mb-2">
                <Input
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  placeholder="Material name..."
                  className="h-7 text-xs flex-1"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleAddMaterial()}
                />
                <button 
                  onClick={handleAddMaterial}
                  className="p-1 hover:bg-green-500/20 rounded text-green-600"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button 
                  onClick={() => {
                    setShowAddMaterial(false);
                    setNewMaterialName("");
                  }}
                  className="p-1 hover:bg-red-500/20 rounded text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {editableMaterials.length > 0 ? (
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {editableMaterials.map((m, i) => (
                  <div key={i} className="text-xs flex items-center justify-between group">
                    <span className="text-foreground truncate max-w-[120px]">{m.item}</span>
                    
                    {editingMaterialIndex === i || isEditingMaterials ? (
                      <div className="flex items-center gap-1">
                        <NumericInput
                          value={editableMaterials[i].quantity}
                          onChange={(val) => {
                            const updated = [...editableMaterials];
                            updated[i].quantity = val;
                            setEditableMaterials(updated);
                            onMaterialsChange?.(updated);
                          }}
                          className="h-6 w-16 text-xs"
                        />
                        <span className="text-muted-foreground">{m.unit}</span>
                        {isEditingMaterials && (
                          <button 
                            onClick={() => handleRemoveMaterial(i)}
                            className="p-0.5 hover:bg-red-500/20 rounded text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">{m.quantity} {m.unit}</span>
                        <button 
                          onClick={() => setEditingMaterialIndex(i)}
                          className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button 
                          onClick={() => handleRemoveMaterial(i)}
                          className="p-0.5 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <button 
                onClick={() => setShowAddMaterial(true)}
                className="text-sm text-primary hover:underline"
              >
                + Add materials
              </button>
            )}
            
            {/* Materials calculation timestamp - shows when materials were synced with area */}
            {areaLastModified && editableMaterials.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-muted/30">
                <RefreshCw className="h-3 w-3" />
                <span>Synced with {editableArea?.toLocaleString()} {areaUnit} @ {areaLastModified.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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

        {/* References Section - Always visible */}
        <ReferencesSection 
          references={citationSources} 
          defaultExpanded={citationSources.length > 0}
        />

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
