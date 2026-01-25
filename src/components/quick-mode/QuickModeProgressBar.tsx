import { Camera, LayoutTemplate, Calculator, FileText, ClipboardSignature, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Cloud, CloudOff } from "lucide-react";
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
  lastSaved?: Date | null;
  isLoggedIn?: boolean;
}

const stepIcons: Record<string, React.ReactNode> = {
  photo: <Camera className="h-4 w-4" />,
  templates: <LayoutTemplate className="h-4 w-4" />,
  calculator: <Calculator className="h-4 w-4" />,
  quote: <FileText className="h-4 w-4" />,
  contract: <ClipboardSignature className="h-4 w-4" />,
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
  lastSaved,
  isLoggedIn,
}: QuickModeProgressBarProps) => {
  const [showSubSteps, setShowSubSteps] = useState<string | null>(null);

  const getStepPercentage = (step: ProgressStep) => {
    if (step.isComplete) return step.weight;
    if (!step.subSteps) return 0;
    
    const completedSubSteps = step.subSteps.filter(s => s.isComplete).length;
    const totalSubSteps = step.subSteps.length;
    return Math.round((completedSubSteps / totalSubSteps) * step.weight);
  };

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

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
              {/* Auto-save indicator */}
              {isLoggedIn && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-1 text-xs",
                      lastSaved ? "text-green-600" : "text-muted-foreground"
                    )}>
                      {lastSaved ? (
                        <>
                          <Cloud className="h-3 w-3" />
                          <span>Saved {formatLastSaved(lastSaved)}</span>
                        </>
                      ) : (
                        <>
                          <CloudOff className="h-3 w-3" />
                          <span>Not saved</span>
                        </>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {lastSaved 
                      ? "Progress auto-saved to your account" 
                      : "Add data to auto-save your progress"}
                  </TooltipContent>
                </Tooltip>
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
      <Progress value={percentage} className="h-2 mb-4" />

      {/* Step Indicators */}
      <div className="grid grid-cols-5 gap-2">
        {steps.map((step) => {
          const isActive = activeTab === step.id;
          const stepPct = getStepPercentage(step);
          const hasSubSteps = step.subSteps && step.subSteps.length > 0;
          const isExpanded = showSubSteps === step.id;

          return (
            <div key={step.id} className="relative">
              <button
                onClick={() => {
                  onTabClick(step.id);
                  if (hasSubSteps) {
                    setShowSubSteps(isExpanded ? null : step.id);
                  }
                }}
                className={cn(
                  "w-full flex flex-col items-center p-2 rounded-lg transition-all",
                  isActive && "bg-amber-50 border border-amber-200",
                  !isActive && "hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center mb-1",
                  step.isComplete && "bg-green-100 text-green-600",
                  !step.isComplete && stepPct > 0 && "bg-amber-100 text-amber-600",
                  !step.isComplete && stepPct === 0 && "bg-gray-100 text-gray-400"
                )}>
                  {step.isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    stepIcons[step.id]
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium text-center",
                  isActive && "text-amber-700",
                  !isActive && step.isComplete && "text-green-600",
                  !isActive && !step.isComplete && "text-muted-foreground"
                )}>
                  {step.name}
                </span>
                <span className={cn(
                  "text-[10px] mt-0.5",
                  step.isComplete && "text-green-600",
                  !step.isComplete && stepPct > 0 && "text-amber-600",
                  !step.isComplete && stepPct === 0 && "text-gray-400"
                )}>
                  {stepPct}/{step.weight}%
                </span>

                {/* Sub-step indicator */}
                {hasSubSteps && (
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
              {hasSubSteps && isExpanded && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-border rounded-lg shadow-lg p-2">
                  {step.subSteps!.map((subStep) => (
                    <div
                      key={subStep.id}
                      className={cn(
                        "flex items-center justify-between px-2 py-1.5 rounded text-xs",
                        subStep.isComplete && "bg-green-50",
                        !subStep.isComplete && "bg-amber-50"
                      )}
                    >
                      <span className={cn(
                        subStep.isComplete ? "text-green-700" : "text-amber-700"
                      )}>
                        {subStep.name}
                      </span>
                      <span className={cn(
                        "font-medium",
                        subStep.isComplete ? "text-green-600" : "text-amber-600"
                      )}>
                        {subStep.isComplete ? "✓" : `${Math.round(subStep.weight / 3)}%`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickModeProgressBar;
