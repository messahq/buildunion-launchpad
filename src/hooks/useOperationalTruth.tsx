// ============================================
// OPERATIONAL TRUTH OVERLAY HOOK
// ============================================
// Calculates zone states using the mathematical model:
// State(x,y) = Green  if Log(Data) ≡ Photo(Vision)
//              Yellow if Log(Data) > Photo(Vision)
//              Red    if Log(Data) ≠ Photo(Vision) (High Variance)
// Sources: material_deliveries, site_logs, photo_estimate, reports
// ============================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ZoneStatus = 'green' | 'yellow' | 'red';

export interface BlueprintZone {
  id: string;
  project_id: string;
  zone_name: string;
  coordinates: {
    x: number;      // percentage (0-100)
    y: number;
    width: number;
    height: number;
  };
  source: 'ai' | 'manual' | 'hybrid';
  current_status: ZoneStatus;
  log_data: Record<string, any>;
  vision_data: Record<string, any>;
  report_data: Record<string, any>;
  variance_score: number;
  last_vision_sync: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OperationalTruthState {
  zones: BlueprintZone[];
  isLoading: boolean;
  isRefreshing: boolean;
  conflictCount: number;
  summaryStats: {
    green: number;
    yellow: number;
    red: number;
    total: number;
  };
}

// Variance calculation: compares Log quantities vs Vision-detected quantities
function calculateVariance(
  logData: Record<string, any>,
  visionData: Record<string, any>,
  reportData: Record<string, any>
): { status: ZoneStatus; score: number } {
  const logItems = logData?.items || [];
  const visionItems = visionData?.items || [];
  const reportItems = reportData?.items || [];

  if (logItems.length === 0 && visionItems.length === 0) {
    return { status: 'green', score: 0 };
  }

  // Build lookup maps
  const logMap = new Map<string, number>();
  for (const item of logItems) {
    const key = (item.name || item.material_name || '').toLowerCase();
    logMap.set(key, (logMap.get(key) || 0) + (item.quantity || item.delivered_quantity || 0));
  }

  const visionMap = new Map<string, number>();
  for (const item of visionItems) {
    const key = (item.name || item.detected_material || '').toLowerCase();
    visionMap.set(key, (visionMap.get(key) || 0) + (item.quantity || item.detected_count || 0));
  }

  // Factor in report data for additional cross-check
  const reportMap = new Map<string, number>();
  for (const item of reportItems) {
    const key = (item.name || item.material_name || '').toLowerCase();
    reportMap.set(key, (reportMap.get(key) || 0) + (item.quantity || item.completed_count || 0));
  }

  // Calculate variance across all known materials
  const allKeys = new Set([...logMap.keys(), ...visionMap.keys(), ...reportMap.keys()]);
  if (allKeys.size === 0) return { status: 'green', score: 0 };

  let totalVariance = 0;
  let itemCount = 0;

  for (const key of allKeys) {
    const logVal = logMap.get(key) || 0;
    const visionVal = visionMap.get(key) || 0;
    const reportVal = reportMap.get(key) || 0;

    // Use max of vision and report as "ground truth" reference
    const referenceVal = Math.max(visionVal, reportVal) || logVal;
    if (referenceVal === 0) continue;

    const variance = Math.abs(logVal - referenceVal) / referenceVal;
    totalVariance += variance;
    itemCount++;
  }

  const avgVariance = itemCount > 0 ? totalVariance / itemCount : 0;

  // Apply the mathematical model
  if (avgVariance <= 0.1) {
    return { status: 'green', score: avgVariance };
  } else if (avgVariance <= 0.35) {
    return { status: 'yellow', score: avgVariance };
  } else {
    return { status: 'red', score: avgVariance };
  }
}

export function useOperationalTruth(projectId: string | undefined) {
  const [zones, setZones] = useState<BlueprintZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load zones from DB
  const loadZones = useCallback(async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('blueprint_zones')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const parsed: BlueprintZone[] = (data || []).map((z: any) => ({
        ...z,
        coordinates: z.coordinates || { x: 0, y: 0, width: 10, height: 10 },
        log_data: z.log_data || {},
        vision_data: z.vision_data || {},
        report_data: z.report_data || {},
      }));

      setZones(parsed);
    } catch (err) {
      console.error('[OperationalTruth] Failed to load zones:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // Refresh vision data (cached + refresh button)
  const refreshVisionData = useCallback(async (zoneId?: string) => {
    if (!projectId) return;
    setIsRefreshing(true);

    try {
      // Fetch latest delivery data
      const { data: deliveries } = await supabase
        .from('material_deliveries')
        .select('material_name, delivered_quantity, expected_quantity, unit, notes')
        .eq('project_id', projectId);

      // Fetch latest site logs/reports
      const { data: siteLogs } = await supabase
        .from('site_logs')
        .select('report_name, template_type, tasks_data, completed_count, total_count, notes')
        .eq('project_id', projectId);

      // Fetch photo_estimate from summary (cached vision data)
      const { data: summaryData } = await supabase
        .from('project_summaries')
        .select('photo_estimate, blueprint_analysis')
        .eq('project_id', projectId)
        .single();

      const logItems = (deliveries || []).map(d => ({
        name: d.material_name,
        quantity: d.delivered_quantity,
        expected: d.expected_quantity,
        unit: d.unit,
      }));

      const visionItems = summaryData?.photo_estimate
        ? Object.entries(summaryData.photo_estimate as Record<string, any>).map(([key, val]) => ({
            name: key,
            detected_material: key,
            detected_count: typeof val === 'number' ? val : (val as any)?.quantity || 0,
          }))
        : [];

      const reportItems = (siteLogs || []).map(log => ({
        name: log.report_name,
        quantity: log.completed_count || 0,
        total: log.total_count || 0,
        template: log.template_type,
      }));

      // Update each zone (or specific zone)
      const targetZones = zoneId ? zones.filter(z => z.id === zoneId) : zones;

      for (const zone of targetZones) {
        const newLogData = { items: logItems, synced_at: new Date().toISOString() };
        const newVisionData = { items: visionItems, synced_at: new Date().toISOString() };
        const newReportData = { items: reportItems, synced_at: new Date().toISOString() };

        const { status, score } = calculateVariance(newLogData, newVisionData, newReportData);

        const { error } = await supabase
          .from('blueprint_zones')
          .update({
            log_data: newLogData,
            vision_data: newVisionData,
            report_data: newReportData,
            current_status: status,
            variance_score: score,
            last_vision_sync: new Date().toISOString(),
          })
          .eq('id', zone.id);

        if (error) {
          console.error('[OperationalTruth] Failed to update zone:', zone.id, error);
        }
      }

      await loadZones();
      toast.success('Vision data refreshed');
    } catch (err) {
      console.error('[OperationalTruth] Refresh failed:', err);
      toast.error('Failed to refresh vision data');
    } finally {
      setIsRefreshing(false);
    }
  }, [projectId, zones, loadZones]);

  // Add a new zone manually
  const addZone = useCallback(async (
    zoneName: string,
    coordinates: BlueprintZone['coordinates'],
    source: 'ai' | 'manual' | 'hybrid' = 'manual'
  ) => {
    if (!projectId) return;

    try {
      const { error } = await supabase
        .from('blueprint_zones')
        .insert({
          project_id: projectId,
          zone_name: zoneName,
          coordinates,
          source,
        });

      if (error) throw error;
      await loadZones();
      toast.success(`Zone "${zoneName}" added`);
    } catch (err) {
      console.error('[OperationalTruth] Failed to add zone:', err);
      toast.error('Failed to add zone');
    }
  }, [projectId, loadZones]);

  // Delete a zone
  const deleteZone = useCallback(async (zoneId: string) => {
    try {
      const { error } = await supabase
        .from('blueprint_zones')
        .delete()
        .eq('id', zoneId);

      if (error) throw error;
      await loadZones();
      toast.success('Zone removed');
    } catch (err) {
      console.error('[OperationalTruth] Failed to delete zone:', err);
      toast.error('Failed to remove zone');
    }
  }, [loadZones]);

  // Summary stats
  const summaryStats = {
    green: zones.filter(z => z.current_status === 'green').length,
    yellow: zones.filter(z => z.current_status === 'yellow').length,
    red: zones.filter(z => z.current_status === 'red').length,
    total: zones.length,
  };

  return {
    zones,
    isLoading,
    isRefreshing,
    conflictCount: summaryStats.red + summaryStats.yellow,
    summaryStats,
    refreshVisionData,
    addZone,
    deleteZone,
    reloadZones: loadZones,
  };
}
