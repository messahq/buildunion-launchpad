import { useEffect, useState, forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WireframeVisualizerProps {
  workType: string;
}

interface WireframeLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay: number;
}

const WIREFRAME_TEMPLATES: Record<string, WireframeLine[]> = {
  new_construction: [
    // Foundation
    { id: 'f1', x1: 20, y1: 180, x2: 280, y2: 180, delay: 0 },
    { id: 'f2', x1: 20, y1: 180, x2: 20, y2: 170, delay: 0.1 },
    { id: 'f3', x1: 280, y1: 180, x2: 280, y2: 170, delay: 0.1 },
    // Walls
    { id: 'w1', x1: 30, y1: 170, x2: 30, y2: 80, delay: 0.2 },
    { id: 'w2', x1: 270, y1: 170, x2: 270, y2: 80, delay: 0.2 },
    { id: 'w3', x1: 150, y1: 170, x2: 150, y2: 100, delay: 0.3 },
    // Roof
    { id: 'r1', x1: 10, y1: 80, x2: 150, y2: 30, delay: 0.4 },
    { id: 'r2', x1: 150, y1: 30, x2: 290, y2: 80, delay: 0.4 },
    { id: 'r3', x1: 10, y1: 80, x2: 290, y2: 80, delay: 0.5 },
    // Windows
    { id: 'win1', x1: 60, y1: 100, x2: 100, y2: 100, delay: 0.6 },
    { id: 'win2', x1: 60, y1: 140, x2: 100, y2: 140, delay: 0.6 },
    { id: 'win3', x1: 60, y1: 100, x2: 60, y2: 140, delay: 0.6 },
    { id: 'win4', x1: 100, y1: 100, x2: 100, y2: 140, delay: 0.6 },
    // Door
    { id: 'd1', x1: 190, y1: 170, x2: 190, y2: 120, delay: 0.7 },
    { id: 'd2', x1: 230, y1: 170, x2: 230, y2: 120, delay: 0.7 },
    { id: 'd3', x1: 190, y1: 120, x2: 230, y2: 120, delay: 0.7 },
  ],
  renovation: [
    // Existing structure (dashed will be handled in styling)
    { id: 'e1', x1: 40, y1: 160, x2: 260, y2: 160, delay: 0 },
    { id: 'e2', x1: 40, y1: 160, x2: 40, y2: 60, delay: 0.1 },
    { id: 'e3', x1: 260, y1: 160, x2: 260, y2: 60, delay: 0.1 },
    { id: 'e4', x1: 40, y1: 60, x2: 260, y2: 60, delay: 0.2 },
    // Renovation markers
    { id: 'n1', x1: 80, y1: 120, x2: 120, y2: 80, delay: 0.4 },
    { id: 'n2', x1: 120, y1: 120, x2: 80, y2: 80, delay: 0.4 },
    { id: 'n3', x1: 180, y1: 120, x2: 220, y2: 80, delay: 0.5 },
    { id: 'n4', x1: 220, y1: 120, x2: 180, y2: 80, delay: 0.5 },
    // Arrow indicators
    { id: 'a1', x1: 150, y1: 180, x2: 150, y2: 140, delay: 0.6 },
    { id: 'a2', x1: 140, y1: 150, x2: 150, y2: 140, delay: 0.6 },
    { id: 'a3', x1: 160, y1: 150, x2: 150, y2: 140, delay: 0.6 },
  ],
  demolition: [
    // Structure to demolish
    { id: 'd1', x1: 50, y1: 170, x2: 250, y2: 170, delay: 0 },
    { id: 'd2', x1: 50, y1: 170, x2: 50, y2: 70, delay: 0.1 },
    { id: 'd3', x1: 250, y1: 170, x2: 250, y2: 70, delay: 0.1 },
    { id: 'd4', x1: 50, y1: 70, x2: 250, y2: 70, delay: 0.2 },
    // X marks (demolition)
    { id: 'x1', x1: 50, y1: 170, x2: 250, y2: 70, delay: 0.4 },
    { id: 'x2', x1: 250, y1: 170, x2: 50, y2: 70, delay: 0.4 },
    // Debris lines
    { id: 'db1', x1: 100, y1: 180, x2: 90, y2: 195, delay: 0.6 },
    { id: 'db2', x1: 150, y1: 180, x2: 160, y2: 195, delay: 0.7 },
    { id: 'db3', x1: 200, y1: 180, x2: 195, y2: 195, delay: 0.8 },
  ],
  addition: [
    // Existing structure
    { id: 'e1', x1: 30, y1: 160, x2: 150, y2: 160, delay: 0 },
    { id: 'e2', x1: 30, y1: 160, x2: 30, y2: 80, delay: 0.1 },
    { id: 'e3', x1: 150, y1: 160, x2: 150, y2: 80, delay: 0.1 },
    { id: 'e4', x1: 30, y1: 80, x2: 150, y2: 80, delay: 0.2 },
    // Addition (highlighted)
    { id: 'a1', x1: 150, y1: 160, x2: 270, y2: 160, delay: 0.4 },
    { id: 'a2', x1: 270, y1: 160, x2: 270, y2: 80, delay: 0.5 },
    { id: 'a3', x1: 150, y1: 80, x2: 270, y2: 80, delay: 0.6 },
    // Connection point
    { id: 'c1', x1: 150, y1: 90, x2: 150, y2: 150, delay: 0.3 },
    // Plus sign
    { id: 'p1', x1: 200, y1: 120, x2: 230, y2: 120, delay: 0.7 },
    { id: 'p2', x1: 215, y1: 105, x2: 215, y2: 135, delay: 0.7 },
  ],
};

