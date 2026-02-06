// ============================================
// TRUTH MATRIX - Dual-Engine Verification Table
// Shows Gemini (Visual) and OpenAI (Regulatory) verification status
// ============================================

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Eye,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Brain,
  Zap,
  FileText,
  Ruler,
  Package,
  MapPin,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OperationalTruth } from "@/types/operationalTruth";

// ============================================
// TYPES
// ============================================

export interface EngineVerification {
  verified: boolean;
  status: "verified" | "conflict" | "pending" | "missing";
  value?: string | number | null;
  source?: string;
  timestamp?: string;
}

export interface TruthMatrixPillar {
  id: string;
  name: string;
  icon: typeof Eye;
  gemini: EngineVerification;
  openai: EngineVerification;
  hasConflict: boolean;
  priority: "critical" | "high" | "medium" | "low";
}

export interface TruthMatrixProps {
  operationalTruth?: OperationalTruth | null;
  verifiedFacts?: Record<string, unknown> | null;
  photoEstimate?: {
    area?: number;
    areaUnit?: string;
    materials?: Array<{ item: string; quantity: number; unit: string }>;
    confidence?: string;
  } | null;
  blueprintAnalysis?: {
    analyzed?: boolean;
    totalArea?: number;
  } | null;
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  verificationRate?: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getStatusIcon(status: EngineVerification["status"]) {
  switch (status) {
    case "verified":
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case "conflict":
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    case "pending":
      return <Clock className="w-4 h-4 text-amber-400 animate-pulse" />;
    case "missing":
      return <HelpCircle className="w-4 h-4 text-slate-500" />;
  }
}

function getStatusLabel(status: EngineVerification["status"]): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "conflict":
      return "Conflict";
    case "pending":
      return "Pending";
    case "missing":
      return "Data missing";
  }
}

function getStatusColor(status: EngineVerification["status"]): string {
  switch (status) {
    case "verified":
      return "border-emerald-500/50 bg-emerald-500/10 text-emerald-400";
    case "conflict":
      return "border-red-500/50 bg-red-500/10 text-red-400";
    case "pending":
      return "border-amber-500/50 bg-amber-500/10 text-amber-400";
    case "missing":
      return "border-slate-500/50 bg-slate-500/10 text-slate-400";
  }
}

// ============================================
// BUILD TRUTH MATRIX PILLARS
// ============================================

