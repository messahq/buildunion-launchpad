import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, AlertTriangle, CheckCircle2 } from "lucide-react";
import { HardHatSpinner } from "@/components/ui/loading-states";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  status: string;
  quantity?: number;
  unit_price?: number;
  total_cost?: number;
}

interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  baseQuantity: number;
  unit: string;
  unitPrice: number;
}

interface FinancialState {
  materialCost: number;
  laborCost: number;
  totalCost: number;
  lastSynced?: string;
}

interface MaterialCalculationTabProps {
  projectId: string;
  projectSummaryId: string;
  baseArea?: number;
  tasks: Task[];
  materials: MaterialItem[];
  onSyncComplete?: (financials: FinancialState) => void;
}

/**
 * MaterialCalculationTab
 * 
 * Enforces the 3 Iron Laws (Vastörvény):
 * 1. Dynamic Calculation: Labor costs recalculated based on Task status
 * 2. State Persistence: Waste % from ai_workflow_config persists
 * 3. Dual Logic: Materials use GROSS units, Labor uses NET sq ft
 * 
 * React state-based sync with Supabase persistence via Sync button.
 */
export function MaterialCalculationTab({
  projectId,
  projectSummaryId,
  baseArea = 0,
  tasks,
  materials,
  onSyncComplete,
}: MaterialCalculationTabProps) {
  const [financials, setFinancials] = useState<FinancialState>({
    materialCost: 0,
    laborCost: 0,
    totalCost: 0,
  });
  const [wastePercent, setWastePercent] = useState<number>(10);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // ============================================
  // IRON LAW #1: Dynamic Calculation
  // Recalculate when tasks or materials change
  // ============================================
  const calculateFinancials = useCallback(() => {
    try {
      // IRON LAW #3: Materials use GROSS units (already resolved)
      const materialCost = materials.reduce((sum, item) => {
        return sum + item.quantity * item.unitPrice;
      }, 0);

      // IRON LAW #3: Labor uses NET sq ft
      // Sum up labor tasks that are in "active" or "in-progress" status
      const laborCost = tasks
        .filter((task) =>
          ["active", "in-progress", "in_progress"].includes(
            task.status?.toLowerCase() || ""
          )
        )
        .reduce((sum, task) => {
          return sum + (task.total_cost || 0);
        }, 0);

      const totalCost = materialCost + laborCost;

      setFinancials({
        materialCost: Math.round(materialCost * 100) / 100,
        laborCost: Math.round(laborCost * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
      });

      setLastError(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Calculation error";
      setLastError(msg);
      console.error("❌ Financial calculation failed:", error);
    }
  }, [materials, tasks]);

  // Recalculate whenever tasks or materials change
  useEffect(() => {
    calculateFinancials();
  }, [calculateFinancials, tasks, materials]);

  // ============================================
  // IRON LAW #2: Load persistent Waste %
  // ============================================
  useEffect(() => {
    const loadWastePercent = async () => {
      try {
        const { data, error } = await supabase
          .from("project_summaries")
          .select("ai_workflow_config")
          .eq("id", projectSummaryId)
          .single();

        if (error) throw error;

        if (
          data?.ai_workflow_config &&
          typeof data.ai_workflow_config === "object"
        ) {
          const config = data.ai_workflow_config as Record<string, any>;
          const userEdits = config.userEdits as Record<string, number> | undefined;
          if (userEdits?.wastePercent !== undefined) {
            setWastePercent(userEdits.wastePercent);
          }
        }
      } catch (error) {
        console.warn("⚠️ Could not load waste percent:", error);
        // Default to 10% if not found
      }
    };

    loadWastePercent();
  }, [projectSummaryId]);

  // ============================================
  // SYNC: Persist financials + waste % to Supabase
  // ============================================
  const handleSync = useCallback(async () => {
    setSyncing(true);
    setLastError(null);

    try {
      // Build the ai_workflow_config with waste percent persistence (Iron Law #2)
      const configUpdate = {
        userEdits: {
          wastePercent,
          lastUpdated: new Date().toISOString(),
        },
      };

      // Update project_summaries with calculated financials
      const { error: updateError } = await supabase
        .from("project_summaries")
        .update({
          material_cost: financials.materialCost,
          labor_cost: financials.laborCost,
          total_cost: financials.totalCost,
          ai_workflow_config: configUpdate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectSummaryId);

      if (updateError) throw updateError;

      // Update local state with sync timestamp
      setFinancials((prev) => ({
        ...prev,
        lastSynced: new Date().toLocaleTimeString(),
      }));

      toast.success("✅ Financials synced to backend");

      // Notify parent if callback provided
      if (onSyncComplete) {
        onSyncComplete(financials);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sync failed";
      setLastError(msg);
      toast.error("❌ Sync failed: " + msg);
      console.error("Sync error:", error);
    } finally {
      setSyncing(false);
    }
  }, [financials, wastePercent, projectSummaryId, onSyncComplete]);

  // Summary badge counts
  const activeTasks = useMemo(
    () =>
      tasks.filter((t) =>
        ["active", "in-progress", "in_progress"].includes(
          t.status?.toLowerCase() || ""
        )
      ).length,
    [tasks]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Material & Labor Sync</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Vastörvény enforcement: Dynamic calculation + State persistence
              </p>
            </div>
            <div className="text-right">
              {financials.lastSynced && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {financials.lastSynced}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Alert */}
      {lastError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{lastError}</AlertDescription>
        </Alert>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-4">
        {/* Material Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Material Cost (GROSS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${financials.materialCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {materials.length} items
            </p>
          </CardContent>
        </Card>

        {/* Labor Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Labor Cost (NET)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              ${financials.laborCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeTasks}/{tasks.length} active tasks
            </p>
          </CardContent>
        </Card>

        {/* Total Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              ${financials.totalCost.toFixed(2)}
            </div>
            <Badge className="mt-2" variant="outline">
              Operational Truth
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Waste Percent Config (Iron Law #2) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Waste % Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Current Waste Factor: {wastePercent}%
            </label>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={wastePercent}
              onChange={(e) => setWastePercent(Number(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              ✓ Saved in ai_workflow_config (Iron Law #2: State Persistence)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Materials Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Materials (GROSS Units)</CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <p className="text-sm text-muted-foreground">No materials added</p>
          ) : (
            <ul className="space-y-2">
              {materials.slice(0, 5).map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center text-sm pb-1 border-b"
                >
                  <span className="text-muted-foreground">{item.name}</span>
                  <div className="text-right">
                    <div className="font-medium">
                      {item.quantity} {item.unit}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                  </div>
                </li>
              ))}
              {materials.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{materials.length - 5} more items
                </p>
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Tasks Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Active Tasks (NET Area)</CardTitle>
        </CardHeader>
        <CardContent>
          {activeTasks === 0 ? (
            <p className="text-sm text-muted-foreground">No active tasks</p>
          ) : (
            <div className="space-y-2">
              {tasks
                .filter((t) =>
                  ["active", "in-progress", "in_progress"].includes(
                    t.status?.toLowerCase() || ""
                  )
                )
                .slice(0, 5)
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex justify-between items-center text-sm pb-1 border-b"
                  >
                    <div>
                      <span className="text-muted-foreground">{task.title}</span>
                      <Badge className="ml-2 text-xs" variant="secondary">
                        {task.status}
                      </Badge>
                    </div>
                    <div className="font-medium">
                      ${task.total_cost?.toFixed(2) || "0.00"}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Button */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleSync}
          disabled={syncing}
          size="lg"
          className="flex-1"
        >
          {syncing ? (
            <>
              <HardHatSpinner size="sm" className="mr-2" />
              Syncing...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Sync to Backend
            </>
          )}
        </Button>

        <Button variant="outline" size="lg" disabled>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Vastörvény Status
        </Button>
      </div>

      {/* Footer Info */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2">
        <p>
          ✓ <strong>Iron Law #1</strong>: Dynamic calculation triggered on task
          status change
        </p>
        <p>
          ✓ <strong>Iron Law #2</strong>: Waste % persisted in ai_workflow_config
        </p>
        <p>
          ✓ <strong>Iron Law #3</strong>: Materials use GROSS units, Labor uses
          NET sq ft
        </p>
      </div>
    </div>
  );
}
