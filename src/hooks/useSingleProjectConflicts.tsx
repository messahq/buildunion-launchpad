import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ProjectConflict {
  id: string;
  conflictType: "area" | "cost" | "materials" | "facts";
  severity: "high" | "medium" | "low";
  photoValue: string;
  blueprintValue: string;
  percentDiff: number;
  description: string;
}

export function useSingleProjectConflicts(projectId: string | undefined) {
  const { user } = useAuth();
  const [conflicts, setConflicts] = useState<ProjectConflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConflicts = useCallback(async () => {
    if (!user || !projectId) {
      setConflicts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Get project summary with both photo_estimate and blueprint_analysis
      const { data: summary } = await supabase
        .from("project_summaries")
        .select("photo_estimate, blueprint_analysis, ai_workflow_config")
        .eq("project_id", projectId)
        .maybeSingle();

      if (!summary) {
        setConflicts([]);
        setIsLoading(false);
        return;
      }

      const photoData = summary.photo_estimate as any;
      const blueprintData = summary.blueprint_analysis as any;
      const aiConfig = summary.ai_workflow_config as any;

      const detectedConflicts: ProjectConflict[] = [];

      // Check area conflict from photo_estimate vs blueprint_analysis
      const photoArea = photoData?.area || photoData?.detectedArea || aiConfig?.detectedArea || 0;
      const blueprintArea = blueprintData?.area || aiConfig?.blueprintArea || 0;

      if (photoArea && blueprintArea) {
        const pArea = parseFloat(String(photoArea)) || 0;
        const bArea = parseFloat(String(blueprintArea)) || 0;
        const percentDiff = pArea > 0 ? (Math.abs(pArea - bArea) / pArea) * 100 : 0;

        if (percentDiff > 10) {
          detectedConflicts.push({
            id: `area-${projectId}`,
            conflictType: "area",
            severity: percentDiff > 30 ? "high" : percentDiff > 20 ? "medium" : "low",
            photoValue: `${pArea.toFixed(0)} sq ft`,
            blueprintValue: `${bArea.toFixed(0)} sq ft`,
            percentDiff: Math.round(percentDiff),
            description: `Area measurement differs by ${Math.round(percentDiff)}%`,
          });
        }
      }

      // Check cost conflict
      const photoTotal = photoData?.total || photoData?.estimatedCost || 0;
      const blueprintTotal = blueprintData?.total || blueprintData?.estimatedCost || 0;

      if (photoTotal && blueprintTotal) {
        const pTotal = parseFloat(String(photoTotal)) || 0;
        const bTotal = parseFloat(String(blueprintTotal)) || 0;
        const percentDiff = pTotal > 0 ? (Math.abs(pTotal - bTotal) / pTotal) * 100 : 0;

        if (percentDiff > 20) {
          detectedConflicts.push({
            id: `cost-${projectId}`,
            conflictType: "cost",
            severity: percentDiff > 40 ? "high" : "medium",
            photoValue: `$${pTotal.toFixed(2)}`,
            blueprintValue: `$${bTotal.toFixed(2)}`,
            percentDiff: Math.round(percentDiff),
            description: `Cost estimate differs by ${Math.round(percentDiff)}%`,
          });
        }
      }

      // Check material count conflict
      const photoMaterials = photoData?.materials || [];
      const blueprintMaterials = blueprintData?.materials || [];

      if (photoMaterials.length > 0 && blueprintMaterials.length > 0) {
        const diff = Math.abs(photoMaterials.length - blueprintMaterials.length);
        const percentDiff = photoMaterials.length > 0 
          ? (diff / photoMaterials.length) * 100 
          : 0;

        if (diff > 3 || percentDiff > 30) {
          detectedConflicts.push({
            id: `materials-${projectId}`,
            conflictType: "materials",
            severity: diff > 5 ? "medium" : "low",
            photoValue: `${photoMaterials.length} items`,
            blueprintValue: `${blueprintMaterials.length} items`,
            percentDiff: Math.round(percentDiff),
            description: `Material count differs by ${diff} items`,
          });
        }
      }

      setConflicts(detectedConflicts);
    } catch (error) {
      console.error("Error fetching project conflicts:", error);
      setConflicts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, projectId]);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  const highSeverityCount = conflicts.filter(c => c.severity === "high").length;
  const mediumSeverityCount = conflicts.filter(c => c.severity === "medium").length;
  const lowSeverityCount = conflicts.filter(c => c.severity === "low").length;

  return {
    conflicts,
    isLoading,
    refetch: fetchConflicts,
    hasConflicts: conflicts.length > 0,
    highSeverityCount,
    mediumSeverityCount,
    lowSeverityCount,
  };
}
