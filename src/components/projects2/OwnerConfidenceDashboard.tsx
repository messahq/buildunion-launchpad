 import { useState, useMemo, useEffect } from "react";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Slider } from "@/components/ui/slider";
 import {
   Mic,
   CheckCircle,
   FileText,
   ChevronRight,
   Shield,
   TrendingUp,
   AlertTriangle,
   Clock,
   DollarSign,
   Eye,
   Sparkles,
   Activity
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { format } from "date-fns";
 import { motion, AnimatePresence } from "framer-motion";
 
 // ============================================
 // TYPES
 // ============================================
 
 interface OwnerDashboardProps {
   projectId: string;
   projectName: string;
   projectAddress?: string;
   healthScore: number;
   verificationRate: number;
   milestones: Milestone[];
   financials: FinancialSummary;
   blueprintUrl?: string | null;
   latestPhotoUrl?: string | null;
   expectedCompletion?: string | null;
   completionCertainty?: number;
   currentPhase?: string;
   onGenerateReport?: () => void;
   onApprove?: () => void;
   onExportPdf?: () => void;
   onViewDetails?: () => void;
 }
 
 interface Milestone {
   id: string;
   name: string;
   status: "completed" | "current" | "upcoming";
   date?: string;
 }
 
 interface FinancialSummary {
   approvedBudget: number;
   currentSpend: number;
   isWithinRange: boolean;
   hasUnexpectedCosts: boolean;
   costStability: "stable" | "warning" | "critical";
 }
 
 // ============================================
 // HEALTH STATUS COMPONENT
 // ============================================
 
 function HealthStatus({ score, verificationRate }: { score: number; verificationRate: number }) {
   const getHealthConfig = (score: number) => {
     if (score >= 80) return { 
       label: "EXCELLENT", 
       color: "text-emerald-400", 
       bgGlow: "shadow-emerald-500/20",
       message: "Everything is running according to your plan.\nNo action required.",
       icon: Shield
     };
     if (score >= 60) return { 
       label: "GOOD", 
       color: "text-cyan-400", 
       bgGlow: "shadow-cyan-500/20",
       message: "Project progressing well.\nMinor items being addressed.",
       icon: TrendingUp
     };
     if (score >= 40) return { 
       label: "ATTENTION", 
       color: "text-amber-400", 
       bgGlow: "shadow-amber-500/20",
       message: "Some items need your review.\nTeam is working on solutions.",
       icon: AlertTriangle
     };
     return { 
       label: "NEEDS REVIEW", 
       color: "text-red-400", 
       bgGlow: "shadow-red-500/20",
       message: "Please review project status.\nAction may be required.",
       icon: AlertTriangle
     };
   };
 
   const config = getHealthConfig(score);
   const Icon = config.icon;
 
 return (
   <div className="space-y-6">
     <div className="flex items-center gap-3">
       <span className="text-xs uppercase tracking-widest text-muted-foreground/80">
         PROJECT HEALTH:
       </span>
       <span className={cn("text-lg font-bold tracking-wide", config.color)}>
         {config.label}
       </span>
     </div>
     
     {/* Continuous EKG Animation */}
     <div className="relative h-12 flex items-center overflow-hidden">
       <svg className="w-full h-12" viewBox="0 0 400 48" preserveAspectRatio="none">
         {/* Background grid */}
         <line x1="0" y1="24" x2="400" y2="24" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="1" />
         
         {/* EKG Path - Continuous infinite animation */}
         <motion.path
           d="M0,24 L30,24 L40,24 L50,10 L55,38 L60,18 L65,28 L70,24 L100,24 L110,24 L120,8 L125,40 L130,16 L135,30 L140,24 L170,24 L180,24 L190,6 L195,42 L200,14 L205,32 L210,24 L240,24 L250,24 L260,10 L265,38 L270,18 L275,28 L280,24 L310,24 L320,24 L330,8 L335,40 L340,16 L345,30 L350,24 L400,24"
           fill="none"
           stroke="url(#ekgGradient)"
           strokeWidth="2.5"
           strokeLinecap="round"
           initial={{ pathLength: 0, pathOffset: 0 }}
           animate={{ 
             pathLength: [0, 1, 1],
             pathOffset: [0, 0, 1]
           }}
           transition={{ 
             duration: 4,
             repeat: Infinity,
             ease: "linear",
             times: [0, 0.5, 1]
           }}
         />
         
         {/* Glowing moving dot */}
         <motion.circle
           r="4"
           fill="#34d399"
           filter="url(#glow)"
           animate={{ 
             cx: [0, 200, 400],
             cy: [24, 24, 24],
             opacity: [0, 1, 0]
           }}
           transition={{
             duration: 4,
             repeat: Infinity,
             ease: "linear"
           }}
         />
         
         <defs>
           <linearGradient id="ekgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stopColor="transparent" />
             <stop offset="20%" stopColor="#10b981" />
             <stop offset="50%" stopColor="#6ee7b7" />
             <stop offset="80%" stopColor="#10b981" />
             <stop offset="100%" stopColor="transparent" />
           </linearGradient>
           <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
             <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
             <feMerge>
               <feMergeNode in="coloredBlur"/>
               <feMergeNode in="SourceGraphic"/>
             </feMerge>
           </filter>
         </defs>
       </svg>
     </div>
     
     <p className="text-sm text-muted-foreground/90 whitespace-pre-line leading-relaxed">
       {config.message}
     </p>
   </div>
 );
 }
 
 // ============================================
 // TIMELINE ORBIT COMPONENT
 // ============================================
 
 function TimelineOrbit({ 
   milestones, 
   currentPhase, 
   expectedCompletion,
   completionCertainty 
 }: { 
   milestones: Milestone[];
   currentPhase?: string;
   expectedCompletion?: string | null;
   completionCertainty?: number;
 }) {
   const currentIndex = milestones.findIndex(m => m.status === "current");
 
 return (
   <div className="space-y-4">
     <h3 className="text-xs uppercase tracking-widest text-muted-foreground/80">
       TIMELINE ORBIT
     </h3>
     
     {/* Milestone Track */}
     <div className="relative py-6">
       {/* Track Line */}
       <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-muted/20 -translate-y-1/2" />
       <motion.div 
         className="absolute top-1/2 left-0 h-[2px] bg-gradient-to-r from-emerald-500 to-cyan-500 -translate-y-1/2"
         initial={{ width: 0 }}
         animate={{ width: `${((currentIndex + 1) / milestones.length) * 100}%` }}
         transition={{ duration: 1.5, ease: "easeOut" }}
       />
       
       {/* Milestone Dots with breathing glow */}
       <div className="relative flex justify-between">
         {milestones.map((milestone, index) => (
           <div key={milestone.id} className="flex flex-col items-center gap-2">
             <motion.div
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ delay: index * 0.15 }}
               className={cn(
                 "w-4 h-4 rounded-full border-2 relative",
                 milestone.status === "completed" && "bg-emerald-500 border-emerald-500",
                 milestone.status === "current" && "bg-cyan-400 border-cyan-400 scale-125",
                 milestone.status === "upcoming" && "bg-transparent border-muted-foreground/40"
               )}
             >
               {/* Breathing glow for current */}
               {milestone.status === "current" && (
                 <motion.div
                   className="absolute inset-0 rounded-full bg-cyan-400"
                   animate={{
                     scale: [1, 2, 1],
                     opacity: [0.6, 0, 0.6]
                   }}
                   transition={{
                     duration: 2,
                     repeat: Infinity,
                     ease: "easeInOut"
                   }}
                 />
               )}
               {/* Subtle glow for completed */}
               {milestone.status === "completed" && (
                 <motion.div
                   className="absolute inset-0 rounded-full bg-emerald-400"
                   animate={{
                     scale: [1, 1.5, 1],
                     opacity: [0.3, 0, 0.3]
                   }}
                   transition={{
                     duration: 3,
                     repeat: Infinity,
                     ease: "easeInOut",
                     delay: index * 0.2
                   }}
                 />
               )}
             </motion.div>
           </div>
         ))}
       </div>
     </div>
     
     {/* Current Phase Label */}
     <div className="space-y-1">
       <p className={cn(
         "text-sm font-medium tracking-wide",
         "text-cyan-400"
       )}>
         {currentPhase || "IN PROGRESS"}
       </p>
       {expectedCompletion && (
         <p className="text-xs text-muted-foreground">
           EXPECTED COMPLETION: <span className="text-foreground font-medium">{expectedCompletion}</span>
         </p>
       )}
       {completionCertainty && (
         <p className="text-xs text-muted-foreground/70">
           {completionCertainty}% certainty based on real-time progress.
         </p>
       )}
     </div>
   </div>
 );
 }
 
 // ============================================
 // LIVE LENS COMPONENT (Blueprint vs Photo Slider)
 // ============================================
 
 function LiveLens({ 
   blueprintUrl, 
   photoUrl 
 }: { 
   blueprintUrl?: string | null;
   photoUrl?: string | null;
 }) {
   const [sliderValue, setSliderValue] = useState([50]);
 
   // Placeholder images if none provided
   const blueprint = blueprintUrl || "/placeholder.svg";
   const photo = photoUrl || "/placeholder.svg";
 
   return (
     <div className="space-y-3">
       <h3 className="text-xs uppercase tracking-widest text-muted-foreground/80">
         LIVE LENS
       </h3>
       
       {/* Comparison Container */}
       <div className="relative aspect-[16/10] rounded-lg overflow-hidden border border-white/10 bg-black/40">
         {/* Blueprint Layer (Left) */}
         <div 
           className="absolute inset-0 bg-cover bg-center grayscale opacity-80"
           style={{ 
             backgroundImage: `url(${blueprint})`,
             clipPath: `inset(0 ${100 - sliderValue[0]}% 0 0)` 
           }}
         />
         
         {/* Photo Layer (Right) */}
         <div 
           className="absolute inset-0 bg-cover bg-center"
           style={{ 
             backgroundImage: `url(${photo})`,
             clipPath: `inset(0 0 0 ${sliderValue[0]}%)` 
           }}
         />
         
         {/* Divider Line */}
         <div 
           className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-cyan-400 via-emerald-400 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
           style={{ left: `${sliderValue[0]}%` }}
         />
         
         {/* Labels */}
         <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-[10px] uppercase tracking-wider text-muted-foreground">
           Blueprint
         </div>
         <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-[10px] uppercase tracking-wider text-muted-foreground">
           Current
         </div>
       </div>
       
       {/* Slider */}
       <div className="space-y-2">
         <p className="text-center text-xs text-muted-foreground/80">Compare</p>
         <Slider
           value={sliderValue}
           onValueChange={setSliderValue}
           max={100}
           step={1}
           className="[&_[role=slider]]:bg-cyan-400 [&_[role=slider]]:border-cyan-400 [&_[role=slider]]:shadow-[0_0_8px_rgba(34,211,238,0.5)]"
         />
       </div>
     </div>
   );
 }
 
 // ============================================
 // FINANCIAL SAFE COMPONENT
 // ============================================
 
 // Animated Counter Component
 function AnimatedCounter({ 
   value, 
   duration = 2000
 }: { 
   value: number; 
   duration?: number;
 }) {
   const [displayValue, setDisplayValue] = useState(0);
 
   useEffect(() => {
     let startTime: number;
     let animationFrame: number;
 
     const animate = (currentTime: number) => {
       if (!startTime) startTime = currentTime;
       const elapsed = currentTime - startTime;
       const progress = Math.min(elapsed / duration, 1);
       
       // Easing function for smooth deceleration
       const easeOutQuart = 1 - Math.pow(1 - progress, 4);
       setDisplayValue(Math.floor(value * easeOutQuart));
 
       if (progress < 1) {
         animationFrame = requestAnimationFrame(animate);
       }
     };
 
     animationFrame = requestAnimationFrame(animate);
     return () => cancelAnimationFrame(animationFrame);
   }, [value, duration]);
 
   const formattedValue = new Intl.NumberFormat("en-CA", {
     style: "currency",
     currency: "CAD",
     minimumFractionDigits: 0,
     maximumFractionDigits: 0,
   }).format(displayValue);
 
   return <span>{formattedValue}</span>;
 }
 
 function FinancialSafe({ financials }: { financials: FinancialSummary }) {
   const spendPercentage = (financials.currentSpend / financials.approvedBudget) * 100;
 
   return (
     <div className="space-y-4">
       <h3 className="text-xs uppercase tracking-widest text-muted-foreground/80">
         FINANCIAL SAFE
       </h3>
       
       <div className="space-y-4">
         <div className="flex justify-between items-baseline">
           <span className="text-xs text-muted-foreground">APPROVED BUDGET:</span>
           <span className="text-xl font-bold text-foreground tabular-nums">
             <AnimatedCounter value={financials.approvedBudget} duration={2000} />
           </span>
         </div>
         
         <div className="flex justify-between items-baseline">
           <span className="text-xs text-muted-foreground">CURRENT SPEND:</span>
           <span className="text-lg font-medium text-muted-foreground tabular-nums">
             <AnimatedCounter value={financials.currentSpend} duration={2500} />
           </span>
         </div>
         
         {/* Progress Bar */}
         <div className="relative h-3 bg-muted/20 rounded-full overflow-hidden">
           {/* Background shimmer */}
           <motion.div
             className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
             animate={{ x: ["-100%", "200%"] }}
             transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
           />
           <motion.div
             initial={{ width: 0 }}
             animate={{ width: `${Math.min(spendPercentage, 100)}%` }}
             transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
             className={cn(
               "h-full rounded-full",
               spendPercentage <= 70 && "bg-gradient-to-r from-emerald-500 to-emerald-400",
               spendPercentage > 70 && spendPercentage <= 90 && "bg-gradient-to-r from-amber-500 to-amber-400",
               spendPercentage > 90 && "bg-gradient-to-r from-red-500 to-red-400"
             )}
           />
         </div>
         
         {/* Status Indicators */}
         <div className="space-y-2 pt-2">
           <div className="flex items-center gap-2">
             <div className={cn(
               "w-2 h-2 rounded-full",
               financials.isWithinRange ? "bg-emerald-400" : "bg-red-400"
             )} />
             <span className={cn(
               "text-xs uppercase tracking-wide",
               financials.isWithinRange ? "text-emerald-400" : "text-red-400"
             )}>
               COST STABILITY: {financials.isWithinRange ? "WITHIN RANGE" : "OVER BUDGET"}
             </span>
           </div>
           
           <p className={cn(
             "text-xs",
             financials.hasUnexpectedCosts ? "text-amber-400" : "text-emerald-400/80"
           )}>
             {financials.hasUnexpectedCosts 
               ? "⚠️ Some unexpected costs detected" 
               : "No unexpected costs detected"}
           </p>
         </div>
       </div>
     </div>
   );
 }
 
 // ============================================
 // MAIN OWNER CONFIDENCE DASHBOARD
 // ============================================
 
 export default function OwnerConfidenceDashboard({
   projectId,
   projectName,
   projectAddress,
   healthScore,
   verificationRate,
   milestones,
   financials,
   blueprintUrl,
   latestPhotoUrl,
   expectedCompletion,
   completionCertainty,
   currentPhase,
   onGenerateReport,
   onApprove,
   onExportPdf,
   onViewDetails
 }: OwnerDashboardProps) {
   const [isExpanded, setIsExpanded] = useState(false);
 
   return (
     <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
       {/* Background Effects */}
       <div className="fixed inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-cyan-500/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-emerald-500/5 rounded-full blur-[120px]" />
       </div>
       
       {/* Header */}
       <motion.div
         initial={{ opacity: 0, y: -20 }}
         animate={{ opacity: 1, y: 0 }}
         className="relative text-center mb-8"
       >
         <h1 className="text-3xl md:text-4xl font-light tracking-wide text-foreground">
           Confidence Dashboard
         </h1>
         <p className="text-sm text-muted-foreground/70 mt-2">
           {projectName} {projectAddress && `• ${projectAddress}`}
         </p>
       </motion.div>
       
       {/* Main Glassmorphism Card */}
       <motion.div
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         transition={{ delay: 0.2 }}
         className={cn(
           "relative mx-auto max-w-5xl",
           "bg-white/[0.03] backdrop-blur-xl",
           "border border-white/10 rounded-2xl",
           "shadow-2xl shadow-black/20",
           "overflow-hidden"
         )}
       >
         {/* Top Glow Line */}
         <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
         
         {/* Content */}
         <div className="p-6 md:p-8 space-y-8">
           {/* Header Row */}
           <div className="flex items-start justify-between">
             <HealthStatus score={healthScore} verificationRate={verificationRate} />
             <div className="text-right">
               <span className="text-xs uppercase tracking-widest text-cyan-400/80">BUILDUNION</span>
             </div>
           </div>
           
           {/* Three Column Layout */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
             {/* Timeline Orbit */}
             <TimelineOrbit
               milestones={milestones}
               currentPhase={currentPhase}
               expectedCompletion={expectedCompletion}
               completionCertainty={completionCertainty}
             />
             
             {/* Live Lens */}
             <LiveLens
               blueprintUrl={blueprintUrl}
               photoUrl={latestPhotoUrl}
             />
             
             {/* Financial Safe */}
             <FinancialSafe financials={financials} />
           </div>
           
           {/* Action Buttons */}
           <div className="flex flex-wrap justify-center gap-4 pt-4">
             <Button
               onClick={onGenerateReport}
               className={cn(
                 "relative overflow-hidden",
                 "bg-gradient-to-r from-emerald-600 to-emerald-500",
                 "hover:from-emerald-500 hover:to-emerald-400",
                 "text-white font-medium px-6 py-5",
                 "shadow-lg shadow-emerald-500/20",
                 "border-0"
               )}
             >
               <Mic className="w-4 h-4 mr-2" />
               Magic Summary
             </Button>
             
             <Button
               onClick={onApprove}
               className={cn(
                 "relative overflow-hidden",
                 "bg-gradient-to-r from-cyan-600 to-cyan-500",
                 "hover:from-cyan-500 hover:to-cyan-400",
                 "text-white font-medium px-6 py-5",
                 "shadow-lg shadow-cyan-500/20",
                 "border-0"
               )}
             >
               <CheckCircle className="w-4 h-4 mr-2" />
               One-Tap Approval
             </Button>
             
             <Button
               onClick={onExportPdf}
               variant="outline"
               className={cn(
                 "relative overflow-hidden",
                 "bg-slate-800/50 border-slate-600/50",
                 "hover:bg-slate-700/50 hover:border-slate-500/50",
                 "text-foreground font-medium px-6 py-5"
               )}
             >
               <FileText className="w-4 h-4 mr-2" />
               Export Executive PDF
             </Button>
           </div>
         </div>
         
         {/* Bottom Glow Line */}
         <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
       </motion.div>
       
       {/* Expand to Details Button */}
       {onViewDetails && (
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.5 }}
           className="flex justify-center mt-8"
         >
           <Button
             onClick={onViewDetails}
             variant="ghost"
             className="text-muted-foreground hover:text-foreground group"
           >
             <Eye className="w-4 h-4 mr-2" />
             Deep Dive: View Full Details
             <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
           </Button>
         </motion.div>
       )}
       
       {/* Decorative Sparkle */}
       <div className="fixed bottom-8 right-8 text-muted-foreground/20">
         <Sparkles className="w-6 h-6" />
       </div>
     </div>
   );
 }