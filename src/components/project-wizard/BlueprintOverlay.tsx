// ============================================
// BLUEPRINT OVERLAY COMPONENT
// ============================================
// Interactive SVG overlay with color-coded zones
// Green = Match | Yellow = Log > Photo | Red = High Variance
// Conflict icons deep-link to relevant log entries
// ============================================

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Layers,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useOperationalTruth,
  BlueprintZone,
  ZoneStatus,
} from "@/hooks/useOperationalTruth";

// Status color configs using semantic tokens where possible
const STATUS_CONFIG: Record<ZoneStatus, {
  bg: string;
  border: string;
  text: string;
  icon: React.ElementType;
  label: string;
}> = {
  green: {
    bg: 'bg-emerald-500/20 hover:bg-emerald-500/30',
    border: 'border-emerald-500/60',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle2,
    label: 'Match',
  },
  yellow: {
    bg: 'bg-amber-500/20 hover:bg-amber-500/30',
    border: 'border-amber-500/60',
    text: 'text-amber-600 dark:text-amber-400',
    icon: Eye,
    label: 'Log > Vision',
  },
  red: {
    bg: 'bg-red-500/25 hover:bg-red-500/35',
    border: 'border-red-500/70',
    text: 'text-red-600 dark:text-red-400',
    icon: AlertTriangle,
    label: 'Conflict',
  },
};

interface BlueprintOverlayProps {
  projectId: string;
  blueprintUrl?: string | null;
  className?: string;
  compact?: boolean;
  onConflictClick?: (zone: BlueprintZone) => void;
}

