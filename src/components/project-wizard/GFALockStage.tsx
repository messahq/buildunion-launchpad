// ============================================
// GFA LOCK STAGE - Stage 2 of Project Wizard
// ============================================
// Horizontal slide-in stage for GFA input & Blueprint
// Creates GFA_LOCK citation as the Operational Truth
// ============================================

import { useState, useCallback, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, 
  Unlock, 
  Ruler, 
  FileImage, 
  Calculator,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Citation, CITATION_TYPES, createCitation } from "@/types/citation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CitationBadge } from "./CitationBadge";

interface GFALockStageProps {
  projectId: string;
  userId: string;
  onGFALocked: (citation: Citation) => void;
  onCitationClick?: (citationId: string) => void;
  existingGFA?: Citation | null;
  className?: string;
}

// Unit conversion factors to sq ft
const UNIT_CONVERSIONS: Record<string, number> = {
  'sqft': 1,
  'sq ft': 1,
  'sqm': 10.7639,
  'sq m': 10.7639,
  'm2': 10.7639,
  'm²': 10.7639,
  'sqyd': 9,
  'sq yd': 9,
};

/**
 * Parse input value and unit, convert to sq ft
 */
function parseGFAInput(input: string): { value: number; originalUnit: string; sqftValue: number } | null {
  const trimmed = input.trim().toLowerCase();
  
  // Try to match number with optional unit
  const match = trimmed.match(/^([\d,\.]+)\s*(.*)$/);
  if (!match) return null;
  
  const rawNumber = match[1].replace(/,/g, '');
  const value = parseFloat(rawNumber);
  if (isNaN(value) || value <= 0) return null;
  
  const unitPart = match[2].trim() || 'sqft';
  
  // Find matching conversion factor
  let conversionFactor = 1;
  let detectedUnit = 'sq ft';
  
  for (const [unit, factor] of Object.entries(UNIT_CONVERSIONS)) {
    if (unitPart.includes(unit.replace(' ', ''))) {
      conversionFactor = factor;
      detectedUnit = unit;
      break;
    }
  }
  
  return {
    value,
    originalUnit: detectedUnit,
    sqftValue: Math.round(value * conversionFactor),
  };
}

