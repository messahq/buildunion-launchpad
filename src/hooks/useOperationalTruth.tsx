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

export interface ZoneDataItem {
  name: string;
  logQty: number;
  expectedQty: number;
  visionQty: number;
  reportQty: number;
  unit: string;
  match: 'match' | 'over' | 'under' | 'missing';
}

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

// Parse items from zone data into a unified comparison list
export function getZoneComparisonItems(zone: BlueprintZone): ZoneDataItem[] {
  const logItems = zone.log_data?.items || [];
  const visionItems = zone.vision_data?.items || [];
  const reportItems = zone.report_data?.items || [];

  const allKeys = new Map<string, ZoneDataItem>();

  for (const item of logItems) {
    const key = (item.name || item.material_name || '').toLowerCase();
    if (!key) continue;
    const existing = allKeys.get(key) || { name: item.name || key, logQty: 0, expectedQty: 0, visionQty: 0, reportQty: 0, unit: item.unit || 'units', match: 'match' as const };
    existing.logQty += item.quantity || item.delivered_quantity || 0;
    existing.expectedQty += item.expected || item.expected_quantity || 0;
    allKeys.set(key, existing);
  }

  for (const item of visionItems) {
    const key = (item.name || item.detected_material || '').toLowerCase();
    if (!key) continue;
    const existing = allKeys.get(key) || { name: item.name || key, logQty: 0, expectedQty: 0, visionQty: 0, reportQty: 0, unit: 'units', match: 'match' as const };
    existing.visionQty += item.quantity || item.detected_count || 0;
    allKeys.set(key, existing);
  }

  for (const item of reportItems) {
    const key = (item.name || item.material_name || '').toLowerCase();
    if (!key) continue;
    const existing = allKeys.get(key) || { name: item.name || key, logQty: 0, expectedQty: 0, visionQty: 0, reportQty: 0, unit: 'units', match: 'match' as const };
    existing.reportQty += item.quantity || item.completed_count || 0;
    allKeys.set(key, existing);
  }

  // Calculate match status
  return Array.from(allKeys.values()).map(item => {
    const reference = Math.max(item.visionQty, item.reportQty) || item.expectedQty || item.logQty;
    if (reference === 0) return { ...item, match: 'match' as const };
    const ratio = item.logQty / reference;
    if (ratio >= 0.9 && ratio <= 1.1) return { ...item, match: 'match' as const };
    if (ratio > 1.1) return { ...item, match: 'over' as const };
    if (item.logQty === 0) return { ...item, match: 'missing' as const };
    return { ...item, match: 'under' as const };
  });
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

  const reportMap = new Map<string, number>();
  for (const item of reportItems) {
    const key = (item.name || item.material_name || '').toLowerCase();
    reportMap.set(key, (reportMap.get(key) || 0) + (item.quantity || item.completed_count || 0));
  }

  const allKeys = new Set([...logMap.keys(), ...visionMap.keys(), ...reportMap.keys()]);
  if (allKeys.size === 0) return { status: 'green', score: 0 };

  let totalVariance = 0;
  let itemCount = 0;

  for (const key of allKeys) {
    const logVal = logMap.get(key) || 0;
    const visionVal = visionMap.get(key) || 0;
    const reportVal = reportMap.get(key) || 0;

    const referenceVal = Math.max(visionVal, reportVal) || logVal;
    if (referenceVal === 0) continue;

    const variance = Math.abs(logVal - referenceVal) / referenceVal;
    totalVariance += variance;
    itemCount++;
  }

  const avgVariance = itemCount > 0 ? totalVariance / itemCount : 0;

  if (avgVariance <= 0.1) {
    return { status: 'green', score: avgVariance };
  } else if (avgVariance <= 0.35) {
    return { status: 'yellow', score: avgVariance };
  } else {
    return { status: 'red', score: avgVariance };
  }
}