// Default wireframe for other work types
const DEFAULT_WIREFRAME: WireframeLine[] = [
  { id: 'g1', x1: 40, y1: 150, x2: 260, y2: 150, delay: 0 },
  { id: 'g2', x1: 40, y1: 150, x2: 40, y2: 50, delay: 0.1 },
  { id: 'g3', x1: 260, y1: 150, x2: 260, y2: 50, delay: 0.1 },
  { id: 'g4', x1: 40, y1: 50, x2: 260, y2: 50, delay: 0.2 },
  { id: 'g5', x1: 100, y1: 150, x2: 100, y2: 50, delay: 0.3 },
  { id: 'g6', x1: 200, y1: 150, x2: 200, y2: 50, delay: 0.3 },
  { id: 'g7', x1: 40, y1: 100, x2: 260, y2: 100, delay: 0.4 },
  // Tools icon
  { id: 't1', x1: 140, y1: 170, x2: 160, y2: 190, delay: 0.5 },
  { id: 't2', x1: 160, y1: 170, x2: 140, y2: 190, delay: 0.5 },
];

const WireframeVisualizer = forwardRef<HTMLDivElement, WireframeVisualizerProps>(
  ({ workType }, ref) => {
    const [isBuilding, setIsBuilding] = useState(true);
    const lines = WIREFRAME_TEMPLATES[workType] || DEFAULT_WIREFRAME;

    useEffect(() => {
      setIsBuilding(true);
      const maxDelay = Math.max(...lines.map(l => l.delay));
      const timer = setTimeout(() => setIsBuilding(false), (maxDelay + 0.5) * 1000);
      return () => clearTimeout(timer);
    }, [workType, lines]);

    return (
      <div 
        ref={ref}
        className="relative h-64 bg-gradient-to-b from-amber-500/5 via-orange-500/10 to-amber-600/5"
      >
        {/* Grid background with amber tint */}
        <svg className="absolute inset-0 w-full h-full opacity-30">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(35 90% 55%)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Ambient glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-orange-500/5 pointer-events-none" />

        {/* Main wireframe SVG */}
        <svg 
          viewBox="0 0 300 200" 
          className="w-full h-full relative z-10"
          style={{ maxWidth: '100%' }}
        >
          {/* Glow filter for amber effect */}
          <defs>
            <filter id="amber-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

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
              stroke="hsl(35 90% 55%)"
              strokeWidth="2"
              strokeLinecap="round"
              filter="url(#amber-glow)"
              className={cn(
                line.id.startsWith('e') && workType === 'renovation' && "opacity-50"
              )}
            />
          ))}

          {/* Building animation indicator - amber pulsing */}
          {isBuilding && (
            <motion.circle
              cx="150"
              cy="100"
              r="8"
              fill="hsl(35 90% 55%)"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 1 }}
              filter="url(#amber-glow)"
            />
          )}
        </svg>

        {/* Building status with amber theme */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-3 left-3 right-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <motion.div
              className={cn(
                "w-2 h-2 rounded-full",
                isBuilding ? "bg-amber-500" : "bg-amber-600"
              )}
              animate={isBuilding ? { opacity: [1, 0.5, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />
            <span className="text-xs text-amber-700 dark:text-amber-400">
              {isBuilding ? "Generating wireframe..." : "Wireframe ready"}
            </span>
          </div>
          <span className="text-xs font-mono text-amber-600/60 dark:text-amber-400/60">
            {lines.length} elements
          </span>
        </motion.div>
      </div>
    );
  }
);

WireframeVisualizer.displayName = "WireframeVisualizer";

export default WireframeVisualizer;
