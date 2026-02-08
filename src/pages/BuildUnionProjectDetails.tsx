import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, Building, Calendar, FileText, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import { WizardCitation, WORK_TYPE_LABELS, WorkType } from "@/types/projectWizard";
import { Citation, CITATION_TYPES } from "@/types/citation";
import WireframeVisualizer from "@/components/project-wizard/WireframeVisualizer";
import { useGoogleMapsApi } from "@/hooks/useGoogleMapsApi";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

interface ProjectData {
  id: string;
  name: string;
  address: string | null;
  trade: string | null;
  status: string;
  description: string | null;
  created_at: string;
}

interface ProjectSummary {
  id: string;
  verified_facts: (WizardCitation | Citation)[] | null;
  blueprint_analysis: any | null;
  total_cost: number | null;
  material_cost: number | null;
  labor_cost: number | null;
  status: string;
}

const BuildUnionProjectDetails = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { apiKey, isLoading: mapsLoading } = useGoogleMapsApi();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightedCitation, setHighlightedCitation] = useState<string | null>(null);

  // Geocode address
  const geocodeAddress = useCallback(async (address: string) => {
    try {
      const { data } = await supabase.functions.invoke("get-maps-key");
      if (!data?.key) return null;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${data.key}`
      );
      const result = await response.json();
      
      if (result.results?.[0]?.geometry?.location) {
        return result.results[0].geometry.location;
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
    return null;
  }, []);

  // Load project data
  useEffect(() => {
    if (authLoading || !projectId) return;
    if (!user) {
      navigate("/buildunion/login");
      return;
    }

    const loadProject = async () => {
      // Load project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) {
        console.error("Error loading project:", projectError);
        toast.error("Project not found");
        navigate("/buildunion/workspace");
        return;
      }

      setProject(projectData);

      // Load summary
      const { data: summaryData } = await supabase
        .from("project_summaries")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (summaryData) {
        // Parse verified_facts from JSON
        let parsedFacts: (WizardCitation | Citation)[] = [];
        if (Array.isArray(summaryData.verified_facts)) {
          parsedFacts = (summaryData.verified_facts as unknown as (WizardCitation | Citation)[]).filter(
            (fact): fact is (WizardCitation | Citation) => 
              fact !== null && 
              typeof fact === 'object' && 
              'id' in fact && 
              'answer' in fact
          );
        }
        
        setSummary({
          ...summaryData,
          verified_facts: parsedFacts
        });

        // PRIORITY: Extract coordinates from LOCATION citation first
        const locationCitation = parsedFacts.find(
          (f) => (f as Citation).cite_type === CITATION_TYPES.LOCATION || 
                 (f as WizardCitation).questionKey === 'project_address'
        );
        
        const citationCoords = (locationCitation as Citation)?.metadata?.coordinates;
        
        if (citationCoords) {
          console.log("[ProjectDetails] Using coordinates from citation:", citationCoords);
          setCoordinates(citationCoords);
        } else if (projectData.address) {
          // Fallback: Geocode the address if no coordinates in citation
          console.log("[ProjectDetails] No citation coords, geocoding address:", projectData.address);
          const coords = await geocodeAddress(projectData.address);
          if (coords) setCoordinates(coords);
        }
      } else if (projectData.address) {
        // No summary at all, try geocoding
        const coords = await geocodeAddress(projectData.address);
        if (coords) setCoordinates(coords);
      }

      setLoading(false);
    };

    loadProject();
  }, [user, authLoading, projectId, navigate, geocodeAddress]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const verifiedFacts = summary?.verified_facts || [];
  
  // Extract GFA value from citations
  const gfaCitation = verifiedFacts.find(
    (f) => (f as Citation).cite_type === CITATION_TYPES.GFA_LOCK
  ) as Citation | undefined;
  const gfaValue = gfaCitation?.metadata?.gfa_value as number | undefined;

  // Get work type from citation if project.trade is missing
  const workTypeCitation = verifiedFacts.find(
    (f) => (f as Citation).cite_type === CITATION_TYPES.WORK_TYPE ||
           ('questionKey' in f && f.questionKey === 'work_type')
  );
  const workType = project.trade || 
    (workTypeCitation as Citation)?.metadata?.work_type_key ||
    (workTypeCitation as WizardCitation)?.answer;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10">
      <BuildUnionHeader />
      
      {/* Top Navigation */}
      <div className="border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/80 via-background/80 to-orange-50/80 dark:from-amber-950/50 dark:via-background/80 dark:to-orange-950/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/buildunion/workspace")}
              className="gap-2 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.back", "Back to Workspace")}
            </Button>
            
            <Badge 
              variant="outline" 
              className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
            >
              {project.status}
            </Badge>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8 pb-28">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Project Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/50 via-background to-orange-50/50 dark:from-amber-950/30 dark:via-background dark:to-orange-950/30 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-orange-500/5" />
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <Building className="h-3 w-3" />
                      <span className="font-semibold">PROJECT 3.0</span>
                    </div>
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 dark:from-amber-300 dark:to-orange-300 bg-clip-text text-transparent">
                      {project.name}
                    </CardTitle>
                    {project.address && (
                      <div className="flex items-center gap-2 text-amber-700/70 dark:text-amber-400/70">
                        <MapPin className="h-4 w-4" />
                        <span>{project.address}</span>
                      </div>
                    )}
                  </div>
                  <motion.div
                    className="w-4 h-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full shadow-lg shadow-amber-500/50"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-center gap-4 text-sm">
                  {project.trade && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                      {WORK_TYPE_LABELS[project.trade as WorkType] || project.trade}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-amber-600/70 dark:text-amber-400/70">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Left Column - Map & Location */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-amber-200/50 dark:border-amber-800/30 overflow-hidden h-full">
                <CardHeader className="border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30">
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <MapPin className="h-5 w-5" />
                    Project Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-64 bg-gradient-to-br from-amber-100/30 to-orange-100/30 dark:from-amber-950/30 dark:to-orange-950/30">
                    {mapsLoading ? (
                      <div className="h-full flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                      </div>
                    ) : apiKey && coordinates ? (
                      <LoadScript googleMapsApiKey={apiKey}>
                        <GoogleMap
                          mapContainerStyle={{ width: '100%', height: '100%' }}
                          center={coordinates}
                          zoom={15}
                          options={{
                            disableDefaultUI: true,
                            zoomControl: true,
                            styles: [{ featureType: "all", stylers: [{ saturation: -20 }] }]
                          }}
                        >
                          <Marker position={coordinates} />
                        </GoogleMap>
                      </LoadScript>
                    ) : (
                      <div className="h-full flex items-center justify-center text-amber-600/70 dark:text-amber-400/70">
                        <div className="text-center space-y-2">
                          <MapPin className="h-8 w-8 mx-auto opacity-50" />
                          <p className="text-sm">No location available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Right Column - Wireframe */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-amber-200/50 dark:border-amber-800/30 overflow-hidden h-full">
                <CardHeader className="border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30">
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <Building className="h-5 w-5" />
                    Project Visualization
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {workType ? (
                    <WireframeVisualizer workType={workType} gfaValue={gfaValue} />
                  ) : (
                    <WireframeVisualizer />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Verified Facts / Citations */}
          {verifiedFacts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-amber-200/50 dark:border-amber-800/30">
                <CardHeader className="border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30">
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <FileText className="h-5 w-5" />
                    Source of Truth - Verified Facts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {verifiedFacts.map((fact, index) => (
                      <motion.div
                        key={fact.id || index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          highlightedCitation === fact.id
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/50"
                            : "border-amber-200/50 dark:border-amber-800/30 hover:border-amber-300 dark:hover:border-amber-700"
                        }`}
                        onClick={() => setHighlightedCitation(fact.id === highlightedCitation ? null : fact.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase">
                              {('questionKey' in fact ? fact.questionKey : (fact as Citation).question_key)?.replace(/_/g, ' ')}
                            </div>
                            <div className="text-sm font-medium">
                              {(('questionKey' in fact ? fact.questionKey : (fact as Citation).question_key) === 'work_type' ||
                                (fact as Citation).cite_type === CITATION_TYPES.WORK_TYPE)
                                ? WORK_TYPE_LABELS[fact.answer as WorkType] || fact.answer
                                : fact.answer
                              }
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className="text-xs font-mono border-amber-300 dark:border-amber-700"
                          >
                            {fact.id?.slice(0, 12)}...
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Next Steps - Coming Soon */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/20">
              <CardContent className="p-8 text-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 mb-4"
                >
                  <Sparkles className="h-8 w-8 text-amber-500" />
                </motion.div>
                <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent mb-2">
                  Next Step: Blueprint Upload
                </h3>
                <p className="text-amber-700/70 dark:text-amber-400/70 max-w-md mx-auto mb-6">
                  Upload your construction blueprints and let AI analyze them to extract dimensions, materials, and cost estimates.
                </p>
                <Button 
                  className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 border-0"
                  disabled
                >
                  Upload Blueprint
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <p className="text-xs text-amber-500/70 mt-2">Coming soon...</p>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </main>
    </div>
  );
};

export default BuildUnionProjectDetails;
