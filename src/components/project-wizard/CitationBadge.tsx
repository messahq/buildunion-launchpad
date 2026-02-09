// ============================================
// CITATION BADGE - Clickable Source Reference
// ============================================
// Universal clickable badge that scrolls back to
// the chat message that generated the citation
// ============================================

import { motion } from "framer-motion";
import { FileText, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Citation } from "@/types/citation";

interface CitationBadgeProps {
  citation: Citation;
  onClick?: (citationId: string) => void;
  variant?: 'user' | 'system' | 'panel' | 'inline';
  isSaving?: boolean;
  saveError?: boolean;
  showFullId?: boolean;
  className?: string;
}

export const CitationBadge = ({
  citation,
  onClick,
  variant = 'system',
  isSaving = false,
  saveError = false,
  showFullId = false,
  className,
}: CitationBadgeProps) => {
  const handleClick = () => {
    if (onClick && citation.id) {
      onClick(citation.id);
    }
  };

  const idDisplay = showFullId 
    ? citation.id 
    : `${citation.id.slice(0, 8)}...`;

  // Variant-specific styles
  const variantStyles = {
    user: "bg-white/20 text-white hover:bg-white/30 border-white/20",
    system: "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50 border-amber-200/50 dark:border-amber-700/50",
    panel: "bg-indigo-100/80 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200/80 dark:hover:bg-indigo-800/30 border-indigo-200/50 dark:border-indigo-700/50",
    inline: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200/50 dark:border-slate-700/50",
  };

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-all border cursor-pointer group",
        variantStyles[variant],
        onClick && "hover:shadow-sm",
        className
      )}
      title={`Citation ID: ${citation.id}\nType: ${citation.cite_type}\nClick to scroll to source`}
    >
      {isSaving ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : saveError ? (
        <AlertCircle className="h-3 w-3" />
      ) : (
        <FileText className="h-3 w-3" />
      )}
      <span className="font-mono text-[10px]">
        {isSaving 
          ? "Saving..." 
          : saveError 
            ? "Failed" 
            : `cite: [${idDisplay}]`}
      </span>
      {onClick && !isSaving && !saveError && (
        <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </motion.button>
  );
};

// Simple inline version for panels
interface InlineCiteBadgeProps {
  citationId: string;
  onClick?: (citationId: string) => void;
  color?: 'amber' | 'indigo' | 'green' | 'blue' | 'purple' | 'red';
  className?: string;
}

export const InlineCiteBadge = ({
  citationId,
  onClick,
  color = 'indigo',
  className,
}: InlineCiteBadgeProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick(citationId);
    }
  };

  const colorStyles = {
    amber: "text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300",
    indigo: "text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300",
    green: "text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300",
    blue: "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300",
    purple: "text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300",
    red: "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300",
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "text-[9px] font-mono cursor-pointer hover:underline transition-colors inline-flex items-center gap-0.5",
        colorStyles[color],
        className
      )}
      title={`Click to view source: ${citationId}`}
    >
      cite: [{citationId.slice(0, 6)}]
      <ExternalLink className="h-2 w-2 opacity-60" />
    </button>
  );
};

export default CitationBadge;
