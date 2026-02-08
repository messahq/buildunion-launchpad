import { useEffect, useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface WireframeVisualizerProps {
  workType?: string;
  gfaValue?: number;
  onGfaLocked?: boolean; // Trigger scan animation when GFA is locked
}

interface WireframeLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay: number;
  isAddition?: boolean; // For complex buildings (GFA > 8000)
}

// Base wireframe for simple buildings (GFA <= 8000)
const SIMPLE_BUILDING: WireframeLine[] = [
  // Foundation
  { id: 'f1', x1: 50, y1: 180, x2: 250, y2: 180, delay: 0 },
  { id: 'f2', x1: 50, y1: 180, x2: 50, y2: 170, delay: 0.1 },
  { id: 'f3', x1: 250, y1: 180, x2: 250, y2: 170, delay: 0.1 },
  // Walls
  { id: 'w1', x1: 60, y1: 170, x2: 60, y2: 80, delay: 0.2 },
  { id: 'w2', x1: 240, y1: 170, x2: 240, y2: 80, delay: 0.2 },
  // Roof
  { id: 'r1', x1: 40, y1: 80, x2: 150, y2: 40, delay: 0.3 },
  { id: 'r2', x1: 150, y1: 40, x2: 260, y2: 80, delay: 0.3 },
  { id: 'r3', x1: 40, y1: 80, x2: 260, y2: 80, delay: 0.35 },
  // Window
  { id: 'win1', x1: 100, y1: 110, x2: 130, y2: 110, delay: 0.4 },
  { id: 'win2', x1: 100, y1: 140, x2: 130, y2: 140, delay: 0.4 },
  { id: 'win3', x1: 100, y1: 110, x2: 100, y2: 140, delay: 0.4 },
  { id: 'win4', x1: 130, y1: 110, x2: 130, y2: 140, delay: 0.4 },
  // Door
  { id: 'd1', x1: 170, y1: 170, x2: 170, y2: 130, delay: 0.45 },
  { id: 'd2', x1: 200, y1: 170, x2: 200, y2: 130, delay: 0.45 },
  { id: 'd3', x1: 170, y1: 130, x2: 200, y2: 130, delay: 0.45 },
];

// Complex building additions (GFA > 8000)
const COMPLEX_ADDITIONS: WireframeLine[] = [
  // Second floor
  { id: 'sf1', x1: 60, y1: 80, x2: 60, y2: 50, delay: 0.5, isAddition: true },
  { id: 'sf2', x1: 240, y1: 80, x2: 240, y2: 50, delay: 0.5, isAddition: true },
  // Upper roof
  { id: 'ur1', x1: 45, y1: 50, x2: 150, y2: 20, delay: 0.6, isAddition: true },
  { id: 'ur2', x1: 150, y1: 20, x2: 255, y2: 50, delay: 0.6, isAddition: true },
  // Left wing
  { id: 'lw1', x1: 10, y1: 180, x2: 50, y2: 180, delay: 0.7, isAddition: true },
  { id: 'lw2', x1: 10, y1: 180, x2: 10, y2: 100, delay: 0.75, isAddition: true },
  { id: 'lw3', x1: 10, y1: 100, x2: 50, y2: 100, delay: 0.8, isAddition: true },
  // Right wing
  { id: 'rw1', x1: 250, y1: 180, x2: 290, y2: 180, delay: 0.7, isAddition: true },
  { id: 'rw2', x1: 290, y1: 180, x2: 290, y2: 100, delay: 0.75, isAddition: true },
  { id: 'rw3', x1: 250, y1: 100, x2: 290, y2: 100, delay: 0.8, isAddition: true },
  // Extra windows
  { id: 'ew1', x1: 25, y1: 130, x2: 35, y2: 130, delay: 0.85, isAddition: true },
  { id: 'ew2', x1: 25, y1: 150, x2: 35, y2: 150, delay: 0.85, isAddition: true },
  { id: 'ew3', x1: 265, y1: 130, x2: 275, y2: 130, delay: 0.85, isAddition: true },
  { id: 'ew4', x1: 265, y1: 150, x2: 275, y2: 150, delay: 0.85, isAddition: true },
];

