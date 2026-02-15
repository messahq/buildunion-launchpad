import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  TruckIcon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { MaterialDeliveryLog } from "./MaterialDeliveryLog";

interface MaterialRow {
  material_name: string;
  unit: string;
  expected_quantity: number;
  delivered_total: number;
  remaining: number;
  coverage: number; // 0-100
  status: 'pending' | 'partial' | 'complete' | 'over';
  deliveries: {
    id: string;
    delivered_quantity: number;
    logged_at: string;
    notes: string | null;
    photo_url: string | null;
  }[];
}

interface MaterialTrackerProps {
  projectId: string;
  userId: string;
  userRole: string;
  expectedMaterials?: { name: string; qty: number; unit: string }[];
  className?: string;
}

export function MaterialTracker({
  projectId,
  userId,
  userRole,
  expectedMaterials = [],
  className,
}: MaterialTrackerProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);

  const canLog = ['owner', 'foreman', 'worker', 'subcontractor'].includes(userRole);

  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("material_deliveries")
      .select("*")
      .eq("project_id", projectId)
      .order("logged_at", { ascending: false });

    if (error) {
      console.error("Failed to load deliveries:", error);
      setLoading(false);
      return;
    }

    const deliveries = data || [];

    // Build rows from expected materials
    const materialRows: MaterialRow[] = expectedMaterials.map((mat) => {
      const matDeliveries = deliveries.filter(
        (d: any) => d.material_name === mat.name
      );
      const deliveredTotal = matDeliveries.reduce(
        (sum: number, d: any) => sum + Number(d.delivered_quantity || 0),
        0
      );
      const remaining = Math.max(0, mat.qty - deliveredTotal);
      const coverage = mat.qty > 0 ? Math.min(100, (deliveredTotal / mat.qty) * 100) : 0;

      let status: MaterialRow['status'] = 'pending';
      if (deliveredTotal >= mat.qty) status = deliveredTotal > mat.qty ? 'over' : 'complete';
      else if (deliveredTotal > 0) status = 'partial';

      return {
        material_name: mat.name,
        unit: mat.unit,
        expected_quantity: mat.qty,
        delivered_total: deliveredTotal,
        remaining,
        coverage,
        status,
        deliveries: matDeliveries.map((d: any) => ({
          id: d.id,
          delivered_quantity: Number(d.delivered_quantity),
          logged_at: d.logged_at,
          notes: d.notes,
          photo_url: d.photo_url,
        })),
      };
    });

    setRows(materialRows);
    setLoading(false);
  }, [projectId, expectedMaterials]);

  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`material-deliveries-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "material_deliveries",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadDeliveries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, loadDeliveries]);

  const totalExpected = expectedMaterials.length;
  const deliveredCount = rows.filter((r) => r.status === 'complete' || r.status === 'over').length;
  const partialCount = rows.filter((r) => r.status === 'partial').length;
  const overallCoverage = totalExpected > 0
    ? Math.round(rows.reduce((sum, r) => sum + r.coverage, 0) / totalExpected)
    : 0;

  const statusConfig = {
    pending: { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-900/30', label: t('materials.pending', 'Pending') },
    partial: { icon: TruckIcon, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', label: t('materials.partial', 'Partial') },
    complete: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: t('materials.complete', 'Complete') },
    over: { icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', label: t('materials.over', 'Over-delivered') },
  };

  if (expectedMaterials.length === 0) {
    return (
      <div className={cn("p-6 rounded-2xl border-2 border-dashed border-orange-200 dark:border-orange-800/30 text-center", className)}>
        <Package className="h-10 w-10 text-orange-300 dark:text-orange-600 mx-auto mb-3" />
        <p className="text-sm text-orange-600/70 dark:text-orange-400/60">
          {t('materials.noExpected', 'No materials defined in template yet')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Overview Header */}
      <div className="p-4 rounded-2xl border-2 border-orange-300 dark:border-orange-500/30 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-yellow-950/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ boxShadow: ['0 0 10px rgba(245,158,11,0.2)', '0 0 20px rgba(245,158,11,0.4)', '0 0 10px rgba(245,158,11,0.2)'] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg"
            >
              <TruckIcon className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <h4 className="text-lg font-black text-gray-900 dark:text-amber-100 tracking-tight">
                {t('materials.tracker', 'Material Tracker')}
              </h4>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                {deliveredCount}/{totalExpected} {t('materials.delivered', 'delivered')} • {partialCount} {t('materials.inTransit', 'in transit')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={loadDeliveries}
              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100/50"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            {canLog && (
              <Button
                size="sm"
                onClick={() => { setSelectedMaterial(null); setShowLogForm(true); }}
                className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg shadow-amber-500/25"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('materials.logDelivery', 'Log Delivery')}
              </Button>
            )}
          </div>
        </div>
        {/* Overall Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-700 dark:text-amber-300 font-medium">
              {t('materials.overallCoverage', 'Overall Coverage')}
            </span>
            <span className="font-bold text-amber-800 dark:text-amber-200">{overallCoverage}%</span>
          </div>
          <Progress value={overallCoverage} className="h-2.5 bg-amber-200/50 dark:bg-amber-900/30" />
        </div>
      </div>

      {/* Material Rows */}
      <div className="space-y-2">
        {rows.map((row, idx) => {
          const cfg = statusConfig[row.status];
          const StatusIcon = cfg.icon;
          const cardColors = [
            'border-rose-200/60 dark:border-rose-500/20',
            'border-cyan-200/60 dark:border-cyan-500/20',
            'border-lime-200/60 dark:border-lime-500/20',
            'border-violet-200/60 dark:border-violet-500/20',
            'border-fuchsia-200/60 dark:border-fuchsia-500/20',
          ];

          return (
            <motion.div
              key={row.material_name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "p-3 rounded-xl border-2 bg-card hover:shadow-md transition-all",
                cardColors[idx % cardColors.length]
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                  <StatusIcon className={cn("h-4 w-4", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground truncate">{row.material_name}</p>
                    <Badge variant="outline" className={cn("text-[10px] ml-2 shrink-0", cfg.color)}>
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {row.delivered_total.toLocaleString()} / {row.expected_quantity.toLocaleString()} {row.unit}
                    </span>
                    <div className="flex-1">
                      <Progress
                        value={Math.min(100, row.coverage)}
                        className="h-1.5"
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground">{Math.round(row.coverage)}%</span>
                  </div>
                </div>
                {canLog && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-amber-600 hover:bg-amber-100/50"
                    onClick={() => { setSelectedMaterial(row.material_name); setShowLogForm(true); }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {/* Show delivery notes if any */}
              {row.deliveries.filter(d => d.notes).length > 0 && (
                <div className="mt-2 pl-12 space-y-1">
                  {row.deliveries.filter(d => d.notes).map(d => (
                    <p key={d.id} className="text-[11px] text-muted-foreground italic border-l-2 border-amber-300 dark:border-amber-600 pl-2">
                      {d.notes}
                      <span className="ml-2 text-[10px] text-muted-foreground/60 not-italic">
                        {new Date(d.logged_at).toLocaleDateString()}
                      </span>
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Delivery Log Form */}
      <AnimatePresence>
        {showLogForm && (
          <MaterialDeliveryLog
            projectId={projectId}
            userId={userId}
            materialOptions={expectedMaterials.map((m) => ({ name: m.name, unit: m.unit }))}
            preselectedMaterial={selectedMaterial}
            onClose={() => setShowLogForm(false)}
            onSuccess={() => {
              setShowLogForm(false);
              loadDeliveries();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
