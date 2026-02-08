import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stage7PlaceholderProps {
  onNext: () => void;
  className?: string;
}

export default function Stage7Placeholder({
  onNext,
  className,
}: Stage7PlaceholderProps) {
  return (
    <div className={cn("h-full flex flex-col md:flex-row overflow-hidden", className)}>
      {/* LEFT PANEL - Chat Interface */}
      <div className="w-full md:w-[400px] lg:w-[450px] border-r border-indigo-200/50 dark:border-indigo-800/30 flex flex-col h-full bg-gradient-to-b from-indigo-50/30 via-background to-purple-50/20 dark:from-indigo-950/20 dark:via-background dark:to-purple-950/10">
        {/* Header */}
        <div className="p-4 border-b border-indigo-200/50 dark:border-indigo-800/30 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/50 dark:to-purple-950/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-indigo-700 dark:text-indigo-300">
                Stage 7
              </h2>
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
                Coming Soon
              </p>
            </div>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-200 to-purple-200 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-indigo-600 dark:text-indigo-300" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Next Phase Coming Soon
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              This stage is being prepared. Your project DNA is locked and ready for execution.
            </p>
          </motion.div>
        </div>

        {/* CTA */}
        <div className="p-4 border-t border-indigo-200/50 dark:border-indigo-800/30">
          <Button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
          >
            <ChevronRight className="h-4 w-4 mr-2" />
            Continue
          </Button>
        </div>
      </div>

      {/* RIGHT PANEL - Visualization */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-4"
        >
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 dark:from-indigo-600 dark:to-purple-600 flex items-center justify-center mx-auto opacity-20">
            <Sparkles className="h-12 w-12 text-white" />
          </div>
          <p className="text-sm text-muted-foreground">
            Stage 7 visualization
          </p>
        </motion.div>
      </div>
    </div>
  );
}