// Work type specific templates
const WIREFRAME_TEMPLATES: Record<string, WireframeLine[]> = {
  new_construction: SIMPLE_BUILDING,
  foundation: [
    // Ground level baseline
    { id: 'g1', x1: 20, y1: 190, x2: 280, y2: 190, delay: 0 },
    // Excavation outline
    { id: 'ex1', x1: 30, y1: 190, x2: 30, y2: 160, delay: 0.1 },
    { id: 'ex2', x1: 270, y1: 190, x2: 270, y2: 160, delay: 0.1 },
    { id: 'ex3', x1: 30, y1: 160, x2: 270, y2: 160, delay: 0.2 },
    // Footing
    { id: 'ft1', x1: 40, y1: 180, x2: 260, y2: 180, delay: 0.3 },
    { id: 'ft2', x1: 40, y1: 170, x2: 260, y2: 170, delay: 0.3 },
    { id: 'ft3', x1: 40, y1: 180, x2: 40, y2: 170, delay: 0.4 },
    { id: 'ft4', x1: 260, y1: 180, x2: 260, y2: 170, delay: 0.4 },
    // Foundation walls
    { id: 'fw1', x1: 50, y1: 170, x2: 50, y2: 80, delay: 0.5 },
    { id: 'fw2', x1: 250, y1: 170, x2: 250, y2: 80, delay: 0.5 },
    // Top cap
    { id: 'cap1', x1: 50, y1: 80, x2: 250, y2: 80, delay: 0.6 },
  ],
  renovation: [
    { id: 'e1', x1: 40, y1: 160, x2: 260, y2: 160, delay: 0 },
    { id: 'e2', x1: 40, y1: 160, x2: 40, y2: 60, delay: 0.1 },
    { id: 'e3', x1: 260, y1: 160, x2: 260, y2: 60, delay: 0.1 },
    { id: 'e4', x1: 40, y1: 60, x2: 260, y2: 60, delay: 0.2 },
    // X markers for renovation
    { id: 'n1', x1: 80, y1: 120, x2: 120, y2: 80, delay: 0.4 },
    { id: 'n2', x1: 120, y1: 120, x2: 80, y2: 80, delay: 0.4 },
    { id: 'n3', x1: 180, y1: 120, x2: 220, y2: 80, delay: 0.5 },
    { id: 'n4', x1: 220, y1: 120, x2: 180, y2: 80, delay: 0.5 },
  ],
  demolition: [
    { id: 'd1', x1: 50, y1: 170, x2: 250, y2: 170, delay: 0 },
    { id: 'd2', x1: 50, y1: 170, x2: 50, y2: 70, delay: 0.1 },
    { id: 'd3', x1: 250, y1: 170, x2: 250, y2: 70, delay: 0.1 },
    { id: 'd4', x1: 50, y1: 70, x2: 250, y2: 70, delay: 0.2 },
    // Big X
    { id: 'x1', x1: 50, y1: 170, x2: 250, y2: 70, delay: 0.4 },
    { id: 'x2', x1: 250, y1: 170, x2: 50, y2: 70, delay: 0.4 },
  ],
};

// Empty amber grid for when no work type is selected
const EMPTY_GRID: WireframeLine[] = [];