const GFALockStage = forwardRef<HTMLDivElement, GFALockStageProps>(
  ({ projectId, userId, onGFALocked, onCitationClick, existingGFA, className }, ref) => {
    const [inputValue, setInputValue] = useState("");
    const [parsedValue, setParsedValue] = useState<ReturnType<typeof parseGFAInput>>(null);
    const [isLocking, setIsLocking] = useState(false);
    const [isLocked, setIsLocked] = useState(!!existingGFA);
    const [lockedCitation, setLockedCitation] = useState<Citation | null>(existingGFA || null);
    
    // Parse input in real-time
    useEffect(() => {
      if (inputValue.trim()) {
        const parsed = parseGFAInput(inputValue);
        setParsedValue(parsed);
      } else {
        setParsedValue(null);
      }
    }, [inputValue]);
    
    // If we already have a GFA citation, show locked state
    useEffect(() => {
      if (existingGFA) {
        setIsLocked(true);
        setLockedCitation(existingGFA);
      }
    }, [existingGFA]);
    
    /**
     * Lock the GFA value - Create citation and save to DB
     */
    const handleLockGFA = useCallback(async () => {
      if (!parsedValue || isLocking) return;
      
      setIsLocking(true);
      
      try {
        // Create the GFA_LOCK citation
        const citation = createCitation({
          cite_type: CITATION_TYPES.GFA_LOCK,
          question_key: 'gfa',
          answer: `${parsedValue.sqftValue.toLocaleString()} sq ft`,
          value: parsedValue.sqftValue,
          metadata: {
            gfa_value: parsedValue.sqftValue,
            gfa_unit: 'sqft',
            original_input: inputValue,
            original_unit: parsedValue.originalUnit,
          },
        });
        
        // Get current citations
        const { data: currentData } = await supabase
          .from("project_summaries")
          .select("id, verified_facts")
          .eq("project_id", projectId)
          .maybeSingle();
        
        const currentFacts = Array.isArray(currentData?.verified_facts) 
          ? currentData.verified_facts 
          : [];
        
        // Append new citation
        const updatedFacts = [...currentFacts, citation as unknown as Record<string, unknown>];
        
        // Save to database
        let error;
        if (currentData?.id) {
          const result = await supabase
            .from("project_summaries")
            .update({
              verified_facts: updatedFacts as unknown as null,
              updated_at: new Date().toISOString(),
            })
            .eq("project_id", projectId);
          error = result.error;
        } else {
          const result = await supabase
            .from("project_summaries")
            .insert({
              project_id: projectId,
              user_id: userId,
              verified_facts: updatedFacts as unknown as null,
            });
          error = result.error;
        }
        
        if (error) throw error;
        
        // SUCCESS - Transition to locked state
        setLockedCitation(citation);
        setIsLocked(true);
        onGFALocked(citation);
        toast.success("GFA locked successfully!");
        
      } catch (err) {
        console.error("[GFALock] Save failed:", err);
        toast.error("Failed to lock GFA - please try again");
      } finally {
        setIsLocking(false);
      }
    }, [parsedValue, inputValue, projectId, userId, onGFALocked, isLocking]);
    
    return (
      <div 
        ref={ref} 
        className={cn(
          "h-full flex flex-col bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/20 overflow-y-auto",
          className
        )}
      >
        {/* Stage Header */}
        <div className="p-3 md:p-4 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/80 via-white/80 to-orange-50/80 dark:from-amber-950/50 dark:via-background/80 dark:to-orange-950/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            <motion.div 
              className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 flex-shrink-0"
              animate={isLocked ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: isLocked ? Infinity : 0, duration: 2 }}
            >
              {isLocked ? (
                <Lock className="h-4 w-4 md:h-5 md:w-5 text-white" />
              ) : (
                <Ruler className="h-4 w-4 md:h-5 md:w-5 text-white" />
              )}
            </motion.div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm md:text-base bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                {isLocked ? "Area Locked" : "Lock Project Area"}
              </h2>
              <p className="text-[10px] md:text-xs text-amber-600/70 dark:text-amber-400/70 truncate">
                {isLocked ? "GFA is your budget foundation" : "Enter Gross Floor Area to proceed"}
              </p>
            </div>
          </div>
        </div>
        
        {/* Main Content - scrollable on mobile with safe area bottom */}
        <div className="flex-1 flex items-start md:items-center justify-center p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!isLocked ? (
              /* INPUT STATE */
              <motion.div
                key="input"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -100 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-md space-y-4 md:space-y-6"
              >
                <div className="text-center space-y-2">
                  <motion.div
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ repeat: Infinity, duration: 4 }}
                  >
                    <Calculator className="h-12 w-12 md:h-16 md:w-16 mx-auto text-amber-500 drop-shadow-lg" />
                  </motion.div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground">
                    Define Your Project Area
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground px-2">
                    This value will be locked and used for all cost calculations.
                  </p>
                  <p className="text-[10px] md:text-xs text-amber-600/80 dark:text-amber-400/80 px-2 mt-1">
                    💡 For service-based trades (Plumbing, Electrical, HVAC), enter <strong>1 sq ft</strong> as a placeholder — costs will be based on your template items, not area.
                  </p>
                </div>
                
                {/* GFA Input Field */}
                <div className="space-y-2 md:space-y-3">
                  <div className="relative">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="e.g., 1500 sq ft or 140 sqm"
                      className="h-12 md:h-14 text-base md:text-lg text-center font-semibold rounded-xl border-2 border-amber-300 dark:border-amber-700 focus:border-amber-500 focus:ring-amber-500/30 bg-card placeholder:text-muted-foreground/50"
                      autoFocus
                    />
                    <motion.div 
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-amber-500 rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                  </div>
                  
                  {/* Real-time conversion feedback */}
                  <AnimatePresence>
                    {parsedValue && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gradient-to-r from-amber-100/80 to-orange-100/80 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg p-3 border border-amber-200/50 dark:border-amber-800/50"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-amber-700 dark:text-amber-300 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Validated
                          </span>
                          <span className="font-bold text-amber-800 dark:text-amber-200">
                            {parsedValue.sqftValue.toLocaleString()} sq ft
                          </span>
                        </div>
                        {parsedValue.originalUnit !== 'sq ft' && parsedValue.originalUnit !== 'sqft' && (
                          <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">
                            Converted from {parsedValue.value.toLocaleString()} {parsedValue.originalUnit}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Error state */}
                  {inputValue.trim() && !parsedValue && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 text-sm text-red-500 dark:text-red-400"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>Enter a valid number (e.g., 1500 sq ft)</span>
                    </motion.div>
                  )}
                </div>
                
                {/* Lock Button */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleLockGFA}
                    disabled={!parsedValue || isLocking}
                    className="w-full h-11 md:h-12 text-base md:text-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 rounded-xl gap-2"
                  >
                    {isLocking ? (
                      <>
                        <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                        Locking...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 md:h-5 md:w-5" />
                        Lock GFA & Continue
                      </>
                    )}
                  </Button>
                </motion.div>
                
                {/* Info text */}
                <p className="text-[10px] md:text-xs text-center text-muted-foreground px-2">
                  Once locked, this value becomes the foundation for your project budget
                </p>
              </motion.div>
            ) : (
              /* LOCKED STATE */
              <motion.div
                key="locked"
                initial={{ opacity: 0, scale: 0.8, x: 100 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 200, 
                  damping: 20,
                  delay: 0.1 
                }}
                className="text-center space-y-6"
              >
                {/* Pulsing Lock Icon */}
                <motion.div
                  className="relative inline-block"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/50">
                    <Lock className="h-12 w-12 text-white" />
                  </div>
                  
                  {/* Pulsing ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-amber-500"
                    animate={{ 
                      scale: [1, 1.3, 1.5],
                      opacity: [0.6, 0.3, 0]
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-orange-500"
                    animate={{ 
                      scale: [1, 1.3, 1.5],
                      opacity: [0.6, 0.3, 0]
                    }}
                    transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                  />
                </motion.div>
                
                {/* Locked Value Display */}
                <div className="space-y-2">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-5xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent"
                  >
                    {(lockedCitation?.metadata?.gfa_value as number || 0).toLocaleString()}
                  </motion.div>
                  
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg text-amber-600 dark:text-amber-400 font-medium"
                  >
                    Square Feet
                  </motion.p>
                </div>
                
                {/* Locked Badge - Clickable Citation */}
                {lockedCitation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 border border-amber-300 dark:border-amber-700">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </motion.div>
                      <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                        LOCKED
                      </span>
                    </div>
                    <CitationBadge
                      citation={lockedCitation}
                      onClick={onCitationClick}
                      variant="system"
                    />
                  </motion.div>
                )}
                
                {/* Budget Ready Indicator */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-sm text-amber-700/70 dark:text-amber-400/70 flex items-center justify-center gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  Budget calculator is now enabled
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Blueprint Upload Teaser (future stage) */}
        {isLocked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="p-4 border-t border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30"
          >
            <div className="flex items-center justify-center gap-3 text-amber-600/70 dark:text-amber-400/70">
              <FileImage className="h-5 w-5" />
              <span className="text-sm">Blueprint Analysis coming in Stage 3...</span>
            </div>
          </motion.div>
        )}
      </div>
    );
  }
);

GFALockStage.displayName = "GFALockStage";

export default GFALockStage;
