import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SynthesisResult, DualEngineOutput } from "./AIAnalysisCitation";

interface ConflictStatusIndicatorProps {
  synthesisResult?: SynthesisResult;
  dualEngineOutput?: DualEngineOutput;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export default function ConflictStatusIndicator({
  synthesisResult,
  dualEngineOutput,
  size = "md",
  showLabel = true,
  className,
}: ConflictStatusIndicatorProps) {
  const hasConflicts = synthesisResult?.conflicts && synthesisResult.conflicts.length > 0;
  const isVerified = synthesisResult?.verificationStatus === "verified";
  const isPending = !synthesisResult || synthesisResult.verificationStatus === "pending";
  
  // Check if both engines have output
  const hasGeminiOutput = !!dualEngineOutput?.gemini?.area;
  const hasOpenAIOutput = !!dualEngineOutput?.openai?.validationStatus;
  const bothEnginesActive = hasGeminiOutput && hasOpenAIOutput;

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-5 w-5",
    lg: "h-7 w-7",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  if (hasConflicts) {
    const highSeverityCount = synthesisResult!.conflicts.filter(c => c.severity === "high").length;
    
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className={cn(
          "rounded-full flex items-center justify-center",
          "bg-destructive/20 animate-pulse",
          sizeClasses[size]
        )}>
          <AlertTriangle className={cn(iconSizes[size], "text-destructive")} />
        </div>
        {showLabel && (
          <div>
            <Badge variant="destructive" className={cn(textSizes[size], "font-semibold")}>
              CONFLICT DETECTED
            </Badge>
            <p className="text-xs text-muted-foreground mt-0.5">
              {highSeverityCount > 0 
                ? `${highSeverityCount} high-severity issue${highSeverityCount > 1 ? "s" : ""}`
                : `${synthesisResult!.conflicts.length} discrepancy found`
              }
            </p>
          </div>
        )}
      </div>
    );
  }

  if (isVerified && bothEnginesActive) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className={cn(
          "rounded-full flex items-center justify-center",
          "bg-green-500/20",
          sizeClasses[size]
        )}>
          <CheckCircle2 className={cn(iconSizes[size], "text-green-600 dark:text-green-400")} />
        </div>
        {showLabel && (
          <div>
            <Badge className={cn(textSizes[size], "font-semibold bg-green-500/20 text-green-600 hover:bg-green-500/30")}>
              ENGINES ALIGNED
            </Badge>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gemini & OpenAI results match
            </p>
          </div>
        )}
      </div>
    );
  }

  // Pending / Analyzing state
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        "rounded-full flex items-center justify-center",
        "bg-muted",
        sizeClasses[size]
      )}>
        {isPending ? (
          <Loader2 className={cn(iconSizes[size], "text-muted-foreground animate-spin")} />
        ) : (
          <CheckCircle2 className={cn(iconSizes[size], "text-muted-foreground")} />
        )}
      </div>
      {showLabel && (
        <div>
          <Badge variant="outline" className={cn(textSizes[size])}>
            {isPending ? "ANALYZING" : "PARTIAL"}
          </Badge>
          <p className="text-xs text-muted-foreground mt-0.5">
            {!hasGeminiOutput && !hasOpenAIOutput 
              ? "Awaiting engine output"
              : hasGeminiOutput 
                ? "OpenAI validation pending"
                : "Gemini analysis pending"
            }
          </p>
        </div>
      )}
    </div>
  );
}
