// ============================================
// BLUEPRINT OVERLAY COMPONENT
// ============================================
// Interactive SVG overlay with color-coded zones
// Green = Match | Yellow = Log > Photo | Red = High Variance
// Conflict icons deep-link to relevant log entries
// ============================================

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
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
  Pencil,
  MessageSquare,
  ArrowUpDown,
  Package,
  Camera,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  getZoneComparisonItems,
  ZoneDataItem,
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

const MATCH_CONFIG = {
  match: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', label: '✓ Match' },
  over: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', label: '▲ Over' },
  under: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', label: '▼ Under' },
  missing: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', label: '✕ Missing' },
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
  const [resolvedBlueprintUrl, setResolvedBlueprintUrl] = useState<string | null>(null);

  // Resolve blueprint URL: try prop first, then fetch from project_documents
  useEffect(() => {
    const resolve = async () => {
      if (blueprintUrl && blueprintUrl.startsWith('http')) {
        setResolvedBlueprintUrl(blueprintUrl);
        return;
      }

      try {
        const { data: docs } = await supabase
          .from('project_documents')
          .select('file_path, file_name, mime_type')
          .eq('project_id', projectId)
          .or('mime_type.ilike.image/%,file_name.ilike.%.pdf')
          .order('uploaded_at', { ascending: false });

        const blueprintDoc = docs?.find(d =>
          d.file_name?.toLowerCase().includes('blueprint') ||
          d.file_name?.toLowerCase().includes('floor') ||
          d.file_name?.toLowerCase().includes('plan')
        ) || docs?.[0];

        if (blueprintDoc?.file_path) {
          const { data: signedData } = await supabase.storage
            .from('project-documents')
            .createSignedUrl(blueprintDoc.file_path, 3600);

          if (signedData?.signedUrl) {
            setResolvedBlueprintUrl(signedData.signedUrl);
            return;
          }
        }

        if (blueprintUrl) {
          const { data: signedData } = await supabase.storage
            .from('project-documents')
            .createSignedUrl(blueprintUrl, 3600);
          if (signedData?.signedUrl) {
            setResolvedBlueprintUrl(signedData.signedUrl);
          }
        }
      } catch (err) {
        console.error('[BlueprintOverlay] Failed to resolve blueprint URL:', err);
      }
    };
    resolve();
  }, [projectId, blueprintUrl]);

  const {
    zones,
    isLoading,
    isRefreshing,
    conflictCount,
    summaryStats,
    refreshVisionData,
    addZone,
    deleteZone,
    renameZone,
    updateZoneNotes,
  } = useOperationalTruth(projectId);

  const [selectedZone, setSelectedZone] = useState<BlueprintZone | null>(null);
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [notesValue, setNotesValue] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const handleAddZone = useCallback(async () => {
    if (!newZoneName.trim()) return;
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
    setIsRenaming(false);
    setShowNotes(false);
    setNotesValue(zone.metadata?.notes || '');
  }, [onConflictClick]);

  const handleRename = useCallback(async () => {
    if (!selectedZone || !renameValue.trim()) return;
    await renameZone(selectedZone.id, renameValue.trim());
    setSelectedZone(prev => prev ? { ...prev, zone_name: renameValue.trim() } : null);
    setIsRenaming(false);
  }, [selectedZone, renameValue, renameZone]);

  const handleSaveNotes = useCallback(async () => {
    if (!selectedZone) return;
    await updateZoneNotes(selectedZone.id, notesValue);
    setSelectedZone(prev => prev ? { ...prev, metadata: { ...prev.metadata, notes: notesValue } } : null);
    setShowNotes(false);
  }, [selectedZone, notesValue, updateZoneNotes]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
        <span className="ml-2 text-sm text-muted-foreground">Loading overlay…</span>
      </div>
    );
  }

  // Get comparison items for selected zone
  const comparisonItems = selectedZone ? getZoneComparisonItems(selectedZone) : [];

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
              <TooltipContent>Sync All Zones with Deliveries & Reports</TooltipContent>
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
        {resolvedBlueprintUrl ? (
          <img
            src={resolvedBlueprintUrl}
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
            const itemCount = (zone.log_data?.items || []).length;
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
                  y={zone.coordinates.y + zone.coordinates.height / 2 - 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-foreground text-[1.8px] font-medium pointer-events-none select-none"
                >
                  {zone.zone_name.length > 12 ? zone.zone_name.slice(0, 12) + '…' : zone.zone_name}
                </text>
                {/* Item count below name */}
                {itemCount > 0 && (
                  <text
                    x={zone.coordinates.x + zone.coordinates.width / 2}
                    y={zone.coordinates.y + zone.coordinates.height / 2 + 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-muted-foreground text-[1.3px] pointer-events-none select-none"
                  >
                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                  </text>
                )}
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
                {/* Notes indicator */}
                {zone.metadata?.notes && (
                  <text
                    x={zone.coordinates.x + 1.5}
                    y={zone.coordinates.y + 2}
                    className="fill-blue-500 text-[2.5px] pointer-events-none"
                  >
                    💬
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
            const itemCount = (zone.log_data?.items || []).length;
            return (
              <button
                key={zone.id}
                onClick={() => handleZoneClick(zone)}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/40 transition-colors text-left"
              >
                <StatusIcon className={cn("h-4 w-4 shrink-0", config.text)} />
                <span className="text-sm font-medium truncate flex-1">{zone.zone_name}</span>
                {itemCount > 0 && (
                  <span className="text-xs text-muted-foreground">{itemCount} items</span>
                )}
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
              The zone will appear on the overlay grid. Use Sync to populate it with delivery & report data.
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

      {/* Zone Detail Dialog — Item-level comparison */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedZone && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const config = STATUS_CONFIG[selectedZone.current_status];
                    const Icon = config.icon;
                    return <Icon className={cn("h-5 w-5", config.text)} />;
                  })()}

                  {isRenaming ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRename}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsRenaming(false)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1">{selectedZone.zone_name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setRenameValue(selectedZone.zone_name); setIsRenaming(true); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </>
                  )}

                  <Badge variant={selectedZone.current_status === 'green' ? 'default' : selectedZone.current_status === 'yellow' ? 'secondary' : 'destructive'} className="ml-auto shrink-0">
                    {STATUS_CONFIG[selectedZone.current_status].label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Variance Score Bar */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Variance Score</span>
                    <span className={cn("text-lg font-bold", STATUS_CONFIG[selectedZone.current_status].text)}>
                      {(selectedZone.variance_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        selectedZone.current_status === 'green' && "bg-emerald-500",
                        selectedZone.current_status === 'yellow' && "bg-amber-500",
                        selectedZone.current_status === 'red' && "bg-red-500",
                      )}
                      style={{ width: `${Math.min(100, selectedZone.variance_score * 100 * 3)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    0-10% = Green (Match) · 10-35% = Yellow (Excess) · 35%+ = Red (Conflict)
                  </p>
                </div>

                {/* Item-by-item Comparison Table */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Material Comparison
                    <span className="text-xs text-muted-foreground font-normal">({comparisonItems.length} items)</span>
                  </h4>

                  {comparisonItems.length > 0 ? (
                    <div className="rounded-lg border border-border overflow-hidden">
                      {/* Table header */}
                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-1 px-3 py-1.5 bg-muted/50 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        <span>Material</span>
                        <span className="w-14 text-center">📋 Log</span>
                        <span className="w-14 text-center">📷 Vision</span>
                        <span className="w-14 text-center">📊 Report</span>
                        <span className="w-16 text-center">Status</span>
                      </div>
                      {/* Rows */}
                      {comparisonItems.map((item, i) => {
                        const matchCfg = MATCH_CONFIG[item.match];
                        return (
                          <div
                            key={i}
                            className={cn(
                              "grid grid-cols-[1fr_auto_auto_auto_auto] gap-1 px-3 py-1.5 text-xs border-t border-border/50",
                              matchCfg.bg,
                            )}
                          >
                            <span className="font-medium truncate capitalize">{item.name}</span>
                            <span className="w-14 text-center font-mono">{item.logQty || '—'}</span>
                            <span className="w-14 text-center font-mono">{item.visionQty || '—'}</span>
                            <span className="w-14 text-center font-mono">{item.reportQty || '—'}</span>
                            <span className={cn("w-16 text-center font-medium text-[10px]", matchCfg.text)}>
                              {matchCfg.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center p-4 rounded-lg border border-dashed border-border text-muted-foreground text-sm">
                      <Package className="h-6 w-6 mx-auto mb-1 opacity-40" />
                      <p>No data yet. Press <strong>Sync</strong> to pull delivery & report data.</p>
                    </div>
                  )}
                </div>

                {/* Data Source Summary */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/30 dark:border-blue-800/20 text-center">
                    <Package className="h-3.5 w-3.5 mx-auto mb-0.5 text-blue-600 dark:text-blue-400" />
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-300">{(selectedZone.log_data?.items || []).length}</p>
                    <p className="text-[9px] text-muted-foreground">Deliveries</p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/30 dark:border-purple-800/20 text-center">
                    <Camera className="h-3.5 w-3.5 mx-auto mb-0.5 text-purple-600 dark:text-purple-400" />
                    <p className="text-xs font-bold text-purple-700 dark:text-purple-300">{(selectedZone.vision_data?.items || []).length}</p>
                    <p className="text-[9px] text-muted-foreground">Vision Detections</p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/30 dark:border-amber-800/20 text-center">
                    <FileText className="h-3.5 w-3.5 mx-auto mb-0.5 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300">{(selectedZone.report_data?.items || []).length}</p>
                    <p className="text-[9px] text-muted-foreground">Site Reports</p>
                  </div>
                </div>

                {/* Notes Section */}
                {showNotes ? (
                  <div className="space-y-2">
                    <Textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Add field notes for this zone (e.g. 'Drywall delayed, waiting for inspection')"
                      className="text-sm min-h-[60px]"
                    />
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setShowNotes(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleSaveNotes}>Save Notes</Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNotes(true)}
                    className="w-full text-left p-2.5 rounded-lg border border-dashed border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      {selectedZone.metadata?.notes ? (
                        <p className="text-xs text-foreground">{selectedZone.metadata.notes}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Add field notes…</p>
                      )}
                    </div>
                  </button>
                )}

                {/* Metadata line */}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>Source: <Badge variant="outline" className="text-[9px] capitalize h-4 px-1">{selectedZone.source}</Badge></span>
                  <span>Last sync: {selectedZone.last_vision_sync ? new Date(selectedZone.last_vision_sync).toLocaleString() : 'Never'}</span>
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
                  Sync Zone
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