// Zone-material matching heuristic: which deliveries belong to which zone
function matchDeliveryToZone(materialName: string, zoneName: string): boolean {
  const mat = materialName.toLowerCase();
  const zone = zoneName.toLowerCase();

  // Kitchen-related
  if (zone.includes('kitchen')) {
    return mat.includes('cabinet') || mat.includes('counter') || mat.includes('sink') || mat.includes('faucet') || mat.includes('tile') || mat.includes('appliance');
  }
  // Bathroom-related
  if (zone.includes('bath') || zone.includes('washroom')) {
    return mat.includes('toilet') || mat.includes('vanity') || mat.includes('shower') || mat.includes('tile') || mat.includes('faucet') || mat.includes('mirror');
  }
  // Bedroom
  if (zone.includes('bedroom') || zone.includes('master')) {
    return mat.includes('drywall') || mat.includes('paint') || mat.includes('trim') || mat.includes('baseboard') || mat.includes('carpet') || mat.includes('flooring');
  }
  // Living room / Main area
  if (zone.includes('living') || zone.includes('main') || zone.includes('great')) {
    return mat.includes('drywall') || mat.includes('paint') || mat.includes('flooring') || mat.includes('baseboard') || mat.includes('light');
  }
  // Storage / Utility
  if (zone.includes('storage') || zone.includes('utility') || zone.includes('laundry')) {
    return mat.includes('shelf') || mat.includes('wire') || mat.includes('pipe') || mat.includes('plumbing');
  }
  // Entrance / Hallway
  if (zone.includes('entrance') || zone.includes('hall') || zone.includes('foyer')) {
    return mat.includes('door') || mat.includes('hardware') || mat.includes('tile') || mat.includes('light');
  }
  // Exterior
  if (zone.includes('exterior') || zone.includes('deck') || zone.includes('porch')) {
    return mat.includes('siding') || mat.includes('lumber') || mat.includes('concrete') || mat.includes('roofing');
  }
  // Default: general structural materials go everywhere
  return mat.includes('lumber') || mat.includes('framing') || mat.includes('insulation') || mat.includes('stud');
}