const WireframeVisualizer = forwardRef<HTMLDivElement, WireframeVisualizerProps>(
  ({ workType, gfaValue, onGfaLocked }, ref) => {
    const [isBuilding, setIsBuilding] = useState(false);
    const [showScanEffect, setShowScanEffect] = useState(false);
    const [animationKey, setAnimationKey] = useState(0);

    // Determine if complex building based on GFA
    const isComplexBuilding = gfaValue && gfaValue > 8000;
    
    // Get base lines from template or use simple building if workType not found
    const hasWorkType = workType && workType !== '';
    const baseLines = hasWorkType 
      ? (WIREFRAME_TEMPLATES[workType] || SIMPLE_BUILDING)
      : EMPTY_GRID;
    
    // Add complex additions if GFA > 8000
    const lines = hasWorkType 
      ? (isComplexBuilding ? [...baseLines, ...COMPLEX_ADDITIONS] : baseLines)
      : EMPTY_GRID;

    // Trigger animation when workType or GFA changes
    useEffect(() => {
      if (hasWorkType) {
        setIsBuilding(true);
        setAnimationKey(prev => prev + 1);
        const maxDelay = lines.length > 0 ? Math.max(...lines.map(l => l.delay)) : 0;
        const timer = setTimeout(() => setIsBuilding(false), (maxDelay + 0.5) * 1000);
        return () => clearTimeout(timer);
      }
    }, [workType, gfaValue, hasWorkType]);

    // GFA Lock scan effect
    useEffect(() => {
      if (onGfaLocked) {
        setShowScanEffect(true);
        const timer = setTimeout(() => setShowScanEffect(false), 1500);
        return () => clearTimeout(timer);
      }
    }, [onGfaLocked]);

    return (
      <div 
        ref={ref}
        className="relative h-64 bg-gradient-to-b from-amber-500/5 via-orange-500/10 to-amber-600/5"
      >
        {/* Grid background with amber tint */}
        <svg className="absolute inset-0 w-full h-full opacity-30">
          <defs>
            <pattern id="wireframe-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(35 90% 55%)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wireframe-grid)" />
        </svg>

        {/* Ambient glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-orange-500/5 pointer-events-none" />

        {/* GFA Lock Scan Effect */}
        <AnimatePresence>
          {showScanEffect && (
            <motion.div
              initial={{ top: 0, opacity: 0.8 }}
              animate={{ top: '100%', opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="absolute left-0 right-0 h-1 z-30"
            >
              <div className="h-full bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_20px_10px_rgba(245,158,11,0.4)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* GFA Lock Pulse Effect */}
        <AnimatePresence>
          {showScanEffect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: [0, 0.3, 0], scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0 border-4 border-amber-500 rounded-lg z-20 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Main wireframe SVG */}
        <svg 
          key={animationKey}
          viewBox="0 0 300 200" 
          className="w-full h-full relative z-10"
          style={{ maxWidth: '100%' }}
        >
          {/* Glow filter for amber effect */}
          <defs>
            <filter id="amber-glow-wireframe" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="addition-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Empty state message */}
          {!hasWorkType && (
            <text 
              x="150" 
              y="100" 
              textAnchor="middle" 
              className="fill-amber-500/50 text-xs"
              style={{ fontSize: '12px' }}
            >
              Select work type to generate wireframe
            </text>
          )}

          {/* Animated lines */}
          {lines.map((line) => (
            <motion.line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x1}
              y2={line.y1}
              animate={{
                x2: line.x2,
                y2: line.y2,
              }}
              transition={{
                duration: 0.5,
                delay: line.delay,
                ease: "easeOut",
              }}
              stroke={line.isAddition ? "hsl(25 95% 55%)" : "hsl(35 90% 55%)"}
              strokeWidth={line.isAddition ? 2.5 : 2}
              strokeLinecap="round"
              filter={line.isAddition ? "url(#addition-glow)" : "url(#amber-glow-wireframe)"}
              className={cn(
                line.id.startsWith('e') && workType === 'renovation' && "opacity-50"
              )}
            />
          ))}

          {/* Building animation indicator */}
          {isBuilding && hasWorkType && (
            <motion.circle
              cx="150"
              cy="100"
              r="8"
              fill="hsl(35 90% 55%)"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 1 }}
              filter="url(#amber-glow-wireframe)"
            />
          )}
        </svg>

        {/* Building status with amber theme */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-3 left-3 right-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <motion.div
              className={cn(
                "w-2 h-2 rounded-full",
                !hasWorkType ? "bg-amber-300" : isBuilding ? "bg-amber-500" : "bg-amber-600"
              )}
              animate={isBuilding ? { opacity: [1, 0.5, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />
            <span className="text-xs text-amber-700 dark:text-amber-400">
              {!hasWorkType 
                ? "Awaiting work type..." 
                : isBuilding 
                  ? "Generating wireframe..." 
                  : "Wireframe ready"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {gfaValue && (
              <span className="text-xs font-mono text-amber-600/80 dark:text-amber-400/80 bg-amber-100/50 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                {gfaValue.toLocaleString()} sqft
              </span>
            )}
            {hasWorkType && (
              <span className="text-xs font-mono text-amber-600/60 dark:text-amber-400/60">
                {lines.length} elements
              </span>
            )}
          </div>
        </motion.div>

        {/* Complex building indicator */}
        {isComplexBuilding && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-3 right-3 px-2 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-semibold shadow-lg"
          >
            Complex Build
          </motion.div>
        )}
      </div>
    );
  }
);

WireframeVisualizer.displayName = "WireframeVisualizer";

export default WireframeVisualizer;