function buildTruthMatrixPillars(
  operationalTruth?: OperationalTruth | null,
  verifiedFacts?: Record<string, unknown> | null,
  photoEstimate?: TruthMatrixProps["photoEstimate"],
  blueprintAnalysis?: TruthMatrixProps["blueprintAnalysis"],
  tasks?: TruthMatrixProps["tasks"]
): TruthMatrixPillar[] {
  const pillars: TruthMatrixPillar[] = [];

  // 1. Confirmed Area Pillar
  const geminiArea = photoEstimate?.area;
  const blueprintArea = blueprintAnalysis?.totalArea;
  const confirmedArea = operationalTruth?.confirmedArea;
  
  const areaGeminiStatus: EngineVerification = {
    verified: geminiArea !== null && geminiArea !== undefined && geminiArea > 0,
    status: geminiArea && geminiArea > 0 ? "verified" : "missing",
    value: geminiArea || null,
    source: "Photo AI Analysis",
  };
  
  const areaOpenAIStatus: EngineVerification = {
    verified: blueprintArea !== null && blueprintArea !== undefined && blueprintArea > 0,
    status: blueprintArea && blueprintArea > 0 ? "verified" : "missing",
    value: blueprintArea || null,
    source: "Blueprint Analysis",
  };
  
  // Detect conflict if both have values but differ by more than 10%
  const areaConflict = areaGeminiStatus.verified && areaOpenAIStatus.verified &&
    Math.abs((geminiArea || 0) - (blueprintArea || 0)) / Math.max(geminiArea || 1, blueprintArea || 1) > 0.1;
  
  if (areaConflict) {
    areaGeminiStatus.status = "conflict";
    areaOpenAIStatus.status = "conflict";
  }

  pillars.push({
    id: "confirmed_area",
    name: "Confirmed Area",
    icon: Ruler,
    gemini: areaGeminiStatus,
    openai: areaOpenAIStatus,
    hasConflict: areaConflict,
    priority: "critical",
  });

  // 2. Materials Count Pillar
  const materialCount = photoEstimate?.materials?.length || 0;
  const materialsVerified = materialCount > 0;
  
  pillars.push({
    id: "materials",
    name: "Materials",
    icon: Package,
    gemini: {
      verified: materialsVerified,
      status: materialsVerified ? "verified" : "missing",
      value: materialCount || null,
      source: "Visual Material Detection",
    },
    openai: {
      verified: false,
      status: "pending",
      value: null,
      source: "Material Verification",
    },
    hasConflict: false,
    priority: "critical",
  });

  // 3. Blueprint Status Pillar
  const blueprintStatus = operationalTruth?.blueprintStatus;
  const manuallyValidatedBlueprint = verifiedFacts?.manuallyValidatedBlueprint === true;
  
  pillars.push({
    id: "blueprint",
    name: "Blueprint",
    icon: FileText,
    gemini: {
      verified: blueprintStatus === "analyzed" || manuallyValidatedBlueprint,
      status: blueprintStatus === "analyzed" ? "verified" : 
              manuallyValidatedBlueprint ? "verified" : 
              blueprintStatus === "none" ? "missing" : "pending",
      value: blueprintStatus || "none",
      source: manuallyValidatedBlueprint ? "Manual Override" : "Document Analysis",
    },
    openai: {
      verified: blueprintStatus === "analyzed",
      status: blueprintStatus === "analyzed" ? "verified" : "pending",
      value: null,
      source: "Blueprint OCR",
    },
    hasConflict: false,
    priority: "high",
  });

  // 4. OBC Compliance Pillar
  const obcStatus = operationalTruth?.obcCompliance;
  const obcDetails = operationalTruth?.obcDetails;
  const obcAcknowledged = verifiedFacts?.obcAcknowledged === true;
  
  pillars.push({
    id: "obc_compliance",
    name: "OBC Status",
    icon: Shield,
    gemini: {
      verified: false,
      status: "pending",
      value: null,
      source: "Visual Inspection",
    },
    openai: {
      verified: obcStatus === "clear" || obcStatus === "permit_required" || obcAcknowledged,
      status: obcAcknowledged ? "verified" :
              obcStatus === "clear" ? "verified" : 
              obcStatus === "permit_required" ? "verified" : "pending",
      value: obcDetails?.complianceScore || null,
      source: obcAcknowledged ? "Manual Acknowledgment" : "Ontario Building Code API",
    },
    hasConflict: false,
    priority: "critical",
  });

  // 5. Conflict Check Pillar
  const conflictStatus = operationalTruth?.conflictStatus;
  const manuallyIgnoredConflicts = verifiedFacts?.manuallyIgnoredConflicts === true;
  
  // Determine the actual status for display
  const conflictGeminiStatus = manuallyIgnoredConflicts ? "verified" :
    conflictStatus === "aligned" ? "verified" : 
    conflictStatus === "conflict_detected" ? "conflict" : "pending";
  
  const conflictOpenAIStatus = manuallyIgnoredConflicts ? "verified" :
    conflictStatus === "aligned" ? "verified" : 
    conflictStatus === "conflict_detected" ? "conflict" : "pending";
  
  pillars.push({
    id: "conflict_check",
    name: "Conflict Check",
    icon: Zap,
    gemini: {
      verified: conflictStatus === "aligned" || manuallyIgnoredConflicts,
      status: conflictGeminiStatus,
      // Value should be null for pending status - let the status label show instead
      value: conflictGeminiStatus === "pending" ? null : 
             (manuallyIgnoredConflicts ? "Ignored" : conflictStatus),
      source: manuallyIgnoredConflicts ? "Manual Override" : "Site Photo vs Blueprint",
    },
    openai: {
      verified: conflictStatus === "aligned" || manuallyIgnoredConflicts,
      status: conflictOpenAIStatus,
      // Value should be null for pending status - let the status label show instead
      value: conflictOpenAIStatus === "pending" ? null :
             (manuallyIgnoredConflicts ? "Ignored" : null),
      source: manuallyIgnoredConflicts ? "Manual Override" : "Cross-Reference Validation",
    },
    hasConflict: conflictStatus === "conflict_detected" && !manuallyIgnoredConflicts,
    priority: "high",
  });

  // 6. Project Mode Pillar
  const projectMode = operationalTruth?.projectMode || "solo";
  
  pillars.push({
    id: "project_mode",
    name: "Project Mode",
    icon: Eye,
    gemini: {
      verified: true,
      status: "verified",
      value: projectMode,
      source: "Workflow Detection",
    },
    openai: {
      verified: true,
      status: "verified",
      value: projectMode,
      source: "Team Analysis",
    },
    hasConflict: false,
    priority: "medium",
  });

  // 7. Project Size Pillar
  const projectSize = operationalTruth?.projectSize || "medium";
  
  pillars.push({
    id: "project_size",
    name: "Project Size",
    icon: MapPin,
    gemini: {
      verified: true,
      status: "verified",
      value: projectSize,
      source: "Area Calculation",
    },
    openai: {
      verified: true,
      status: "verified",
      value: projectSize,
      source: "Scope Analysis",
    },
    hasConflict: false,
    priority: "medium",
  });

  // 8. Confidence Level Pillar
  const confidenceLevel = operationalTruth?.confidenceLevel || "low";
  const aiConfidence = photoEstimate?.confidence?.toLowerCase();
  
  pillars.push({
    id: "confidence",
    name: "AI Confidence",
    icon: Brain,
    gemini: {
      verified: confidenceLevel !== "low",
      status: confidenceLevel === "high" ? "verified" : 
              confidenceLevel === "medium" ? "verified" : "pending",
      value: aiConfidence || confidenceLevel,
      source: "Gemini Pro Vision",
    },
    openai: {
      verified: confidenceLevel !== "low",
      status: confidenceLevel === "high" ? "verified" : 
              confidenceLevel === "medium" ? "verified" : "pending",
      value: confidenceLevel,
      source: "GPT Analysis",
    },
    hasConflict: false,
    priority: "low",
  });

  return pillars;
}