export function useOperationalTruth(projectId: string | undefined) {
  const [zones, setZones] = useState<BlueprintZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoGenerated, setAutoGenerated] = useState(false);

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
      return parsed;
    } catch (err) {
      console.error('[OperationalTruth] Failed to load zones:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Auto-generate zones from project data when none exist
  const autoGenerateZones = useCallback(async () => {
    if (!projectId || autoGenerated) return;
    setAutoGenerated(true);

    try {
      const { data: summary } = await supabase
        .from('project_summaries')
        .select('blueprint_analysis, verified_facts, total_cost')
        .eq('project_id', projectId)
        .single();

      if (!summary) return;

      const bpAnalysis = summary.blueprint_analysis as Record<string, any> | null;
      const verifiedFacts = (summary.verified_facts || []) as any[];

      const gfaCitation = verifiedFacts.find((f: any) => f.cite_type === 'GFA_LOCK');
      const gfaValue = gfaCitation?.metadata?.gfa_value as number | undefined;

      const rooms = bpAnalysis?.rooms || bpAnalysis?.zones || bpAnalysis?.areas;

      let zonesToCreate: { zone_name: string; coordinates: Record<string, number>; source: string }[] = [];

      if (Array.isArray(rooms) && rooms.length > 0) {
        zonesToCreate = rooms.slice(0, 8).map((room: any, i: number) => {
          const cols = Math.min(4, rooms.length);
          const row = Math.floor(i / cols);
          const col = i % cols;
          const w = Math.floor(90 / cols);
          const h = 35;
          return {
            zone_name: room.name || room.label || `Zone ${i + 1}`,
            coordinates: { x: 5 + col * (w + 2), y: 5 + row * (h + 5), width: w, height: h },
            source: 'ai',
          };
        });
      } else if (gfaValue && gfaValue > 0) {
        const estZones = Math.max(2, Math.min(6, Math.round(gfaValue / 200)));
        const cols = Math.min(3, estZones);
        const w = Math.floor(85 / cols);
        const h = 35;
        const defaultNames = ['Main Area', 'Kitchen', 'Bathroom', 'Bedroom', 'Entrance', 'Utility'];
        
        zonesToCreate = Array.from({ length: estZones }, (_, i) => ({
          zone_name: defaultNames[i] || `Zone ${i + 1}`,
          coordinates: { x: 5 + (i % cols) * (w + 3), y: 5 + Math.floor(i / cols) * (h + 5), width: w, height: h },
          source: 'ai' as string,
        }));
      }

      if (zonesToCreate.length === 0) return;

      const { error } = await supabase
        .from('blueprint_zones')
        .insert(zonesToCreate.map(z => ({
          project_id: projectId,
          zone_name: z.zone_name,
          coordinates: z.coordinates,
          source: z.source,
        })));

      if (error) {
        console.error('[OperationalTruth] Auto-generate failed:', error);
        return;
      }

      console.log(`[OperationalTruth] Auto-generated ${zonesToCreate.length} zones`);
      await loadZones();
    } catch (err) {
      console.error('[OperationalTruth] Auto-generate error:', err);
    }
  }, [projectId, autoGenerated, loadZones]);

  useEffect(() => {
    const init = async () => {
      const loaded = await loadZones();
      if (loaded && loaded.length === 0) {
        await autoGenerateZones();
      }
    };
    init();
  }, [loadZones, autoGenerateZones]);

  // Refresh vision data with per-zone material mapping
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

      const allDeliveries = (deliveries || []).map(d => ({
        name: d.material_name,
        quantity: d.delivered_quantity,
        expected: d.expected_quantity,
        unit: d.unit,
      }));

      const allVisionItems = summaryData?.photo_estimate
        ? Object.entries(summaryData.photo_estimate as Record<string, any>).map(([key, val]) => ({
            name: key,
            detected_material: key,
            detected_count: typeof val === 'number' ? val : (val as any)?.quantity || 0,
          }))
        : [];

      const allReportItems = (siteLogs || []).map(log => ({
        name: log.report_name,
        quantity: log.completed_count || 0,
        total: log.total_count || 0,
        template: log.template_type,
      }));

      // Update each zone with zone-specific data
      const targetZones = zoneId ? zones.filter(z => z.id === zoneId) : zones;

      for (const zone of targetZones) {
        // Filter deliveries relevant to this zone
        const zoneDeliveries = allDeliveries.filter(d => matchDeliveryToZone(d.name, zone.zone_name));
        // If no specific match, fallback to all (for zones with generic names)
        const logItems = zoneDeliveries.length > 0 ? zoneDeliveries : allDeliveries;

        const newLogData = { items: logItems, synced_at: new Date().toISOString(), total_deliveries: allDeliveries.length };
        const newVisionData = { items: allVisionItems, synced_at: new Date().toISOString() };
        const newReportData = { items: allReportItems, synced_at: new Date().toISOString(), total_reports: (siteLogs || []).length };

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
      toast.success(`Synced ${targetZones.length} zone(s) with latest project data`);
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

  // Rename a zone
  const renameZone = useCallback(async (zoneId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('blueprint_zones')
        .update({ zone_name: newName })
        .eq('id', zoneId);

      if (error) throw error;
      await loadZones();
      toast.success(`Zone renamed to "${newName}"`);
    } catch (err) {
      console.error('[OperationalTruth] Failed to rename zone:', err);
      toast.error('Failed to rename zone');
    }
  }, [loadZones]);

  // Update zone notes via metadata
  const updateZoneNotes = useCallback(async (zoneId: string, notes: string) => {
    const zone = zones.find(z => z.id === zoneId);
    const existingMeta = zone?.metadata || {};
    try {
      const { error } = await supabase
        .from('blueprint_zones')
        .update({ metadata: { ...existingMeta, notes } })
        .eq('id', zoneId);

      if (error) throw error;
      await loadZones();
    } catch (err) {
      console.error('[OperationalTruth] Failed to update notes:', err);
    }
  }, [zones, loadZones]);

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
    renameZone,
    updateZoneNotes,
    reloadZones: loadZones,
  };
}
