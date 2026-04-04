// ============================================
// CUMULATIVE SUMMARY BAR - Shows all previous answers
// Extracted from DefinitionFlowStage.tsx
// ============================================

import { motion } from "framer-motion";
import {
  Hammer,
  Layers,
  User,
  Users,
  Building2,
  CheckCircle2,
  Calendar,
  MapPin,
  Sparkles,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Citation, CITATION_TYPES } from "@/types/citation";
import { format } from "date-fns";
import { type TeamMember, TRADE_OPTIONS } from "./types";

export interface CumulativeSummaryBarProps {
  existingCitations: Citation[];
  gfaValue: number;
  selectedTrade: string | null;
  templateLocked: boolean;
  teamSize: string | null;
  teamMembers: TeamMember[];
  siteCondition: 'clear' | 'demolition';
  demolitionCost: number;
  demolitionUnitPrice: number;
  timeline: 'asap' | 'scheduled';
  scheduledDate: Date | undefined;
  scheduledEndDate: Date | undefined;
  grandTotal: number;
  onCitationClick?: (citationId: string) => void;
}

const CumulativeSummaryBar = ({
  existingCitations,
  gfaValue,
  selectedTrade,
  templateLocked,
  teamSize,
  teamMembers,
  siteCondition,
  demolitionCost,
  demolitionUnitPrice,
  timeline,
  scheduledDate,
  scheduledEndDate,
  grandTotal,
  onCitationClick,
}: CumulativeSummaryBarProps) => {
  const summaryEntries: { label: string; value: string; icon: typeof Sparkles; citationId?: string; color: string }[] = [];

  const nameCitation = existingCitations.find(c => c.cite_type === CITATION_TYPES.PROJECT_NAME);
  if (nameCitation) {
    summaryEntries.push({ label: 'Project', value: nameCitation.answer, icon: Building2, citationId: nameCitation.id, color: 'text-amber-600 dark:text-amber-400' });
  }

  const locationCitation = existingCitations.find(c => c.cite_type === CITATION_TYPES.LOCATION);
  if (locationCitation) {
    summaryEntries.push({ label: 'Location', value: locationCitation.answer, icon: MapPin, citationId: locationCitation.id, color: 'text-amber-600 dark:text-amber-400' });
  }

  const workTypeCitation = existingCitations.find(c => c.cite_type === CITATION_TYPES.WORK_TYPE);
  if (workTypeCitation) {
    summaryEntries.push({ label: 'Work Type', value: workTypeCitation.answer, icon: Building2, citationId: workTypeCitation.id, color: 'text-amber-600 dark:text-amber-400' });
  }

  const gfaCitation = existingCitations.find(c => c.cite_type === CITATION_TYPES.GFA_LOCK);
  if (gfaCitation || gfaValue > 0) {
    summaryEntries.push({ label: 'GFA', value: `${gfaValue.toLocaleString()} sq ft`, icon: Layers, citationId: gfaCitation?.id, color: 'text-blue-600 dark:text-blue-400' });
  }

  if (selectedTrade) {
    summaryEntries.push({ label: 'Trade', value: TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label || selectedTrade, icon: Hammer, color: 'text-orange-600 dark:text-orange-400' });
  }

  if (templateLocked) {
    summaryEntries.push({ label: 'Template', value: `$${grandTotal.toLocaleString()}`, icon: Lock, color: 'text-green-600 dark:text-green-400' });
  }

  if (teamSize === 'solo') {
    summaryEntries.push({ label: 'Team', value: 'Solo', icon: User, color: 'text-green-600 dark:text-green-400' });
  } else if (teamSize === 'team_confirmed') {
    const total = teamMembers.reduce((sum, m) => sum + m.count, 0);
    summaryEntries.push({ label: 'Team', value: `${total} people`, icon: Users, color: 'text-green-600 dark:text-green-400' });
  }

  if (templateLocked && siteCondition === 'clear') {
    summaryEntries.push({ label: 'Site', value: 'Clear', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' });
  } else if (templateLocked && siteCondition === 'demolition') {
    summaryEntries.push({ label: 'Demolition', value: `$${demolitionUnitPrice.toFixed(2)}/sqft → $${demolitionCost.toLocaleString()}`, icon: Hammer, color: 'text-orange-600 dark:text-orange-400' });
  }

  if (timeline === 'asap' && templateLocked) {
    summaryEntries.push({ label: 'Start', value: 'ASAP', icon: Calendar, color: 'text-green-600 dark:text-green-400' });
  } else if (timeline === 'scheduled' && scheduledDate) {
    summaryEntries.push({ label: 'Start', value: format(scheduledDate, 'MMM d'), icon: Calendar, color: 'text-green-600 dark:text-green-400' });
  }
  if (scheduledEndDate) {
    summaryEntries.push({ label: 'End', value: format(scheduledEndDate, 'MMM d'), icon: Calendar, color: 'text-green-600 dark:text-green-400' });
  }

  const isCompact = !!(scheduledEndDate);

  if (summaryEntries.length === 0) return null;

  return (
    <div className="shrink-0 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/60 via-white/60 to-orange-50/60 dark:from-amber-950/30 dark:via-background/60 dark:to-orange-950/30 backdrop-blur-sm">
      <div className={cn("px-4", isCompact ? "py-1.5" : "py-2")}>
        {!isCompact && (
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Project Summary</span>
            <span className="text-xs text-muted-foreground">({summaryEntries.length} facts)</span>
          </div>
        )}
        {isCompact ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {summaryEntries.map((entry, idx) => (
              <motion.button
                key={`${entry.label}-${idx}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => entry.citationId && onCitationClick?.(entry.citationId)}
                className={cn(
                  "flex items-center gap-1.5 py-0.5 text-xs text-left transition-all",
                  "hover:bg-amber-100/50 dark:hover:bg-amber-900/30 rounded px-1 -mx-1",
                  entry.citationId && "cursor-pointer"
                )}
              >
                <entry.icon className={cn("h-3 w-3 shrink-0", entry.color)} />
                <span className="text-muted-foreground">{entry.label}:</span>
                <span className="font-medium text-foreground truncate">{entry.value}</span>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {summaryEntries.map((entry, idx) => (
              <motion.button
                key={`${entry.label}-${idx}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => entry.citationId && onCitationClick?.(entry.citationId)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all",
                  "bg-white/80 dark:bg-slate-800/80 border-amber-200/60 dark:border-amber-800/40",
                  "hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-sm",
                  entry.citationId && "cursor-pointer"
                )}
              >
                <entry.icon className={cn("h-3 w-3", entry.color)} />
                <span className="text-muted-foreground font-medium">{entry.label}:</span>
                <span className="font-semibold text-foreground truncate max-w-[120px]">{entry.value}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CumulativeSummaryBar;
