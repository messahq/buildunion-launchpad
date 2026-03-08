// ============================================
// GFA LOCK STAGE - Stage 2 of Project Wizard
// ============================================
// Horizontal slide-in stage for GFA input & Blueprint
// Creates GFA_LOCK citation as the Operational Truth
// ============================================

import { useState, useCallback, useEffect, forwardRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, 
  Unlock, 
  Ruler, 
  FileImage, 
  Calculator,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { HardHatSpinner } from "@/components/ui/loading-states";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Citation, CITATION_TYPES, createCitation } from "@/types/citation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CitationBadge } from "./CitationBadge";
import { useUnitSettings } from "@/hooks/useUnitSettings";

interface GFALockStageProps {
  projectId: string;
  userId: string;
  onGFALocked: (citation: Citation) => void;
  onCitationClick?: (citationId: string) => void;
  existingGFA?: Citation | null;
  workType?: string;
  className?: string;
}

// Unit conversion factors to sq ft (area)
const AREA_CONVERSIONS: Record<string, number> = {
  'sqft': 1,
  'sq ft': 1,
  'sqm': 10.7639,
  'sq m': 10.7639,
  'm2': 10.7639,
  'm²': 10.7639,
  'sqyd': 9,
  'sq yd': 9,
};

// Linear unit conversion factors to feet
const LINEAR_TO_FEET: Record<string, number> = {
  'ft': 1,
  'feet': 1,
  'foot': 1,
  "'": 1,
  'in': 1 / 12,
  'inch': 1 / 12,
  'inches': 1 / 12,
  '"': 1 / 12,
  'm': 3.28084,
  'meter': 3.28084,
  'meters': 3.28084,
  'cm': 0.0328084,
  'mm': 0.00328084,
};

type ParsedGFA = { 
  value: number; 
  originalUnit: string; 
  sqftValue: number; 
  inputType: 'area' | 'dimensions';
  dimensionDetails?: { w: number; h: number; unit: string };
};

/**
 * Parse a fractional number string like "36 1/2", "10 3/4", "36.5", "1,500"
 * Returns the decimal value or NaN if invalid
 */
function parseFractionalNumber(input: string): number {
  const s = input.trim().replace(/,/g, '');
  
  // Pattern: "36 1/2" or "10 3/4" (whole + fraction)
  const mixedMatch = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseFloat(mixedMatch[2]);
    const den = parseFloat(mixedMatch[3]);
    if (den === 0) return NaN;
    return whole + num / den;
  }
  
  // Pattern: "1/2" or "3/4" (fraction only)
  const fracMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    if (den === 0) return NaN;
    return num / den;
  }
  
  // Pattern: regular decimal "36.5" or "1500"
  return parseFloat(s);
}

/**
 * Parse input value and unit, convert to sq ft.
 * Supports:
 *  - Area: "1500 sq ft", "140 sqm", "200 m²"
 *  - Dimensions: "30x50 ft", "30ft x 50ft", "30' x 50'", "10m x 15m", "360x480 in"
 *  - Fractional: "36 1/2 in x 48 3/4 in", "36 1/2"", "10 3/4 ft"
 */