export default function BlueprintOverlay({
  projectId,
  blueprintUrl,
  className,
  compact = false,
  onConflictClick,
}: BlueprintOverlayProps) {
  const {
    zones,
    isLoading,
    isRefreshing,
    conflictCount,
    summaryStats,
    refreshVisionData,
    addZone,
    deleteZone,
  } = useOperationalTruth(projectId);

  const [selectedZone, setSelectedZone] = useState<BlueprintZone | null>(null);
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const handleAddZone = useCallback(async () => {
    if (!newZoneName.trim()) return;
    // Default position: center, 20% size
    await addZone(newZoneName.trim(), { x: 40, y: 40, width: 20, height: 20 }, 'manual');
    setNewZoneName('');
    setIsAddingZone(false);
  }, [newZoneName, addZone]);

  const handleZoneClick = useCallback((zone: BlueprintZone) => {
    if (zone.current_status === 'red' && onConflictClick) {
      onConflictClick(zone);
    }
    setSelectedZone(zone);
    setDetailDialogOpen(true);
  }, [onConflictClick]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
        <span className="ml-2 text-sm text-muted-foreground">Loading overlay…</span>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-xl border border-border bg-card overflow-hidden", className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold">Operational Truth Overlay</span>
          {conflictCount > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0">
              {conflictCount} conflict{conflictCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Summary pills */}
          {!compact && summaryStats.total > 0 && (
            <div className="flex items-center gap-1 mr-2">
              {summaryStats.green > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                  {summaryStats.green} ✓
                </span>
              )}
              {summaryStats.yellow > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium">
                  {summaryStats.yellow} ⚠
                </span>
              )}
              {summaryStats.red > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium">
                  {summaryStats.red} ✕
                </span>
              )}
            </div>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => refreshVisionData()}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Vision Data</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsAddingZone(true)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Blueprint canvas with SVG overlay */}
      <div className="relative aspect-[16/10] bg-muted/20">
        {blueprintUrl ? (
          <img
            src={blueprintUrl}
            alt="Blueprint"
            className="absolute inset-0 w-full h-full object-contain opacity-80"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground/50">
              <Layers className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No blueprint uploaded</p>
              <p className="text-xs mt-1">Zones are displayed as an abstract grid</p>
            </div>
          </div>
        )}

        {/* SVG Zone overlays */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {zones.map((zone) => {
            const config = STATUS_CONFIG[zone.current_status];
            return (
              <g key={zone.id} className="cursor-pointer" onClick={() => handleZoneClick(zone)}>
                <rect
                  x={zone.coordinates.x}
                  y={zone.coordinates.y}
                  width={zone.coordinates.width}
                  height={zone.coordinates.height}
                  rx={0.5}
                  className={cn(
                    "transition-all duration-300",
                    zone.current_status === 'green' && "fill-emerald-500/15 stroke-emerald-500/50",
                    zone.current_status === 'yellow' && "fill-amber-500/20 stroke-amber-500/60",
                    zone.current_status === 'red' && "fill-red-500/25 stroke-red-500/70 animate-pulse",
                  )}
                  strokeWidth={0.3}
                />
                {/* Zone label */}
                <text
                  x={zone.coordinates.x + zone.coordinates.width / 2}
                  y={zone.coordinates.y + zone.coordinates.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-foreground text-[1.8px] font-medium pointer-events-none select-none"
                >
                  {zone.zone_name.length > 12 ? zone.zone_name.slice(0, 12) + '…' : zone.zone_name}
                </text>
                {/* Conflict icon for red zones */}
                {zone.current_status === 'red' && (
                  <text
                    x={zone.coordinates.x + zone.coordinates.width - 1.5}
                    y={zone.coordinates.y + 2}
                    className="fill-red-600 text-[3px] pointer-events-none"
                  >
                    ⚠
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Empty state overlay */}
        {zones.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingZone(true)}
              className="gap-2 border-dashed border-amber-400/50 text-amber-600 dark:text-amber-400"
            >
              <Plus className="h-4 w-4" />
              Add First Zone
            </Button>
          </div>
        )}
      </div>

      {/* Zone list (compact or full) */}
      {zones.length > 0 && (
        <div className={cn("border-t border-border divide-y divide-border", compact ? "max-h-32 overflow-y-auto" : "max-h-48 overflow-y-auto")}>
          {zones.map((zone) => {
            const config = STATUS_CONFIG[zone.current_status];
            const StatusIcon = config.icon;
            return (
              <button
                key={zone.id}
                onClick={() => handleZoneClick(zone)}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/40 transition-colors text-left"
              >
                <StatusIcon className={cn("h-4 w-4 shrink-0", config.text)} />
                <span className="text-sm font-medium truncate flex-1">{zone.zone_name}</span>
                <span className={cn("text-xs font-medium", config.text)}>{config.label}</span>
                {zone.variance_score > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {(zone.variance_score * 100).toFixed(0)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Add Zone Dialog */}
      <Dialog open={isAddingZone} onOpenChange={setIsAddingZone}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Blueprint Zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Zone name (e.g. Kitchen, Master Bedroom)"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddZone()}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              The zone will be placed at the center. You can adjust coordinates after AI analysis.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddingZone(false)}>Cancel</Button>
            <Button onClick={handleAddZone} disabled={!newZoneName.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add Zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedZone && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const config = STATUS_CONFIG[selectedZone.current_status];
                    const Icon = config.icon;
                    return <Icon className={cn("h-5 w-5", config.text)} />;
                  })()}
                  {selectedZone.zone_name}
                  <Badge variant={selectedZone.current_status === 'green' ? 'default' : selectedZone.current_status === 'yellow' ? 'secondary' : 'destructive'} className="ml-auto">
                    {STATUS_CONFIG[selectedZone.current_status].label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Variance Score */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-sm text-muted-foreground">Variance Score</span>
                  <span className={cn("text-lg font-bold", STATUS_CONFIG[selectedZone.current_status].text)}>
                    {(selectedZone.variance_score * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Data Sources */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" /> Data Sources
                  </h4>

                  {/* Log Data */}
                  <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">📋 Log Data (Deliveries)</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedZone.log_data?.items || []).length} items tracked
                    </p>
                  </div>

                  {/* Vision Data */}
                  <div className="p-2.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/30">
                    <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">📷 Vision Data (Photos)</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedZone.vision_data?.items || []).length} items detected
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      Last sync: {selectedZone.last_vision_sync ? new Date(selectedZone.last_vision_sync).toLocaleString() : 'Never'}
                    </p>
                  </div>

                  {/* Report Data */}
                  <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">📊 Report Data (Site Logs)</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedZone.report_data?.items || []).length} reports analyzed
                    </p>
                  </div>
                </div>

                {/* Source badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Source:</span>
                  <Badge variant="outline" className="text-xs capitalize">{selectedZone.source}</Badge>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => { deleteZone(selectedZone.id); setDetailDialogOpen(false); }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { refreshVisionData(selectedZone.id); }}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isRefreshing && "animate-spin")} />
                  Refresh
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
