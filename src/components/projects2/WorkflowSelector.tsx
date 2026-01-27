import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Pencil, 
  Check, 
  X, 
  Users, 
  Zap, 
  FileText,
  Calculator,
  MessageSquare,
  Plus,
  Trash2,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SubscriptionTier, TEAM_LIMITS } from "@/hooks/useSubscription";
import { FilterAnswers, AITriggers } from "./FilterQuestions";
import ProjectSynthesis, { DualEngineOutput, SynthesisResult } from "./ProjectSynthesis";
import ProjectTimelineBar from "./ProjectTimelineBar";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AIAnalysisResult {
  area: number | null;
  areaUnit: string;
  materials: Array<{ item: string; quantity: number; unit: string }>;
  hasBlueprint: boolean;
  surfaceType: string;
  roomType: string;
  projectSize: "small" | "medium" | "large";
  projectSizeReason: string;
  confidence: "low" | "medium" | "high";
  // Dual-engine output for synthesis
  dualEngineOutput?: DualEngineOutput;
  synthesisResult?: SynthesisResult;
}

export interface EditedAnalysisData {
  editedArea: number | null;
  editedMaterials: Array<{ item: string; quantity: number; unit: string }>;
  editedAt: string;
}

export interface WorkflowSelectorProps {
  projectId: string;
  analysisResult: AIAnalysisResult;
  tier: SubscriptionTier;
  filterAnswers?: FilterAnswers;
  aiTriggers?: AITriggers;
  onSelectWorkflow: (mode: "solo" | "team", editedData?: EditedAnalysisData) => void;
  onUpgradeClick: () => void;
}

// Tier-based feature mapping
const TIER_FEATURES: Record<SubscriptionTier, {
  modes: readonly ("solo" | "team")[];
  teamLimit: number;
  aiTrials: number;
  features: string[];
  teamFeatures: string[];
}> = {
  free: {
    modes: ["solo"],
    teamLimit: 0,
    aiTrials: 3,
    features: ["Photo Estimate", "Calculator", "Quote", "Contract"],
    teamFeatures: [],
  },
  pro: {
    modes: ["solo", "team"],
    teamLimit: 10,
    aiTrials: Infinity,
    features: ["Photo Estimate", "Calculator", "Quote", "Contract"],
    teamFeatures: ["Documents", "Team Management", "Tasks", "Messaging"],
  },
  premium: {
    modes: ["solo", "team"],
    teamLimit: 50,
    aiTrials: Infinity,
    features: ["Photo Estimate", "Calculator", "Quote", "Contract"],
    teamFeatures: ["Documents", "Team Management", "Tasks", "Messaging", "Conflict Viz", "Priority AI", "Reports"],
  },
  enterprise: {
    modes: ["solo", "team"],
    teamLimit: Infinity,
    aiTrials: Infinity,
    features: ["Photo Estimate", "Calculator", "Quote", "Contract"],
    teamFeatures: ["Documents", "Team Management", "Tasks", "Messaging", "Conflict Viz", "Priority AI", "Reports", "Custom Integrations"],
  },
};