function parseGFAInput(input: string): ParsedGFA | null {
  const trimmed = input.trim().toLowerCase().replace(/\s+/g, ' ');

  // ── DIMENSION FORMAT: "WxH unit" or "W unit x H unit" ──
  // Enhanced regex to handle fractional numbers like "36 1/2" x 48 3/4""
  // Strategy: split on 'x' or '×' first, then parse each side
  const dimSeparators = /\s*[x×*]\s*/;
  const parts = trimmed.split(dimSeparators);
  
  if (parts.length === 2) {
    // Try to parse each side as "number [unit]"
    // Match fractional: "36 1/2 in", "36 1/2"", "30ft", "30 ft", "10 3/4 m"
    const sidePattern = /^([\d,./\s]+?)\s*([a-z'"²]+)?$/;
    
    const sideA = parts[0].trim().match(sidePattern);
    const sideB = parts[1].trim().match(sidePattern);
    
    if (sideA && sideB) {
      const w = parseFractionalNumber(sideA[1]);
      const wUnit = (sideA[2] || '').trim();
      const h = parseFractionalNumber(sideB[1]);
      const hUnit = (sideB[2] || wUnit || '').trim();

      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        const resolvedUnit = hUnit || wUnit || 'ft';
        const toFeet = LINEAR_TO_FEET[resolvedUnit];
        if (toFeet !== undefined) {
          const wFeet = w * toFeet;
          const hFeet = h * toFeet;
          const sqft = Math.round(wFeet * hFeet);
          const displayUnit = resolvedUnit === "'" ? 'ft' : resolvedUnit === '"' ? 'in' : resolvedUnit;

          return {
            value: w * h,
            originalUnit: displayUnit,
            sqftValue: sqft,
            inputType: 'dimensions',
            dimensionDetails: { w: Math.round(w * 100) / 100, h: Math.round(h * 100) / 100, unit: displayUnit },
          };
        }
      }
    }
  }

  // ── AREA FORMAT: "1500 sq ft", "140 sqm", "200 m²", "36 1/2 sq ft" ──
  // Match fractional number + optional unit
  const areaPattern = /^([\d,./\s]+?)\s*([a-z²\s]+)?$/;
  const match = trimmed.match(areaPattern);
  if (!match) return null;

  const value = parseFractionalNumber(match[1]);
  if (isNaN(value) || value <= 0) return null;

  const unitPart = (match[2] || '').trim() || 'sqft';


  // Check if it's a known area unit
  for (const [unit, factor] of Object.entries(AREA_CONVERSIONS)) {
    if (unitPart === unit || unitPart === unit.replace(' ', '')) {
      return {
        value,
        originalUnit: unit,
        sqftValue: Math.round(value * factor),
        inputType: 'area',
      };
    }
  }

  // Check if it's a linear unit (single dimension — just convert as area in that linear unit²)
  // e.g. someone types "1500 ft" meaning 1500 sq ft, or "140 m" meaning 140 sq m
  // We treat bare linear units as area if it's a single number
  for (const [unit] of Object.entries(LINEAR_TO_FEET)) {
    if (unitPart === unit) {
      // For "in" / "inches" -> convert to sq ft: value * (1/12)^2
      // For "ft" / "feet" -> value is already sq ft
      // For "m" / "meters" -> value * 10.7639
      const toFeet = LINEAR_TO_FEET[unit];
      const sqft = Math.round(value * toFeet * toFeet);
      // But this creates weird results for "1500 in" = ~10 sqft
      // More likely: user means area. Let's handle common cases:
      if (unit === 'in' || unit === 'inch' || unit === 'inches' || unit === '"') {
        // "1500 sq inches" -> sq ft
        return {
          value,
          originalUnit: 'sq in',
          sqftValue: Math.round(value / 144), // 144 sq in = 1 sq ft
          inputType: 'area',
        };
      }
      if (unit === 'ft' || unit === 'feet' || unit === 'foot' || unit === "'") {
        // Treat as sq ft directly
        return { value, originalUnit: 'sq ft', sqftValue: Math.round(value), inputType: 'area' };
      }
      if (unit === 'm' || unit === 'meter' || unit === 'meters') {
        return { value, originalUnit: 'sq m', sqftValue: Math.round(value * 10.7639), inputType: 'area' };
      }
      if (unit === 'cm') {
        // sq cm to sq ft
        return { value, originalUnit: 'sq cm', sqftValue: Math.round(value / 929.03), inputType: 'area' };
      }
    }
  }

  // Fallback: treat as sq ft
  return { value, originalUnit: 'sq ft', sqftValue: Math.round(value), inputType: 'area' };
}


// Service-based trades that don't need real area
const SERVICE_TRADES = ['electrical', 'plumbing', 'hvac', 'repair', 'landscaping', 'other'];

const GFALockStage = forwardRef<HTMLDivElement, GFALockStageProps>(
  ({ projectId, userId, onGFALocked, onCitationClick, existingGFA, workType, className }, ref) => {
    const isServiceTrade = workType ? SERVICE_TRADES.includes(workType) : false;
    const [inputValue, setInputValue] = useState(isServiceTrade ? "1" : "");
    const [parsedValue, setParsedValue] = useState<ParsedGFA | null>(null);
    const [isLocking, setIsLocking] = useState(false);
    const [isLocked, setIsLocked] = useState(!!existingGFA);
    const [lockedCitation, setLockedCitation] = useState<Citation | null>(existingGFA || null);
    
    // Display helper: show in user's preferred unit
    const displayGFA = useCallback((sqftValue: number): { value: string; unit: string } => {
      // We check localStorage directly to avoid provider dependency issues
      const stored = typeof window !== 'undefined' ? localStorage.getItem('buildunion_unit_system') : null;
      const isMetricPref = stored === 'metric';
      if (isMetricPref) {
        const sqm = sqftValue * 0.092903;
        return { value: sqm.toLocaleString(undefined, { maximumFractionDigits: 1 }), unit: 'sq m' };
      }
      return { value: sqftValue.toLocaleString(), unit: 'sq ft' };
    }, []);


    
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
            input_type: parsedValue.inputType,
            ...(parsedValue.dimensionDetails ? { dimensions: parsedValue.dimensionDetails } : {}),
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
        
        // ── GFA IMMUTABILITY GUARD: Block duplicate GFA_LOCK ──
        const existingGfaLock = currentFacts.find(
          (f: any) => f.cite_type === 'GFA_LOCK'
        );
        if (existingGfaLock) {
          toast.error("GFA is already locked. To change the area, please create a new project.");
          setIsLocking(false);
          return;
        }
        
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
          "h-full flex flex-col overflow-y-auto relative",
          "bg-[#0f1729] dark:bg-[#0f1729]",
          className
        )}
      >
        {/* Animated background stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-amber-400/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                repeat: Infinity,
                duration: 2 + Math.random() * 3,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Stage Header - centered title with progress */}
        <div className="relative z-10 p-4 md:p-6 flex-shrink-0">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-[28px] font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              {isLocked ? "Area Locked ✓" : "Lock Project Area"}
            </h2>
            <p className="text-sm text-gray-400">
              Project Architect – Step 2 of 3
            </p>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Step 2/3</span>
                <span>67%</span>
              </div>
              <div className="w-full h-2.5 bg-[#1a2235] rounded-full overflow-hidden border border-gray-700/50">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                  initial={{ width: "33%" }}
                  animate={{ width: "67%" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="relative z-10 flex-1 flex items-start md:items-center justify-center p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!isLocked ? (
              /* INPUT STATE */
              <motion.div
                key="input"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -100 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-md space-y-5"
              >
                {/* Question text */}
                <div className="text-center space-y-2">
                  <motion.div
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ repeat: Infinity, duration: 4 }}
                  >
                    <Calculator className="h-12 w-12 md:h-14 md:w-14 mx-auto text-amber-500 drop-shadow-lg" />
                  </motion.div>
                  <h3 className="text-[20px] font-semibold text-white">
                    {isServiceTrade ? "Service Trade Detected" : "Define Your Project Area"}
                  </h3>
                  <p className="text-sm text-gray-400 px-2">
                    {isServiceTrade 
                      ? "This value will be locked and used for all cost calculations."
                      : "This value will be locked and used for all cost calculations."
                    }
                  </p>
                  <p className="text-sm italic text-gray-500 px-2">
                    {isServiceTrade
                      ? 'Area pre-set to 1 sq ft – costs will be based on your template line items, not area.'
                      : 'e.g., 1500 sq ft, 30x50 ft, 36 1/2 x 48 3/4 in'
                    }
                  </p>
                  {!isServiceTrade && (
                    <p className="text-xs text-amber-500/70 px-2 mt-1">
                      💡 For service trades (Plumbing, Electrical, HVAC), enter <strong>1 sq ft</strong> — costs come from template items.
                    </p>
                  )}
                </div>
                
                {/* GFA Input Field - premium dark style */}
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="e.g., 1500 sq ft, 30x50 ft"
                      className="h-14 text-[18px] text-center font-semibold rounded-xl border-2 border-gray-600/50 hover:border-[#ff9500] focus:border-[#ff9500] focus:ring-[#ff9500]/30 bg-[#1a2235] text-gray-100 placeholder:text-gray-500 transition-all duration-300"
                      autoFocus
                    />
                    <motion.div 
                      className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full"
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
                        className="bg-black/30 backdrop-blur-md rounded-xl p-3 border border-green-500/30"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-400 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Validated
                          </span>
                          <span className="font-bold text-white text-base">
                            {displayGFA(parsedValue.sqftValue).value} {displayGFA(parsedValue.sqftValue).unit}
                          </span>
                        </div>
                        {parsedValue.inputType === 'dimensions' && parsedValue.dimensionDetails && (
                          <p className="text-xs text-gray-400 mt-1">
                            {parsedValue.dimensionDetails.w} × {parsedValue.dimensionDetails.h} {parsedValue.dimensionDetails.unit} = {parsedValue.sqftValue.toLocaleString()} sq ft
                          </p>
                        )}
                        {parsedValue.inputType === 'area' && parsedValue.originalUnit !== 'sq ft' && parsedValue.originalUnit !== 'sqft' && (
                          <p className="text-xs text-gray-400 mt-1">
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
                      className="flex items-center gap-2 text-sm text-red-400"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>Enter a valid number (e.g., 1500 sq ft, 30x50 ft, 360x480 in)</span>
                    </motion.div>
                  )}
                </div>
                
                {/* Lock Button - premium orange */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <motion.button
                    onClick={handleLockGFA}
                    disabled={!parsedValue || isLocking}
                    className="w-full h-14 text-lg font-semibold text-white rounded-xl gap-2 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
                    style={{ backgroundColor: '#ff9500' }}
                    whileHover={{
                      backgroundColor: '#ffaa33',
                      boxShadow: '0 0 30px rgba(255,149,0,0.4)',
                    }}
                  >
                    {isLocking ? (
                      <>
                        <HardHatSpinner size="sm" />
                        Locking...
                      </>
                    ) : (
                      <>
                        <Lock className="h-5 w-5" />
                        Lock GFA & Continue
                      </>
                    )}
                  </motion.button>
                </motion.div>
                
                {/* Info text */}
                <p className="text-xs text-center text-gray-500 px-2">
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
                    className="text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent"
                  >
                    {displayGFA(lockedCitation?.metadata?.gfa_value as number || 0).value}
                  </motion.div>
                  
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg text-amber-400 font-medium"
                  >
                    {displayGFA(lockedCitation?.metadata?.gfa_value as number || 0).unit}
                  </motion.p>
                </div>

                
                {/* GFA Immutability Notice */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="text-xs text-amber-500/80 max-w-xs mx-auto"
                >
                  ⚠️ GFA cannot be modified after locking. If your project area has changed significantly, please create a new project.
                </motion.p>

                {/* Locked Badge - Clickable Citation */}
                {lockedCitation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 backdrop-blur-md border border-green-500/30">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4 text-green-400" />
                      </motion.div>
                      <span className="text-sm font-semibold text-green-400">
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
                  className="text-sm text-gray-400 flex items-center justify-center gap-2"
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
            className="relative z-10 p-4 border-t border-gray-700/30 bg-black/20 backdrop-blur-sm"
          >
            <div className="flex items-center justify-center gap-3 text-gray-400">
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
