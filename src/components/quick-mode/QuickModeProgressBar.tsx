import { 
  Camera, 
  LayoutTemplate, 
  Calculator, 
  FileText, 
  ClipboardSignature, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  FolderOpen,
  Users,
  ListTodo,
  Lock,
  Crown,
  AlertTriangle,
  Clock
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ProgressStep } from "@/hooks/useQuickModeProgress";

interface QuickModeProgressBarProps {
  percentage: number;
  steps: ProgressStep[];
  warnings: string[];
  status: string;
  statusLabel: string;
  statusColor: string;
  activeTab: string;
  onTabClick: (tab: string) => void;
  isPro?: boolean;
  soloComplete?: boolean;
  teamComplete?: boolean;
}

const stepIcons: Record<string, React.ReactNode> = {
  photo: <Camera className="h-4 w-4" />,
  templates: <LayoutTemplate className="h-4 w-4" />,
  calculator: <Calculator className="h-4 w-4" />,
  quote: <FileText className="h-4 w-4" />,
  contract: <ClipboardSignature className="h-4 w-4" />,
  documents: <FolderOpen className="h-4 w-4" />,
  team: <Users className="h-4 w-4" />,
  tasks: <ListTodo className="h-4 w-4" />,
};

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  FREE: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  PRO: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  PREMIUM: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

