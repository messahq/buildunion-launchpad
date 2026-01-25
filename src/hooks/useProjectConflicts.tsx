import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ProjectConflict {
  projectId: string;
  projectName: string;
  projectAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  conflictType: "area" | "cost" | "materials" | "facts";
  severity: "high" | "medium" | "low";
  photoValue: string;
  blueprintValue: string;
  createdAt: string;
}

// Use Google Geocoding to get coordinates from address
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Get current session - Supabase client handles token refresh automatically
    const { data: { session } } = await supabase.auth.getSession();
    const tokenToUse = session?.access_token;
    
    if (!tokenToUse) {
      console.warn("No valid session for geocoding");
      return null;
    }

    // Get the maps API key with current token
    const { data: keyData } = await supabase.functions.invoke("get-maps-key", {
      headers: {
        Authorization: `Bearer ${tokenToUse}`,
      },
    });
    if (!keyData?.key) return null;

    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${keyData.key}`
    );
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export function useProjectConflicts() {
  const { user } = useAuth();
  const [conflicts, setConflicts] = useState<ProjectConflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConflicts = useCallback(async () => {
    if (!user) {
      setConflicts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Get user's projects
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, address")
        .eq("user_id", user.id);

      if (!projects || projects.length === 0) {
        setConflicts([]);
        setIsLoading(false);
        return;
      }

      const projectIds = projects.map((p) => p.id);

      // Get summaries with both photo_estimate and blueprint_analysis
      const { data: summaries } = await supabase
        .from("project_summaries")
        .select("project_id, photo_estimate, blueprint_analysis, verified_facts, created_at")
        .in("project_id", projectIds)
        .not("photo_estimate", "is", null)
        .not("blueprint_analysis", "is", null);

      if (!summaries || summaries.length === 0) {
        setConflicts([]);
        setIsLoading(false);
        return;
      }

      const detectedConflicts: ProjectConflict[] = [];

      for (const summary of summaries) {
        const project = projects.find((p) => p.id === summary.project_id);
        if (!project) continue;

        const photoData = summary.photo_estimate as any;
        const blueprintData = summary.blueprint_analysis as any;

        // Try to get location from address
        let location: { lat: number; lng: number } | null = null;
        if (project.address) {
          location = await geocodeAddress(project.address);
        }

        // Check area conflict
        if (photoData?.area && blueprintData?.area) {
          const photoArea = parseFloat(photoData.area) || 0;
          const blueprintArea = parseFloat(blueprintData.area) || 0;
          const percentDiff = photoArea > 0 ? (Math.abs(photoArea - blueprintArea) / photoArea) * 100 : 0;

          if (percentDiff > 15) {
            detectedConflicts.push({
              projectId: project.id,
              projectName: project.name,
              projectAddress: project.address,
              latitude: location?.lat || null,
              longitude: location?.lng || null,
              conflictType: "area",
              severity: percentDiff > 30 ? "high" : "medium",
              photoValue: `${photoArea} sq ft`,
              blueprintValue: `${blueprintArea} sq ft`,
              createdAt: summary.created_at,
            });
          }
        }

        // Check cost conflict
        if (photoData?.total && blueprintData?.total) {
          const photoTotal = parseFloat(photoData.total) || 0;
          const blueprintTotal = parseFloat(blueprintData.total) || 0;
          const percentDiff = photoTotal > 0 ? (Math.abs(photoTotal - blueprintTotal) / photoTotal) * 100 : 0;

          if (percentDiff > 20) {
            detectedConflicts.push({
              projectId: project.id,
              projectName: project.name,
              projectAddress: project.address,
              latitude: location?.lat || null,
              longitude: location?.lng || null,
              conflictType: "cost",
              severity: percentDiff > 40 ? "high" : "medium",
              photoValue: `$${photoTotal.toFixed(2)}`,
              blueprintValue: `$${blueprintTotal.toFixed(2)}`,
              createdAt: summary.created_at,
            });
          }
        }

        // Check material count conflict
        if (photoData?.materials?.length && blueprintData?.materials?.length) {
          const diff = Math.abs(photoData.materials.length - blueprintData.materials.length);
          if (diff > 3) {
            detectedConflicts.push({
              projectId: project.id,
              projectName: project.name,
              projectAddress: project.address,
              latitude: location?.lat || null,
              longitude: location?.lng || null,
              conflictType: "materials",
              severity: "low",
              photoValue: `${photoData.materials.length} items`,
              blueprintValue: `${blueprintData.materials.length} items`,
              createdAt: summary.created_at,
            });
          }
        }
      }

      setConflicts(detectedConflicts);
    } catch (error) {
      console.error("Error fetching conflicts:", error);
      setConflicts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  return {
    conflicts,
    isLoading,
    refetch: fetchConflicts,
  };
}