// ============================================
// TRUTH MATRIX COMPONENT
// ============================================

export default function TruthMatrix({
  operationalTruth,
  verifiedFacts,
  photoEstimate,
  blueprintAnalysis,
  tasks,
  verificationRate = 0,
}: TruthMatrixProps) {
  const [pillars, setPillars] = useState<TruthMatrixPillar[]>([]);

  useEffect(() => {
    const builtPillars = buildTruthMatrixPillars(
      operationalTruth,
      verifiedFacts,
      photoEstimate,
      blueprintAnalysis,
      tasks
    );
    setPillars(builtPillars);
  }, [operationalTruth, verifiedFacts, photoEstimate, blueprintAnalysis, tasks]);

  const conflictCount = pillars.filter(p => p.hasConflict).length;
  const verifiedCount = pillars.filter(p => 
    p.gemini.status === "verified" || p.openai.status === "verified"
  ).length;
  const missingCount = pillars.filter(p => 
    p.gemini.status === "missing" && p.openai.status === "missing"
  ).length;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            TRUTH MATRIX
          </h3>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] uppercase tracking-wider border",
              conflictCount > 0 
                ? "border-red-500/50 text-red-400 bg-red-500/10" 
                : verificationRate >= 100 
                  ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                  : "border-cyan-500/50 text-cyan-400 bg-cyan-500/10"
            )}
          >
            {conflictCount > 0 
              ? `${conflictCount} CONFLICT${conflictCount > 1 ? "S" : ""}` 
              : `${Math.round(verificationRate)}% VERIFIED`}
          </Badge>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            {verifiedCount} verified
          </span>
          {conflictCount > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertTriangle className="w-3 h-3" />
              {conflictCount} conflicts
            </span>
          )}
          {missingCount > 0 && (
            <span className="flex items-center gap-1 text-slate-500">
              <HelpCircle className="w-3 h-3" />
              {missingCount} missing
            </span>
          )}
        </div>

        {/* Truth Matrix Table */}
        <ScrollArea className="h-[280px] rounded-lg border border-slate-700/50 bg-slate-900/50">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/50 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 w-[120px]">
                  Pillar
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3 text-purple-400" />
                    Gemini
                  </div>
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Brain className="w-3 h-3 text-emerald-400" />
                    OpenAI
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pillars.map((pillar, index) => {
                const Icon = pillar.icon;
                return (
                  <motion.tr
                    key={pillar.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "border-slate-700/30",
                      pillar.hasConflict && "bg-red-500/5",
                      !pillar.hasConflict && "hover:bg-slate-800/50"
                    )}
                  >
                    {/* Pillar Name */}
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <Icon className={cn(
                          "w-3.5 h-3.5",
                          pillar.priority === "critical" && "text-red-400",
                          pillar.priority === "high" && "text-amber-400",
                          pillar.priority === "medium" && "text-cyan-400",
                          pillar.priority === "low" && "text-slate-400"
                        )} />
                        <span className={cn(
                          "text-xs font-medium",
                          pillar.hasConflict ? "text-red-300" : "text-slate-300"
                        )}>
                          {pillar.name}
                        </span>
                      </div>
                      {/* Conflict Warning */}
                      {pillar.hasConflict && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-1 text-[9px] text-red-400 font-medium uppercase tracking-wider"
                        >
                          ⚠ CONFLICT DETECTED
                        </motion.div>
                      )}
                    </TableCell>

                    {/* Gemini Status */}
                    <TableCell className="py-2 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center gap-1">
                            {getStatusIcon(pillar.gemini.status)}
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[8px] px-1.5 py-0",
                                getStatusColor(pillar.gemini.status)
                              )}
                            >
                              {pillar.gemini.value !== null && pillar.gemini.value !== undefined
                                ? typeof pillar.gemini.value === 'number' 
                                  ? pillar.gemini.value.toLocaleString()
                                  : String(pillar.gemini.value).slice(0, 12)
                                : getStatusLabel(pillar.gemini.status)}
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          className="bg-slate-800 border-slate-700 text-white max-w-[200px]"
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-purple-400">Gemini (Visual)</p>
                            <p className="text-[10px] text-slate-300">{pillar.gemini.source}</p>
                            {pillar.gemini.value !== null && pillar.gemini.value !== undefined && (
                              <p className="text-[10px] text-white">
                                Value: {String(pillar.gemini.value)}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* OpenAI Status */}
                    <TableCell className="py-2 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center gap-1">
                            {getStatusIcon(pillar.openai.status)}
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[8px] px-1.5 py-0",
                                getStatusColor(pillar.openai.status)
                              )}
                            >
                              {pillar.openai.value !== null && pillar.openai.value !== undefined
                                ? typeof pillar.openai.value === 'number' 
                                  ? pillar.openai.value.toLocaleString()
                                  : String(pillar.openai.value).slice(0, 12)
                                : getStatusLabel(pillar.openai.status)}
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          className="bg-slate-800 border-slate-700 text-white max-w-[200px]"
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-emerald-400">OpenAI (Regulatory)</p>
                            <p className="text-[10px] text-slate-300">{pillar.openai.source}</p>
                            {pillar.openai.value !== null && pillar.openai.value !== undefined && (
                              <p className="text-[10px] text-white">
                                Value: {String(pillar.openai.value)}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-[9px] text-slate-500 pt-1">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-purple-400" />
            Gemini = Visual AI
          </span>
          <span className="flex items-center gap-1">
            <Brain className="w-3 h-3 text-emerald-400" />
            OpenAI = Regulatory
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
