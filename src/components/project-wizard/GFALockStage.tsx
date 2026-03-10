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
  // Match number (with optional fraction like "36 1/2") + optional unit
  // The number part allows digits, commas, dots, slashes and spaces (for fractions)
  // but we anchor the unit match to known patterns to avoid greedy issues
  const areaPattern = /^([\d,]+(?:\s+\d+\/\d+)?(?:\.\d+)?(?:\/\d+)?)\s*([a-z²\s]*)?$/;
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
          answer: `${parsedValue.sqftValue}`,
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
          "bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 dark:from-[#0a0e1a] dark:via-[#0f1420] dark:to-[#0a0e1a]",
          className
        )}
      >
        {/* Metal texture overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)' }}
        />

        {/* Animated stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(25)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-0.5 h-0.5 bg-amber-500/20 dark:bg-amber-300/40"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              }}
              animate={{
                opacity: [0.1, 0.9, 0.1],
                scale: [0.5, 1.5, 0.5],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.5 + Math.random() * 2,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>

        {/* CYBERTRUCK HEADER */}
        <div className="relative z-10 p-4 md:p-5 flex-shrink-0">
          <div className="text-center space-y-3">
            <motion.h2 
              className="text-[28px] md:text-[32px] font-medium uppercase tracking-[0.15em] bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 dark:from-amber-400 dark:via-orange-400 dark:to-yellow-500 bg-clip-text text-transparent"
              style={{ textShadow: '0 0 8px rgba(255,149,0,0.3)' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {isLocked ? "AREA LOCKED ✓" : "LOCK PROJECT AREA"}
            </motion.h2>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-500 font-mono">
              Project Architect — Step 2 of 3
            </p>

            {/* Angular Progress Bar */}
            <div className="max-w-sm mx-auto space-y-1">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-600 font-mono">
                <span>Step 2/3</span>
                <span>67%</span>
              </div>
              <div className="w-full h-2 bg-gray-300 dark:bg-[#111827] overflow-hidden border border-gray-400/30 dark:border-gray-700/40"
                style={{ clipPath: 'polygon(0 0, 100% 0, 98% 100%, 2% 100%)' }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500"
                  initial={{ width: "33%" }}
                  animate={{ width: "67%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="relative z-10 flex-1 flex items-start md:items-center justify-center p-4 md:p-6 pb-24 md:pb-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!isLocked ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -100 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-md space-y-5"
              >
                {/* Question */}
                <div className="text-center space-y-2">
                  <motion.div
                    animate={{ rotate: [0, 3, -3, 0], scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                  >
                    <Calculator className="h-10 w-10 md:h-12 md:w-12 mx-auto text-amber-500 drop-shadow-[0_0_8px_rgba(255,149,0,0.4)]" />
                  </motion.div>
                  <h3 className="text-[20px] md:text-[22px] font-bold uppercase tracking-wide text-gray-800 dark:text-white"
                    style={{ textShadow: '0 0 6px rgba(255,149,0,0.2)' }}
                  >
                    {isServiceTrade ? "SERVICE TRADE DETECTED" : "ENTER GROSS FLOOR AREA"}
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    This value will be locked and used for all cost calculations.
                  </p>
                  <p className="text-sm italic text-gray-600 dark:text-gray-400 font-mono">
                    {isServiceTrade
                      ? 'Area pre-set to 1 sq ft – costs based on template line items.'
                      : 'e.g., 1500 sq ft, 30x50 ft, 36 1/2 x 48 3/4 in'
                    }
                  </p>
                  {!isServiceTrade && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-mono">
                      💡 Service trades → enter 1 sq ft
                    </p>
                  )}
                </div>
                
                {/* CYBERTRUCK INPUT */}
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="e.g., 1500 sq ft, 30x50 ft"
                      className="h-16 text-[20px] text-center font-bold border-2 border-amber-400/50 dark:border-amber-500/30 hover:border-amber-500 focus:border-amber-500 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-all duration-300 font-mono"
                      style={{ 
                        clipPath: 'polygon(0 0, 100% 0, 98% 100%, 2% 100%)',
                        boxShadow: inputValue ? '0 0 12px rgba(255,149,0,0.15)' : 'none',
                      }}
                      autoFocus
                    />
                    <motion.div 
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500"
                      style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                  </div>
                  
                  {/* Validation feedback */}
                  <AnimatePresence>
                    {parsedValue && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white/80 dark:bg-[#0d1117]/80 backdrop-blur-md p-3 border border-green-500/30"
                        style={{ clipPath: 'polygon(1% 0, 99% 0, 100% 100%, 0% 100%)' }}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-600 dark:text-green-400 flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                            <CheckCircle2 className="h-4 w-4" />
                            Validated
                          </span>
                          <span className="font-bold text-gray-800 dark:text-white text-base font-mono">
                            {displayGFA(parsedValue.sqftValue).value} {displayGFA(parsedValue.sqftValue).unit}
                          </span>
                        </div>
                        {parsedValue.inputType === 'dimensions' && parsedValue.dimensionDetails && (
                          <p className="text-[11px] text-gray-500 mt-1 font-mono">
                            {parsedValue.dimensionDetails.w} × {parsedValue.dimensionDetails.h} {parsedValue.dimensionDetails.unit} = {parsedValue.sqftValue.toLocaleString()} sq ft
                          </p>
                        )}
                        {parsedValue.inputType === 'area' && parsedValue.originalUnit !== 'sq ft' && parsedValue.originalUnit !== 'sqft' && (
                          <p className="text-[11px] text-gray-500 mt-1 font-mono">
                            Converted from {parsedValue.value.toLocaleString()} {parsedValue.originalUnit}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Error */}
                  {inputValue.trim() && !parsedValue && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 text-sm text-red-400 font-mono"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">Invalid format — try 1500 sq ft or 30x50 ft</span>
                    </motion.div>
                  )}
                </div>
                
                {/* CYBERTRUCK LOCK BUTTON */}
                <motion.button
                  onClick={handleLockGFA}
                  disabled={!parsedValue || isLocking}
                  className="w-full h-16 text-xl md:text-2xl font-black uppercase tracking-[0.15em] text-white flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-[400ms]"
                  style={{ 
                    backgroundColor: '#ff9500',
                    clipPath: 'polygon(0 0, 100% 0, 96% 100%, 4% 100%)',
                  }}
                  whileHover={{
                    scale: 1.05,
                    boxShadow: '0 0 40px rgba(255,149,0,0.5)',
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isLocking ? (
                    <>
                      <HardHatSpinner size="sm" />
                      LOCKING...
                    </>
                  ) : (
                    <>
                      <Lock className="h-6 w-6" />
                      LOCK GFA & CONTINUE
                    </>
                  )}
                </motion.button>
                
                <p className="text-[10px] text-center text-gray-600 font-mono uppercase tracking-wider">
                  Once locked — this becomes your budget foundation
                </p>
              </motion.div>
            ) : (
              /* LOCKED STATE */
              <motion.div
                key="locked"
                initial={{ opacity: 0, scale: 0.8, x: 100 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                className="text-center space-y-6"
              >
                {/* Angular Lock Icon */}
                <motion.div
                  className="relative inline-block"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <div className="h-20 w-20 bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-amber-500/40"
                    style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                  >
                    <Lock className="h-10 w-10 text-white" />
                  </div>
                  
                  <motion.div
                    className="absolute inset-[-8px] border-2 border-amber-500/50"
                    style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                    animate={{ scale: [1, 1.2, 1.4], opacity: [0.6, 0.2, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                </motion.div>
                
                {/* Value */}
                <div className="space-y-1">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-5xl font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent font-mono"
                  >
                    {displayGFA(lockedCitation?.metadata?.gfa_value as number || 0).value}
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-base text-amber-400 font-mono uppercase tracking-widest"
                  >
                    {displayGFA(lockedCitation?.metadata?.gfa_value as number || 0).unit}
                  </motion.p>
                </div>

                {/* Immutability notice */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="text-[11px] text-amber-500/70 max-w-xs mx-auto font-mono"
                >
                  ⚠️ GFA is immutable. To change area, create a new project.
                </motion.p>

                {/* Locked Badge */}
                {lockedCitation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 dark:bg-[#0d1117]/80 backdrop-blur-md border border-green-500/30"
                      style={{ clipPath: 'polygon(2% 0, 98% 0, 100% 100%, 0% 100%)' }}
                    >
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      </motion.div>
                      <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest font-mono">
                        Locked
                      </span>
                    </div>
                    <CitationBadge
                      citation={lockedCitation}
                      onClick={onCitationClick}
                      variant="system"
                    />
                  </motion.div>
                )}
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-xs text-gray-500 flex items-center justify-center gap-2 font-mono uppercase tracking-wider"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  Budget calculator enabled
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Blueprint teaser */}
        {isLocked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="relative z-10 p-3 border-t border-gray-300 dark:border-gray-800/50 bg-gray-100/60 dark:bg-[#0d1117]/60 backdrop-blur-sm"
          >
            <div className="flex items-center justify-center gap-2 text-gray-500 font-mono text-xs uppercase tracking-wider">
              <FileImage className="h-4 w-4" />
              <span>Blueprint Analysis → Stage 3</span>
            </div>
          </motion.div>
        )}
      </div>
    );
  }
);

GFALockStage.displayName = "GFALockStage";

export default GFALockStage;