// Project size color mapping
const SIZE_COLORS = {
  small: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  medium: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
  large: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function WorkflowSelector({
  projectId,
  analysisResult,
  tier,
  filterAnswers,
  aiTriggers,
  onSelectWorkflow,
  onUpgradeClick,
}: WorkflowSelectorProps) {
  const tierConfig = TIER_FEATURES[tier];
  const canAccessTeam = tierConfig.modes.includes("team");
  const teamLimit = TEAM_LIMITS[tier];

  // Editable state
  const [editableArea, setEditableArea] = useState<number | null>(analysisResult.area);
  const [editableMaterials, setEditableMaterials] = useState([...analysisResult.materials]);
  const [isEditingArea, setIsEditingArea] = useState(false);
  const [editingMaterialIndex, setEditingMaterialIndex] = useState<number | null>(null);
  const [hasUserEdits, setHasUserEdits] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState("");
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  // Determine recommended mode based on tier, project size, AND filter answers (tier-logic hardcoding)
  const getRecommendedMode = (): "solo" | "team" => {
    if (tier === "free") return "solo";
    
    // TIER-LOGIC HARDCODING: Team Mode triggers
    // 1. If aiTriggers explicitly recommends team mode
    if (aiTriggers?.recommendTeamMode) {
      return canAccessTeam ? "team" : "solo";
    }
    
    // 2. If subcontractorCount > 3 (3-5 or 6+)
    if (filterAnswers?.workflowFilter.subcontractorCount === "3-5" || 
        filterAnswers?.workflowFilter.subcontractorCount === "6+") {
      return canAccessTeam ? "team" : "solo";
    }
    
    // 3. If structural work is involved
    if (filterAnswers?.technicalFilter.affectsStructure) {
      return canAccessTeam ? "team" : "solo";
    }
    
    // 4. If mechanical main lines are affected
    if (filterAnswers?.technicalFilter.affectsMechanical) {
      return canAccessTeam ? "team" : "solo";
    }
    
    // 5. Legacy: For PRO+ users, recommend based on project size
    if (analysisResult.projectSize === "large" || analysisResult.hasBlueprint) {
      return canAccessTeam ? "team" : "solo";
    }
    if (analysisResult.projectSize === "medium") {
      return canAccessTeam ? "team" : "solo";
    }
    
    // Default: Solo mode for low-risk answers
    return "solo";
  };

  const recommendedMode = getRecommendedMode();

  // Handlers
  const handleAreaChange = (newArea: number) => {
    setEditableArea(newArea);
    setHasUserEdits(true);
    setIsEditingArea(false);
  };

  const handleMaterialQuantityChange = (index: number, newQuantity: number) => {
    const updated = [...editableMaterials];
    updated[index].quantity = newQuantity;
    setEditableMaterials(updated);
    setHasUserEdits(true);
    setEditingMaterialIndex(null);
  };

  const handleAddMaterial = () => {
    if (!newMaterialName.trim()) return;
    
    setEditableMaterials(prev => [
      ...prev,
      { item: newMaterialName.trim(), quantity: 1, unit: "units" }
    ]);
    setNewMaterialName("");
    setShowAddMaterial(false);
    setHasUserEdits(true);
  };

  const handleRemoveMaterial = (index: number) => {
    setEditableMaterials(prev => prev.filter((_, i) => i !== index));
    setHasUserEdits(true);
  };

  const handleSelectWorkflow = (mode: "solo" | "team") => {
    if (mode === "team" && !canAccessTeam) {
      onUpgradeClick();
      return;
    }

    const editedData: EditedAnalysisData | undefined = hasUserEdits 
      ? {
          editedArea: editableArea,
          editedMaterials: editableMaterials,
          editedAt: new Date().toISOString(),
        }
      : undefined;

    onSelectWorkflow(mode, editedData);
  };

  // Extract dates from filter answers
  const projectStartDate = filterAnswers?.technicalFilter.projectStartDate || null;
  const projectEndDate = filterAnswers?.technicalFilter.projectEndDate || null;

  return (
    <div className="space-y-0">
      {/* Project Timeline Bar - The Main Clock */}
      {filterAnswers && (projectStartDate || projectEndDate) && (
        <ProjectTimelineBar
          projectStartDate={projectStartDate}
          projectEndDate={projectEndDate}
          isEditable={false}
        />
      )}

      {/* Project Synthesis Bridge - Only show if we have filter data */}
      {filterAnswers && aiTriggers && (
        <ProjectSynthesis
          filterAnswers={filterAnswers}
          aiTriggers={aiTriggers}
          dualEngineOutput={analysisResult.dualEngineOutput}
          synthesisResult={analysisResult.synthesisResult}
        />
      )}

      <div className="p-6 rounded-xl border bg-card">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">AI Analysis Complete</h3>
              <Badge className={cn("text-[10px]", SIZE_COLORS[analysisResult.projectSize])}>
                {analysisResult.projectSize.toUpperCase()} PROJECT
              </Badge>
              {analysisResult.confidence !== "high" && (
                <Badge variant="outline" className="text-[10px]">
                  {analysisResult.confidence} confidence
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{analysisResult.projectSizeReason}</p>
          </div>
        </div>

        {/* Tier Info Banner */}
        <div className="flex items-center justify-between px-4 py-2 mb-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-foreground">
              {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {tier === "free" ? (
              <span>Solo Mode only</span>
            ) : (
              <span>Up to {teamLimit === Infinity ? "unlimited" : teamLimit} team members</span>
            )}
          </div>
          {tier === "free" && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onUpgradeClick}
              className="text-xs text-primary hover:text-primary"
            >
              Upgrade
            </Button>
          )}
        </div>

      {/* AI Detection Results - Editable */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 rounded-lg bg-muted/30">
        {/* Area Detection - Editable */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">📐 Detected Area</span>
            {!isEditingArea && (
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
              <span className="text-sm text-muted-foreground">{analysisResult.areaUnit}</span>
              <button 
                onClick={() => handleAreaChange(editableArea || 0)}
                className="p-1 hover:bg-green-500/20 rounded text-green-600"
              >
                <Check className="h-4 w-4" />
              </button>
              <button 
                onClick={() => {
                  setEditableArea(analysisResult.area);
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
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-foreground">
                    {editableArea.toLocaleString()} {analysisResult.areaUnit}
                  </span>
                  {hasUserEdits && editableArea !== analysisResult.area && (
                    <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                      edited
                    </Badge>
                  )}
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditingArea(true)}
                  className="text-sm text-primary hover:underline"
                >
                  + Add area manually
                </button>
              )}
            </>
          )}
          
          {/* Surface/Room info */}
          <div className="text-xs text-muted-foreground mt-1 space-x-2">
            {analysisResult.surfaceType !== "unknown" && (
              <span>Surface: {analysisResult.surfaceType}</span>
            )}
            {analysisResult.roomType !== "unknown" && (
              <span>• {analysisResult.roomType}</span>
            )}
          </div>
          {analysisResult.hasBlueprint && (
            <div className="text-xs text-primary mt-1">📄 Blueprint data included</div>
          )}
        </div>

        {/* Materials List - Editable */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              🧱 Materials ({editableMaterials.length})
            </span>
            <button 
              onClick={() => setShowAddMaterial(true)}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Add material"
            >
              <Plus className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
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
                  
                  {editingMaterialIndex === i ? (
                    <div className="flex items-center gap-1">
                      <NumericInput
                        value={editableMaterials[i].quantity}
                        onChange={(val) => {
                          const updated = [...editableMaterials];
                          updated[i].quantity = val;
                          setEditableMaterials(updated);
                        }}
                        className="h-6 w-16 text-xs"
                        autoFocus
                      />
                      <span className="text-muted-foreground">{m.unit}</span>
                      <button 
                        onClick={() => handleMaterialQuantityChange(i, editableMaterials[i].quantity)}
                        className="p-0.5 hover:bg-green-500/20 rounded text-green-600"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={() => setEditingMaterialIndex(null)}
                        className="p-0.5 hover:bg-red-500/20 rounded text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
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
        </div>
      </div>

      {/* Workflow Options */}
      <div className="space-y-3 mb-4">
        <h4 className="text-sm font-medium text-foreground">Choose Your Workflow</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Solo Mode Card */}
          <button
            onClick={() => handleSelectWorkflow("solo")}
            className={cn(
              "p-4 rounded-lg border-2 text-left transition-all",
              recommendedMode === "solo"
                ? "border-amber-500 bg-amber-500/10"
                : "border-border hover:border-amber-300"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <span className="font-medium text-foreground">Solo Mode</span>
              {recommendedMode === "solo" && (
                <Badge className="bg-amber-500/20 text-amber-600 text-[10px]">
                  Recommended
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Quick estimates and contracts for individual projects
            </p>
            <div className="flex flex-wrap gap-1">
              {tierConfig.features.map((feature, i) => (
                <span key={i} className="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground">
                  {feature}
                </span>
              ))}
            </div>
          </button>

          {/* Team Mode Card */}
          <button
            onClick={() => handleSelectWorkflow("team")}
            disabled={!canAccessTeam && tier === "free"}
            className={cn(
              "p-4 rounded-lg border-2 text-left transition-all relative",
              recommendedMode === "team" && canAccessTeam
                ? "border-cyan-500 bg-cyan-500/10"
                : !canAccessTeam
                ? "border-border opacity-70"
                : "border-border hover:border-cyan-300"
            )}
          >
            {!canAccessTeam && (
              <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpgradeClick();
                  }}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                >
                  Upgrade to PRO
                </Button>
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-cyan-500" />
              <span className="font-medium text-foreground">Team Mode</span>
              {!canAccessTeam && (
                <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px]">
                  PRO
                </Badge>
              )}
              {recommendedMode === "team" && canAccessTeam && (
                <Badge className="bg-cyan-500/20 text-cyan-600 text-[10px]">
                  Recommended
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Full project management with team collaboration
            </p>
            <div className="flex flex-wrap gap-1">
              {tierConfig.teamFeatures.slice(0, 4).map((feature, i) => (
                <span key={i} className="px-2 py-0.5 text-[10px] rounded-full bg-cyan-500/10 text-cyan-600">
                  {feature}
                </span>
              ))}
              {tierConfig.teamFeatures.length > 4 && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground">
                  +{tierConfig.teamFeatures.length - 4} more
                </span>
              )}
            </div>
            
            {canAccessTeam && (
              <div className="mt-3 pt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground">
                  {teamLimit === Infinity ? "Unlimited" : `Up to ${teamLimit}`} team members
                </span>
              </div>
            )}
          </button>
        </div>
      </div>
      </div>

      {/* User edits indicator */}
      {hasUserEdits && (
        <div className="text-xs text-amber-600 flex items-center gap-1 mb-2">
          <Pencil className="h-3 w-3" />
          <span>Your edits will be saved when you select a workflow</span>
        </div>
      )}
    </div>
  );
}
