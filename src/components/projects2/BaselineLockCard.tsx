import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Lock,
  Unlock,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  History,
  Edit3,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { OperationalTruth } from "@/types/operationalTruth";

interface BaselineVersion {
  id: string;
  version_number: number;
  snapshot: OperationalTruth;
  change_reason: string;
  changed_by: string;
  changed_at: string;
}

interface BaselineLockCardProps {
  projectId: string;
  summaryId: string;
  operationalTruth: OperationalTruth;
  currentBaseline: {
    snapshot: OperationalTruth | null;
    lockedAt: string | null;
    lockedBy: string | null;
  };
  isOwner: boolean;
  onBaselineLocked: (baseline: OperationalTruth, lockedAt: string) => void;
}

const BaselineLockCard = ({
  projectId,
  summaryId,
  operationalTruth,
  currentBaseline,
  isOwner,
  onBaselineLocked,
}: BaselineLockCardProps) => {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [locking, setLocking] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [versions, setVersions] = useState<BaselineVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  
  // Editable values
  const [editedArea, setEditedArea] = useState<number | null>(operationalTruth.confirmedArea);
  const [editMode, setEditMode] = useState(false);

  const isLocked = !!currentBaseline.lockedAt;
  const baselineData = currentBaseline.snapshot;

  // Fetch version history
  useEffect(() => {
    const fetchVersions = async () => {
      if (!historyOpen) return;
      setLoadingVersions(true);
      try {
        const { data, error } = await supabase
          .from("baseline_versions")
          .select("*")
          .eq("project_id", projectId)
          .order("version_number", { ascending: false })
          .limit(10);

        if (error) throw error;
        setVersions((data as unknown as BaselineVersion[]) || []);
      } catch (err) {
        console.error("Error fetching versions:", err);
      } finally {
        setLoadingVersions(false);
      }
    };

    fetchVersions();
  }, [historyOpen, projectId]);

  const handleLockBaseline = async () => {
    setLocking(true);
    try {
      const now = new Date().toISOString();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      const snapshotToSave = editMode ? {
        ...operationalTruth,
        confirmedArea: editedArea,
      } : operationalTruth;

      // First, create a baseline version entry
      const nextVersionNumber = versions.length > 0 ? (versions[0]?.version_number || 0) + 1 : 1;
      
      const { error: versionError } = await supabase
        .from("baseline_versions")
        .insert({
          project_id: projectId,
          summary_id: summaryId,
          version_number: nextVersionNumber,
          snapshot: JSON.parse(JSON.stringify(snapshotToSave)),
          change_reason: changeReason || t("baseline.initialLock", "Initial baseline lock"),
          changed_by: userId,
        });

      if (versionError) throw versionError;

      // Update the summary with the baseline
      const { error } = await supabase
        .from("project_summaries")
        .update({
          baseline_snapshot: JSON.parse(JSON.stringify(snapshotToSave)),
          baseline_locked_at: now,
          baseline_locked_by: userId || null,
        })
        .eq("id", summaryId);

      if (error) throw error;

      toast.success(t("baseline.locked", "Baseline locked successfully"));
      onBaselineLocked(snapshotToSave, now);
      setDialogOpen(false);
      setChangeReason("");
      setEditMode(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to lock baseline");
    } finally {
      setLocking(false);
    }
  };

  const handleUnlockAndModify = async () => {
    if (!changeReason.trim()) {
      toast.error(t("baseline.reasonRequired", "Please provide a reason for the change"));
      return;
    }

    setUnlocking(true);
    try {
      const now = new Date().toISOString();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const modifiedSnapshot = {
        ...operationalTruth,
        confirmedArea: editedArea,
      };

      // Create a new version
      const nextVersionNumber = versions.length > 0 ? (versions[0]?.version_number || 0) + 1 : 1;
      
      const { error: versionError } = await supabase
        .from("baseline_versions")
        .insert({
          project_id: projectId,
          summary_id: summaryId,
          version_number: nextVersionNumber,
          snapshot: JSON.parse(JSON.stringify(modifiedSnapshot)),
          change_reason: changeReason,
          changed_by: userId,
          previous_version_id: versions[0]?.id || null,
        });

      if (versionError) throw versionError;

      // Update the summary
      const { error } = await supabase
        .from("project_summaries")
        .update({
          baseline_snapshot: JSON.parse(JSON.stringify(modifiedSnapshot)),
          baseline_locked_at: now,
          baseline_locked_by: userId || null,
        })
        .eq("id", summaryId);

      if (error) throw error;

      toast.success(t("baseline.versionCreated", "New baseline version created"));
      onBaselineLocked(modifiedSnapshot, now);
      setUnlockDialogOpen(false);
      setChangeReason("");
      setEditMode(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create new version");
    } finally {
      setUnlocking(false);
    }
  };

  // Calculate differences between baseline and current
  const getDifferences = () => {
    if (!baselineData) return [];
    const diffs: { pillar: string; baseline: string; current: string; changed: boolean }[] = [];

    // Area
    const baseArea = baselineData.confirmedArea?.toString() || "N/A";
    const currArea = operationalTruth.confirmedArea?.toString() || "N/A";
    diffs.push({
      pillar: t("pillars.area", "Confirmed Area"),
      baseline: `${baseArea} ${baselineData.areaUnit}`,
      current: `${currArea} ${operationalTruth.areaUnit}`,
      changed: baseArea !== currArea,
    });

    // Materials
    diffs.push({
      pillar: t("pillars.materials", "Materials"),
      baseline: `${baselineData.materialsCount} items`,
      current: `${operationalTruth.materialsCount} items`,
      changed: baselineData.materialsCount !== operationalTruth.materialsCount,
    });

    // Blueprint
    diffs.push({
      pillar: t("pillars.blueprint", "Blueprint"),
      baseline: baselineData.blueprintStatus,
      current: operationalTruth.blueprintStatus,
      changed: baselineData.blueprintStatus !== operationalTruth.blueprintStatus,
    });

    // OBC
    diffs.push({
      pillar: t("pillars.obc", "OBC Compliance"),
      baseline: baselineData.obcCompliance,
      current: operationalTruth.obcCompliance,
      changed: baselineData.obcCompliance !== operationalTruth.obcCompliance,
    });

    // Conflicts
    diffs.push({
      pillar: t("pillars.conflicts", "Conflict Status"),
      baseline: baselineData.conflictStatus,
      current: operationalTruth.conflictStatus,
      changed: baselineData.conflictStatus !== operationalTruth.conflictStatus,
    });

    // Mode
    diffs.push({
      pillar: t("pillars.mode", "Project Mode"),
      baseline: baselineData.projectMode,
      current: operationalTruth.projectMode,
      changed: baselineData.projectMode !== operationalTruth.projectMode,
    });

    // Size
    diffs.push({
      pillar: t("pillars.size", "Project Size"),
      baseline: baselineData.projectSize,
      current: operationalTruth.projectSize,
      changed: baselineData.projectSize !== operationalTruth.projectSize,
    });

    // Confidence
    diffs.push({
      pillar: t("pillars.confidence", "Confidence"),
      baseline: baselineData.confidenceLevel,
      current: operationalTruth.confidenceLevel,
      changed: baselineData.confidenceLevel !== operationalTruth.confidenceLevel,
    });

    return diffs;
  };

  const differences = getDifferences();
  const changedCount = differences.filter((d) => d.changed).length;

  return (
    <Card
      className={cn(
        "border transition-colors",
        isLocked
          ? "border-green-500/50 bg-green-50/30 dark:bg-green-950/20"
          : "border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield
              className={cn(
                "h-5 w-5",
                isLocked ? "text-green-600" : "text-amber-600"
              )}
            />
            <span>{t("baseline.title", "Project Baseline")}</span>
            {versions.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                v{versions[0]?.version_number || 1}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLocked ? (
              <Badge
                variant="outline"
                className="border-green-500 text-green-700 bg-green-100/50 dark:bg-green-900/30"
              >
                <Lock className="h-3 w-3 mr-1" />
                {t("baseline.locked", "Locked")}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-500 text-amber-700 bg-amber-100/50 dark:bg-amber-900/30"
              >
                <Unlock className="h-3 w-3 mr-1" />
                {t("baseline.unlocked", "Unlocked")}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLocked ? (
          <>
            {/* Locked info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {t("baseline.lockedOn", "Locked on")}{" "}
                  {format(new Date(currentBaseline.lockedAt!), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              
              {/* Version History Toggle */}
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                    <History className="h-3 w-3" />
                    {t("baseline.history", "History")}
                    {historyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  {loadingVersions ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : versions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {t("baseline.noHistory", "No version history")}
                    </p>
                  ) : (
                    <ScrollArea className="h-[150px]">
                      <div className="space-y-2">
                        {versions.map((v, i) => (
                          <div
                            key={v.id}
                            className={cn(
                              "p-2 rounded-md text-xs border",
                              i === 0 ? "bg-green-50/50 border-green-200 dark:bg-green-950/30 dark:border-green-800" : "bg-muted/30"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className="text-[10px]">
                                v{v.version_number}
                              </Badge>
                              <span className="text-muted-foreground">
                                {format(new Date(v.changed_at), "MMM d, yyyy")}
                              </span>
                            </div>
                            <p className="text-muted-foreground line-clamp-2">
                              {v.change_reason}
                            </p>
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              Area: {v.snapshot.confirmedArea || "N/A"} {v.snapshot.areaUnit}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Baseline vs Current comparison */}
            {changedCount > 0 && (
              <div className="p-3 rounded-lg bg-amber-100/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {changedCount} {t("baseline.changesDetected", "changes since baseline")}
                  </span>
                </div>
                <div className="space-y-1">
                  {differences
                    .filter((d) => d.changed)
                    .slice(0, 3)
                    .map((d, i) => (
                      <div key={i} className="text-xs text-amber-700 dark:text-amber-400">
                        <span className="font-medium">{d.pillar}:</span>{" "}
                        <span className="line-through opacity-60">{d.baseline}</span> →{" "}
                        <span>{d.current}</span>
                      </div>
                    ))}
                  {changedCount > 3 && (
                    <div className="text-xs text-amber-600">
                      +{changedCount - 3} more changes...
                    </div>
                  )}
                </div>
              </div>
            )}

            {changedCount === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{t("baseline.noChanges", "No changes from baseline")}</span>
              </div>
            )}

            {/* Action Buttons */}
            {isOwner && (
              <div className="flex gap-2">
                {/* Unlock & Modify Dialog */}
                <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                      <Edit3 className="h-4 w-4" />
                      {t("baseline.unlockModify", "Unlock & Modify")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Edit3 className="h-5 w-5 text-amber-600" />
                        {t("baseline.modifyTitle", "Modify Baseline")}
                      </DialogTitle>
                      <DialogDescription>
                        {t(
                          "baseline.modifyDesc",
                          "Changes will create a new baseline version. Previous versions are preserved in the audit log."
                        )}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      {/* Editable Area */}
                      <div className="space-y-2">
                        <Label htmlFor="area">{t("baseline.confirmedArea", "Confirmed Area")}</Label>
                        <div className="flex gap-2">
                          <Input
                            id="area"
                            type="number"
                            value={editedArea || ""}
                            onChange={(e) => setEditedArea(parseFloat(e.target.value) || null)}
                            placeholder="e.g. 1302"
                          />
                          <span className="flex items-center text-sm text-muted-foreground px-2">
                            {operationalTruth.areaUnit}
                          </span>
                        </div>
                        {baselineData && (
                          <p className="text-xs text-muted-foreground">
                            {t("baseline.previous", "Previous")}: {baselineData.confirmedArea || "N/A"} {baselineData.areaUnit}
                          </p>
                        )}
                      </div>

                      {/* Change Reason (Required) */}
                      <div className="space-y-2">
                        <Label htmlFor="reason" className="flex items-center gap-1">
                          {t("baseline.changeReason", "Reason for Change")}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="reason"
                          value={changeReason}
                          onChange={(e) => setChangeReason(e.target.value)}
                          placeholder={t("baseline.reasonPlaceholder", "e.g. Site re-measurement revealed larger area")}
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("baseline.reasonNote", "This will be recorded in the Decision Log for audit purposes.")}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setUnlockDialogOpen(false);
                          setChangeReason("");
                        }}
                        disabled={unlocking}
                      >
                        {t("common.cancel", "Cancel")}
                      </Button>
                      <Button
                        onClick={handleUnlockAndModify}
                        disabled={unlocking || !changeReason.trim()}
                        className="bg-amber-600 hover:bg-amber-700 gap-2"
                      >
                        {unlocking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {t("baseline.saveNewVersion", "Save New Version")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* View Full Comparison Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      {t("baseline.viewComparison", "View Details")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-600" />
                        {t("baseline.comparisonTitle", "Baseline vs Current State")}
                      </DialogTitle>
                      <DialogDescription>
                        {t(
                          "baseline.comparisonDesc",
                          "Compare the locked baseline values with the current operational truth"
                        )}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {differences.map((d, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            d.changed
                              ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                              : "bg-muted/30 border-border"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {d.changed ? (
                              <AlertCircle className="h-4 w-4 text-amber-600" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                            <span className="font-medium text-sm">{d.pillar}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded",
                                d.changed
                                  ? "bg-muted line-through opacity-60"
                                  : "bg-green-100 dark:bg-green-900/50"
                              )}
                            >
                              {d.baseline}
                            </span>
                            {d.changed && (
                              <>
                                <span className="text-muted-foreground">→</span>
                                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 font-medium">
                                  {d.current}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Not locked - show lock button */}
            <p className="text-sm text-muted-foreground">
              {t(
                "baseline.lockDescription",
                "Lock the current 8 pillars as a baseline before work begins. This allows tracking changes throughout the project."
              )}
            </p>

            {/* Preview of current values */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/50 text-center">
                <div className="text-muted-foreground">Area</div>
                <div className="font-medium">
                  {operationalTruth.confirmedArea || "N/A"}
                </div>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <div className="text-muted-foreground">Materials</div>
                <div className="font-medium">{operationalTruth.materialsCount}</div>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <div className="text-muted-foreground">Mode</div>
                <div className="font-medium capitalize">{operationalTruth.projectMode}</div>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <div className="text-muted-foreground">Confidence</div>
                <div className="font-medium capitalize">{operationalTruth.confidenceLevel}</div>
              </div>
            </div>

            {isOwner && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full gap-2 bg-amber-600 hover:bg-amber-700">
                    <Lock className="h-4 w-4" />
                    {t("baseline.lockButton", "Lock Baseline")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-amber-600" />
                      {t("baseline.confirmTitle", "Lock Project Baseline?")}
                    </DialogTitle>
                    <DialogDescription>
                      {t(
                        "baseline.confirmDesc",
                        "This will save the current state of all 8 operational truth pillars. You can track changes against this baseline as the project progresses."
                      )}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="py-4 space-y-4">
                    {/* Optional: Edit before locking */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="editMode"
                        checked={editMode}
                        onChange={(e) => setEditMode(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="editMode" className="text-sm cursor-pointer">
                        {t("baseline.adjustBeforeLock", "Adjust values before locking")}
                      </Label>
                    </div>

                    {editMode && (
                      <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                        <Label htmlFor="editArea">{t("baseline.confirmedArea", "Confirmed Area")}</Label>
                        <div className="flex gap-2">
                          <Input
                            id="editArea"
                            type="number"
                            value={editedArea || ""}
                            onChange={(e) => setEditedArea(parseFloat(e.target.value) || null)}
                            placeholder="e.g. 1302"
                          />
                          <span className="flex items-center text-sm text-muted-foreground px-2">
                            {operationalTruth.areaUnit}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Optional Reason */}
                    <div className="space-y-2">
                      <Label htmlFor="initialReason">{t("baseline.optionalNote", "Note (optional)")}</Label>
                      <Textarea
                        id="initialReason"
                        value={changeReason}
                        onChange={(e) => setChangeReason(e.target.value)}
                        placeholder={t("baseline.initialNotePlaceholder", "e.g. Initial baseline based on AI analysis")}
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between p-2 bg-muted/50 rounded">
                        <span className="text-muted-foreground">Area:</span>
                        <span className="font-medium">
                          {editMode ? (editedArea || "N/A") : (operationalTruth.confirmedArea || "N/A")} {operationalTruth.areaUnit}
                        </span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted/50 rounded">
                        <span className="text-muted-foreground">Materials:</span>
                        <span className="font-medium">{operationalTruth.materialsCount} items</span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted/50 rounded">
                        <span className="text-muted-foreground">Mode:</span>
                        <span className="font-medium capitalize">{operationalTruth.projectMode}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted/50 rounded">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className="font-medium capitalize">{operationalTruth.confidenceLevel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      disabled={locking}
                    >
                      {t("common.cancel", "Cancel")}
                    </Button>
                    <Button
                      onClick={handleLockBaseline}
                      disabled={locking}
                      className="bg-amber-600 hover:bg-amber-700 gap-2"
                    >
                      {locking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      {t("baseline.confirmLock", "Lock Baseline")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BaselineLockCard;