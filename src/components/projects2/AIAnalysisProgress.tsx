import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIAnalysisProgressProps {
  progress: number;
  currentStep: string;
  analyzing: boolean;
  error: string | null;
  tier?: string;
}

export default function AIAnalysisProgress({
  progress,
  currentStep,
  analyzing,
  error,
  tier = "free",
}: AIAnalysisProgressProps) {
  const isPremium = tier === "pro" || tier === "premium" || tier === "enterprise";
  
  return (
    <Card className={cn(
      "border-2 transition-all",
      analyzing && "border-primary/50 animate-pulse",
      error && "border-destructive/50",
      !analyzing && !error && progress === 100 && "border-green-500/50"
    )}>
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            analyzing && "bg-primary/10",
            error && "bg-destructive/10",
            !analyzing && !error && progress === 100 && "bg-green-500/10"
          )}>
            {analyzing && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
            {error && <AlertCircle className="h-5 w-5 text-destructive" />}
            {!analyzing && !error && progress === 100 && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            {!analyzing && !error && progress < 100 && (
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">
                {error ? "Analysis Failed" : progress === 100 ? "Analysis Complete" : "AI Photo Analysis"}
              </h3>
              {isPremium && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400">
                  {tier.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {error || currentStep || "Waiting to start..."}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {analyzing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Processing</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {/* Analysis steps indicator */}
        {analyzing && (
          <div className="flex gap-2 text-xs">
            <span className={cn(
              "px-2 py-1 rounded-full",
              progress >= 10 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}>
              1. Upload
            </span>
            <span className={cn(
              "px-2 py-1 rounded-full",
              progress >= 30 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}>
              2. Visual AI
            </span>
            <span className={cn(
              "px-2 py-1 rounded-full",
              progress >= 60 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}>
              3. Estimate
            </span>
            <span className={cn(
              "px-2 py-1 rounded-full",
              progress >= 90 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}>
              4. Save
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