export const QuickModeProgressBar = ({
  percentage,
  steps,
  warnings,
  status,
  statusLabel,
  statusColor,
  activeTab,
  onTabClick,
  isPro = false,
  soloComplete = false,
  teamComplete = false,
}: QuickModeProgressBarProps) => {
  const [showSubSteps, setShowSubSteps] = useState<string | null>(null);

  const getStepPercentage = (step: ProgressStep) => {
    if (step.isLocked) return 0;
    if (step.isComplete) return step.weight;
    if (!step.subSteps) return 0;
    
    const completedSubSteps = step.subSteps.filter(s => s.isComplete).length;
    const totalSubSteps = step.subSteps.length;
    return Math.round((completedSubSteps / totalSubSteps) * step.weight);
  };

  // Separate solo and team steps
  const soloSteps = steps.filter(s => s.tier === "FREE");
  const teamSteps = steps.filter(s => s.tier === "PRO" || s.tier === "PREMIUM");

  return (
    <div className="bg-white border border-border rounded-lg shadow-sm p-4 mb-4">
      {/* Header with percentage and status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-4 border-muted flex items-center justify-center">
              <span className="text-lg font-bold text-foreground">{percentage}%</span>
            </div>
            <svg className="absolute top-0 left-0 w-14 h-14 -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={`${(percentage / 100) * 150.8} 150.8`}
                className="text-amber-500"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Project Progress</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn(statusColor)}>
                {statusLabel}
              </Badge>
              {soloComplete && !isPro && (
                <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px]">
                  <Crown className="w-3 h-3 mr-1" />
                  Unlock Team
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg cursor-help">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-700">{warnings.length} missing</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <ul className="space-y-1">
                  {warnings.map((warning, i) => (
                    <li key={i} className="text-sm flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Main Progress Bar */}
      <div className="relative mb-4">
        <Progress value={percentage} className="h-2" />
        {/* Tier markers */}
        <div className="absolute top-full mt-1 left-0 right-0 flex justify-between text-[9px] text-muted-foreground">
          <span>0%</span>
          <span className="absolute left-[62.5%] -translate-x-1/2">Solo Complete</span>
          <span>100%</span>
        </div>
      </div>

      {/* Solo Steps Section */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-slate-500">Solo Mode</span>
          <div className="flex-1 h-px bg-slate-200" />
          {soloComplete && (
            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {soloSteps.map((step) => (
            <StepButton
              key={step.id}
              step={step}
              isActive={activeTab === step.id}
              isExpanded={showSubSteps === step.id}
              onTabClick={onTabClick}
              onToggleExpand={() => setShowSubSteps(showSubSteps === step.id ? null : step.id)}
              getStepPercentage={getStepPercentage}
            />
          ))}
        </div>
      </div>

      {/* Team Steps Section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-emerald-600">Team Mode</span>
          <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] px-1.5 py-0">PRO</Badge>
          <div className="flex-1 h-px bg-emerald-200" />
          {teamComplete && (
            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {teamSteps.map((step) => (
            <StepButton
              key={step.id}
              step={step}
              isActive={activeTab === step.id}
              isExpanded={showSubSteps === step.id}
              onTabClick={onTabClick}
              onToggleExpand={() => setShowSubSteps(showSubSteps === step.id ? null : step.id)}
              getStepPercentage={getStepPercentage}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Extracted Step Button component for cleaner code
interface StepButtonProps {
  step: ProgressStep;
  isActive: boolean;
  isExpanded: boolean;
  onTabClick: (tab: string) => void;
  onToggleExpand: () => void;
  getStepPercentage: (step: ProgressStep) => number;
}

const StepButton = ({
  step,
  isActive,
  isExpanded,
  onTabClick,
  onToggleExpand,
  getStepPercentage,
}: StepButtonProps) => {
  const stepPct = getStepPercentage(step);
  const hasSubSteps = step.subSteps && step.subSteps.length > 0;
  const tierStyle = step.tier ? tierColors[step.tier] : tierColors.FREE;
  
  // Check for overdue tasks in this step
  const hasOverdue = step.subSteps?.some(s => 'isOverdue' in s && s.isOverdue);
  const overdueCount = step.subSteps?.find(s => 'overdueCount' in s)?.overdueCount as number | undefined;

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (step.isLocked) return;
          onTabClick(step.id);
          if (hasSubSteps) {
            onToggleExpand();
          }
        }}
        disabled={step.isLocked}
        className={cn(
          "w-full flex flex-col items-center p-2 rounded-lg transition-all",
          step.isLocked && "opacity-50 cursor-not-allowed",
          !step.isLocked && hasOverdue && "bg-red-50 border border-red-200",
          !step.isLocked && !hasOverdue && isActive && "bg-amber-50 border border-amber-200",
          !step.isLocked && !hasOverdue && !isActive && "hover:bg-muted/50"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center mb-1 relative",
          step.isLocked && "bg-slate-100 text-slate-400",
          !step.isLocked && hasOverdue && "bg-red-100 text-red-600",
          !step.isLocked && !hasOverdue && step.isComplete && "bg-green-100 text-green-600",
          !step.isLocked && !hasOverdue && !step.isComplete && stepPct > 0 && "bg-amber-100 text-amber-600",
          !step.isLocked && !hasOverdue && !step.isComplete && stepPct === 0 && "bg-gray-100 text-gray-400"
        )}>
          {step.isLocked ? (
            <Lock className="h-4 w-4" />
          ) : hasOverdue ? (
            <AlertTriangle className="h-4 w-4" />
          ) : step.isComplete ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            stepIcons[step.id]
          )}
          {/* Overdue badge */}
          {hasOverdue && overdueCount && overdueCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {overdueCount}
            </span>
          )}
        </div>
        <span className={cn(
          "text-xs font-medium text-center",
          step.isLocked && "text-slate-400",
          !step.isLocked && isActive && "text-amber-700",
          !step.isLocked && !isActive && step.isComplete && "text-green-600",
          !step.isLocked && !isActive && !step.isComplete && "text-muted-foreground"
        )}>
          {step.name}
        </span>
        {!step.isLocked && (
          <span className={cn(
            "text-[10px] mt-0.5",
            step.isComplete && "text-green-600",
            !step.isComplete && stepPct > 0 && "text-amber-600",
            !step.isComplete && stepPct === 0 && "text-gray-400"
          )}>
            {stepPct.toFixed(1)}/{step.weight}%
          </span>
        )}
        {step.isLocked && step.tier && (
          <Badge className={cn(
            "mt-1 text-[9px] px-1.5 py-0",
            step.tier === "PRO" && "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
            step.tier === "PREMIUM" && "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
          )}>
            {step.tier}
          </Badge>
        )}

        {/* Sub-step indicator */}
        {hasSubSteps && !step.isLocked && (
          <div className="mt-1">
            {isExpanded ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        )}
      </button>

      {/* Sub-steps dropdown */}
      {hasSubSteps && isExpanded && !step.isLocked && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-border rounded-lg shadow-lg p-2 min-w-[160px]">
          {step.subSteps!.map((subStep) => {
            const isOverdueSubStep = 'isOverdue' in subStep && subStep.isOverdue;
            const overdueCount = 'overdueCount' in subStep ? (subStep.overdueCount as number) : 0;
            
            return (
              <div
                key={subStep.id}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded text-xs",
                  isOverdueSubStep && "bg-red-50 border border-red-200",
                  !isOverdueSubStep && subStep.isComplete && "bg-green-50",
                  !isOverdueSubStep && !subStep.isComplete && "bg-amber-50"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {isOverdueSubStep && <AlertTriangle className="h-3 w-3 text-red-500" />}
                  {!isOverdueSubStep && subStep.id === "dueSoon" && <Clock className="h-3 w-3 text-amber-500" />}
                  <span className={cn(
                    isOverdueSubStep && "text-red-700 font-medium",
                    !isOverdueSubStep && subStep.isComplete && "text-green-700",
                    !isOverdueSubStep && !subStep.isComplete && "text-amber-700"
                  )}>
                    {subStep.name}
                  </span>
                </div>
                <span className={cn(
                  "font-medium",
                  isOverdueSubStep && "text-red-600",
                  !isOverdueSubStep && subStep.isComplete && "text-green-600",
                  !isOverdueSubStep && !subStep.isComplete && "text-amber-600"
                )}>
                  {isOverdueSubStep ? (
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  ) : subStep.isComplete ? (
                    "✓"
                  ) : subStep.weight > 0 ? (
                    `${Math.round(subStep.weight / 4)}%`
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuickModeProgressBar;
