import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { HardHat, Wrench, Hammer, Ruler } from "lucide-react";

const TOOLS = [
  { Icon: HardHat, delay: 0, x: -120, rotate: -15 },
  { Icon: Wrench, delay: 0.15, x: -40, rotate: 12 },
  { Icon: Hammer, delay: 0.3, x: 40, rotate: -8 },
  { Icon: Ruler, delay: 0.45, x: 120, rotate: 20 },
];

const ConstructionDivider = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className="relative bg-background py-12 overflow-hidden">
      {/* Animated beam line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-1/2 left-0 right-0 h-[2px] origin-left"
        style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(var(--accent)) 20%, hsl(var(--accent)) 80%, transparent 100%)",
        }}
      />

      {/* Glowing center node */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.5, type: "spring", damping: 12 }}
        className="relative mx-auto w-14 h-14 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center z-10"
      >
        <motion.div
          animate={isInView ? { rotate: 360 } : {}}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-dashed border-accent/60"
        />
        <div className="absolute w-3 h-3 rounded-full bg-accent" />
      </motion.div>

      {/* Floating tool icons */}
      <div className="absolute inset-0 flex items-center justify-center">
        {TOOLS.map(({ Icon, delay, x, rotate }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30, x, rotate: rotate + 40 }}
            animate={
              isInView
                ? { opacity: 0.5, y: [0, -8, 0], x, rotate }
                : {}
            }
            transition={{
              opacity: { duration: 0.5, delay: 0.8 + delay },
              y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: delay * 2 },
              rotate: { duration: 0.6, delay: 0.8 + delay },
              x: { duration: 0.6, delay: 0.8 + delay },
            }}
            className="absolute text-accent/40"
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ConstructionDivider;
