// ============================================
// VISUAL INTELLIGENCE DASHBOARD (Gemini)
// ============================================
// Hybrid layout for visual asset analysis:
// - Left: Photo gallery with AI analysis cards
// - Right: Blueprint overlay + OBC Compliance Matrix
// ============================================

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Download,
  RefreshCw,
  Sparkles,
  Eye,
  Image as ImageIcon,
  FileImage,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Shield,
  Building2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Import engine image
import engineGeminiImg from "@/assets/engine-gemini.png";

// ============================================
// TYPES
// ============================================
interface VisualAsset {
  id: string;
  url: string;
  signedUrl?: string;
  name: string;
  type: "blueprint" | "site_photo" | "document";
  uploadedAt: string;
  aiAnalysis?: {
    status: "pending" | "analyzing" | "complete" | "error";
    summary?: string;
    detectedObjects?: string[];
    progressMatch?: number; // 0-100
    obcFlags?: string[];
    confidence?: number;
  };
}

interface OBCComplianceItem {
  section: string;
  title: string;
  excerpt: string;
  relevance: number; // 0-100
  status: "pass" | "warning" | "fail" | "pending";
  details?: string;
}

interface VisualIntelligenceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectContext: Record<string, unknown>;
}

// ============================================
// MOCK OBC DATA (will be replaced by AI analysis)
// ============================================
const MOCK_OBC_ITEMS: OBCComplianceItem[] = [
  {
    section: "9.1",
    title: "General Requirements",
    excerpt: "OBC 2024 - 9.1 General Requirements Part 9 applies to buildings used for major occupancies classified as Group C (residential)...",
    relevance: 88,
    status: "pass",
  },
  {
    section: "9.1.1",
    title: "Application of Part 9",
    excerpt: "OBC 2024 - 9.4.1 Application of Part 9 This Part applies to the construction, renovation, and demolition of buildings...",
    relevance: 87,
    status: "pass",
  },
  {
    section: "9.8.2",
    title: "Structural Design - Loads",
    excerpt: "OBC 2024 - 9.8.2 Structural Design - Load Design loads for residential buildings in Ontario vary by municipality...",
    relevance: 86,
    status: "warning",
    details: "Verify load calculations with structural engineer",
  },
  {
    section: "9.6.1",
    title: "Floor Framing Requirements",
    excerpt: "OBC 2024 - 9.6.1 Floor Framing Requirements Floor joists must be sized per span tables in the OBC...",
    relevance: 85,
    status: "pass",
  },
  {
    section: "9.7.2.1",
    title: "Window Standards",
    excerpt: "Windows must conform to CAN/CSA-A440 for airtightness, water tightness, and wind load resistance.",
    relevance: 82,
    status: "fail",
    details: "Custom-built wood windows may not meet performance standards for new construction.",
  },
];

// ============================================
// COMPONENT
// ============================================
export function VisualIntelligenceDashboard({
  isOpen,
  onClose,
  projectId,
  projectContext,
}: VisualIntelligenceDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [assets, setAssets] = useState<VisualAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<VisualAsset | null>(null);
  const [activeTab, setActiveTab] = useState<"gallery" | "blueprint">("gallery");
  const [obcItems, setObcItems] = useState<OBCComplianceItem[]>(MOCK_OBC_ITEMS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Load project documents
  useEffect(() => {
    if (isOpen && projectId) {
      loadVisualAssets();
    }
  }, [isOpen, projectId]);

  const loadVisualAssets = async () => {
    setIsLoading(true);
    try {
      // Fetch project documents
      const { data: docs, error } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;

      // Get signed URLs for each document
      const assetsWithUrls: VisualAsset[] = await Promise.all(
        (docs || []).map(async (doc) => {
          // Determine asset type
          let type: "blueprint" | "site_photo" | "document" = "document";
          const lowerName = doc.file_name.toLowerCase();
          if (lowerName.includes("blueprint") || lowerName.includes("floor") || lowerName.includes("plan")) {
            type = "blueprint";
          } else if (doc.mime_type?.startsWith("image/")) {
            type = "site_photo";
          }

          // Get signed URL
          let signedUrl = "";
          try {
            const { data: urlData } = await supabase.storage
              .from("project-documents")
              .createSignedUrl(doc.file_path, 3600);
            signedUrl = urlData?.signedUrl || "";
          } catch {
            // Fallback - might be in blueprints bucket
            try {
              const { data: urlData } = await supabase.storage
                .from("blueprints")
                .createSignedUrl(doc.file_path, 3600);
              signedUrl = urlData?.signedUrl || "";
            } catch {
              // ignore
            }
          }

          return {
            id: doc.id,
            url: doc.file_path,
            signedUrl,
            name: doc.file_name,
            type,
            uploadedAt: doc.uploaded_at,
            aiAnalysis: doc.ai_analysis_result
              ? {
                  status: "complete" as const,
                  summary: (doc.ai_analysis_result as any)?.summary || "Analysis complete",
                  detectedObjects: (doc.ai_analysis_result as any)?.detected_objects || [],
                  progressMatch: (doc.ai_analysis_result as any)?.progress_match || 75,
                  obcFlags: (doc.ai_analysis_result as any)?.obc_flags || [],
                  confidence: (doc.ai_analysis_result as any)?.confidence || 85,
                }
              : { status: "pending" as const },
          };
        })
      );

      setAssets(assetsWithUrls);
      
      // Auto-select first blueprint or site photo
      const firstVisual = assetsWithUrls.find(a => a.type === "blueprint" || a.type === "site_photo");
      if (firstVisual) setSelectedAsset(firstVisual);
      
    } catch (err) {
      console.error("Error loading visual assets:", err);
      toast.error("Failed to load visual assets");
    } finally {
      setIsLoading(false);
    }
  };

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    toast.info("Gemini Visual Intelligence is analyzing your assets...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-engine-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            reportType: "gemini-visual",
            projectId,
            projectContext: {
              ...projectContext,
              visualAssets: assets.map(a => ({
                name: a.name,
                type: a.type,
                url: a.signedUrl,
              })),
            },
          }),
        }
      );

      if (!response.ok) throw new Error("Analysis failed");

      // Process streaming response would go here
      // For now, simulate analysis completion
      await new Promise(r => setTimeout(r, 2000));

      // Update assets with mock analysis
      setAssets(prev => prev.map(asset => ({
        ...asset,
        aiAnalysis: {
          status: "complete" as const,
          summary: `Analyzed ${asset.name}: ${asset.type === "blueprint" ? "Floor plan detected with structural elements" : "Site progress captured"}`,
          detectedObjects: asset.type === "blueprint" 
            ? ["Floor Plan", "Room Layout", "Electrical Points", "Plumbing Lines"]
            : ["Framing", "Foundation", "Workers", "Equipment"],
          progressMatch: Math.floor(Math.random() * 30) + 70,
          obcFlags: asset.type === "blueprint" ? ["9.6.1 - Floor Joist Spacing"] : [],
          confidence: Math.floor(Math.random() * 15) + 80,
        },
      })));

      toast.success("Visual analysis complete!");
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error("Analysis failed - please try again");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadReport = () => {
    // Generate markdown report
    const report = `# Visual Intelligence Report
Generated: ${new Date().toISOString()}
Project ID: ${projectId}

## Visual Assets Summary
${assets.map(a => `- **${a.name}** (${a.type}): ${a.aiAnalysis?.summary || "Pending analysis"}`).join("\n")}

## OBC Compliance Matrix
${obcItems.map(item => `### ${item.section} - ${item.title}
Status: ${item.status.toUpperCase()}
Relevance: ${item.relevance}%
${item.details ? `Notes: ${item.details}` : ""}`).join("\n\n")}
`;

    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visual-intelligence-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "fail":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      fail: "bg-red-500/20 text-red-400 border-red-500/30",
      pending: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    };
    return colors[status] || colors.pending;
  };

  // Filter assets by type
  const blueprints = assets.filter(a => a.type === "blueprint");
  const sitePhotos = assets.filter(a => a.type === "site_photo");

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
          />

          {/* Dashboard Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-2 md:inset-4 lg:inset-6 z-[101] flex flex-col rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black border border-white/10"
          >
            {/* Header */}
            <div className="shrink-0 p-3 md:p-4 border-b border-white/10 bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-teal-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        "0 0 20px 5px rgba(6,182,212,0.2)",
                        "0 0 30px 10px rgba(6,182,212,0.4)",
                        "0 0 20px 5px rgba(6,182,212,0.2)",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 via-cyan-400 to-teal-400 shadow-lg shadow-cyan-500/40"
                  >
                    <img src={engineGeminiImg} alt="Gemini" className="w-8 h-8 object-contain" />
                  </motion.div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                      M.E.S.S.A. Visual Intelligence
                      <Badge className="bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 text-white border-0 text-xs">
                        Gemini Engine
                      </Badge>
                    </h2>
                    <p className="text-xs text-white/60">Multi-Engine Synthesis & Structural Analysis</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runAiAnalysis}
                    disabled={isAnalyzing || assets.length === 0}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    {isAnalyzing ? "Analyzing..." : "Run Analysis"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadReport}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content - Hybrid Layout */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* LEFT PANEL: Photo Gallery with AI Analysis */}
              <div className="w-full lg:w-1/2 border-r border-white/10 flex flex-col">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "gallery" | "blueprint")} className="flex-1 flex flex-col">
                  <TabsList className="m-3 mb-0 bg-white/5 border border-white/10">
                    <TabsTrigger value="gallery" className="data-[state=active]:bg-white/10 text-white/70 data-[state=active]:text-white">
                      <Camera className="h-4 w-4 mr-2" />
                      Site Photos ({sitePhotos.length})
                    </TabsTrigger>
                    <TabsTrigger value="blueprint" className="data-[state=active]:bg-white/10 text-white/70 data-[state=active]:text-white">
                      <FileImage className="h-4 w-4 mr-2" />
                      Blueprints ({blueprints.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="gallery" className="flex-1 m-0 p-3 overflow-hidden">
                    <ScrollArea className="h-full">
                      {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                        </div>
                      ) : sitePhotos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-white/40">
                          <Camera className="h-12 w-12 mb-2" />
                          <p>No site photos uploaded</p>
                          <p className="text-xs mt-1">Upload photos in Stage 5 to enable visual analysis</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {sitePhotos.map((photo, idx) => (
                            <motion.div
                              key={photo.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={cn(
                                "relative rounded-xl overflow-hidden border border-white/10 bg-white/5 cursor-pointer group",
                                selectedAsset?.id === photo.id && "ring-2 ring-cyan-400"
                              )}
                              onClick={() => setSelectedAsset(photo)}
                            >
                              {/* Image */}
                              <div className="aspect-video relative">
                                {photo.signedUrl ? (
                                  <img
                                    src={photo.signedUrl}
                                    alt={photo.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                    <ImageIcon className="h-12 w-12 text-slate-600" />
                                  </div>
                                )}
                                {/* Zoom overlay */}
                                <div 
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex(sitePhotos.indexOf(photo));
                                    setLightboxOpen(true);
                                  }}
                                >
                                  <ZoomIn className="h-8 w-8 text-white" />
                                </div>
                              </div>

                              {/* AI Analysis Card */}
                              <div className="p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-white truncate flex-1 mr-2">
                                    {photo.name}
                                  </span>
                                  {photo.aiAnalysis?.status === "complete" ? (
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                                      Analyzed
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">
                                      Pending
                                    </Badge>
                                  )}
                                </div>

                                {photo.aiAnalysis?.status === "complete" && (
                                  <>
                                    {/* Progress Match */}
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-white/60">Progress Match</span>
                                        <span className="text-cyan-400 font-medium">{photo.aiAnalysis.progressMatch}%</span>
                                      </div>
                                      <Progress 
                                        value={photo.aiAnalysis.progressMatch} 
                                        className="h-1.5 bg-white/10"
                                      />
                                    </div>

                                    {/* Detected Objects */}
                                    {photo.aiAnalysis.detectedObjects && photo.aiAnalysis.detectedObjects.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {photo.aiAnalysis.detectedObjects.slice(0, 3).map((obj, i) => (
                                          <Badge key={i} variant="outline" className="text-xs bg-white/5 border-white/20 text-white/70">
                                            {obj}
                                          </Badge>
                                        ))}
                                        {photo.aiAnalysis.detectedObjects.length > 3 && (
                                          <Badge variant="outline" className="text-xs bg-white/5 border-white/20 text-white/50">
                                            +{photo.aiAnalysis.detectedObjects.length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                    )}

                                    {/* OBC Flags */}
                                    {photo.aiAnalysis.obcFlags && photo.aiAnalysis.obcFlags.length > 0 && (
                                      <div className="flex items-center gap-1 text-xs text-amber-400">
                                        <AlertTriangle className="h-3 w-3" />
                                        <span>{photo.aiAnalysis.obcFlags.length} OBC flag(s)</span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="blueprint" className="flex-1 m-0 p-3 overflow-hidden">
                    <ScrollArea className="h-full">
                      {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                        </div>
                      ) : blueprints.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-white/40">
                          <FileImage className="h-12 w-12 mb-2" />
                          <p>No blueprints uploaded</p>
                          <p className="text-xs mt-1">Upload blueprints in Stage 5 for floor plan analysis</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {blueprints.map((bp, idx) => (
                            <motion.div
                              key={bp.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={cn(
                                "relative rounded-xl overflow-hidden border border-white/10 bg-white/5 cursor-pointer",
                                selectedAsset?.id === bp.id && "ring-2 ring-cyan-400"
                              )}
                              onClick={() => setSelectedAsset(bp)}
                            >
                              <div className="flex items-start gap-4 p-4">
                                {/* Thumbnail */}
                                <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                                  {bp.signedUrl ? (
                                    <img src={bp.signedUrl} alt={bp.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Layers className="h-8 w-8 text-slate-600" />
                                    </div>
                                  )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-white truncate">{bp.name}</span>
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                      Blueprint
                                    </Badge>
                                  </div>

                                  {bp.aiAnalysis?.status === "complete" ? (
                                    <>
                                      <p className="text-xs text-white/60 line-clamp-2">{bp.aiAnalysis.summary}</p>
                                      <div className="flex flex-wrap gap-1">
                                        {bp.aiAnalysis.detectedObjects?.slice(0, 4).map((obj, i) => (
                                          <Badge key={i} variant="outline" className="text-xs bg-white/5 border-white/20 text-white/70">
                                            {obj}
                                          </Badge>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-xs text-white/40">Click "Run Analysis" to extract floor plan data</p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>

              {/* RIGHT PANEL: Blueprint Overlay + OBC Matrix */}
              <div className="w-full lg:w-1/2 flex flex-col overflow-hidden">
                {/* Blueprint Preview */}
                <div className="h-1/2 border-b border-white/10 p-3">
                  <div className="h-full rounded-xl overflow-hidden bg-slate-800/50 border border-white/10 relative">
                    {selectedAsset?.signedUrl ? (
                      <>
                        <img
                          src={selectedAsset.signedUrl}
                          alt={selectedAsset.name}
                          className="w-full h-full object-contain"
                        />
                        {/* Overlay indicators could go here */}
                        <div className="absolute top-2 left-2 flex items-center gap-2">
                          <Badge className="bg-black/60 text-white border-white/20">
                            <Eye className="h-3 w-3 mr-1" />
                            {selectedAsset.type === "blueprint" ? "Blueprint" : "Site Photo"}
                          </Badge>
                        </div>
                        <div className="absolute bottom-2 right-2 flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 bg-black/60 text-white hover:bg-black/80"
                            onClick={() => {
                              setLightboxIndex(assets.indexOf(selectedAsset));
                              setLightboxOpen(true);
                            }}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/40">
                        <Building2 className="h-16 w-16 mb-3" />
                        <p>Select an asset to preview</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* OBC Compliance Matrix */}
                <div className="flex-1 p-3 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-orange-400" />
                      <h3 className="text-sm font-semibold text-white">OBC 2024 Compliance Matrix</h3>
                    </div>
                    <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                      {obcItems.filter(i => i.status === "pass").length}/{obcItems.length} Passing
                    </Badge>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="space-y-2">
                      {obcItems.map((item, idx) => (
                        <motion.div
                          key={item.section}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={cn(
                            "rounded-lg border p-3 space-y-2",
                            item.status === "pass" && "bg-emerald-500/5 border-emerald-500/20",
                            item.status === "warning" && "bg-amber-500/5 border-amber-500/20",
                            item.status === "fail" && "bg-red-500/5 border-red-500/20",
                            item.status === "pending" && "bg-slate-500/5 border-slate-500/20"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              {getStatusIcon(item.status)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs bg-white/5 border-white/20 text-cyan-400">
                                    § {item.section}
                                  </Badge>
                                  <span className="text-sm font-medium text-white truncate">{item.title}</span>
                                </div>
                                <p className="text-xs text-white/50 mt-1 line-clamp-2">{item.excerpt}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <Badge className={cn("text-xs", getStatusBadge(item.status))}>
                                {item.status.toUpperCase()}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <Progress value={item.relevance} className="w-16 h-1 bg-white/10" />
                                <span className="text-xs text-white/40">{item.relevance}%</span>
                              </div>
                            </div>
                          </div>

                          {item.details && (
                            <div className={cn(
                              "text-xs p-2 rounded border-l-2",
                              item.status === "warning" && "bg-amber-500/10 border-amber-500 text-amber-300",
                              item.status === "fail" && "bg-red-500/10 border-red-500 text-red-300"
                            )}>
                              ⚠️ {item.details}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 p-3 border-t border-white/10 bg-black/30">
              <div className="flex items-center justify-between text-xs text-white/40">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                  Powered by Gemini Visual AI Engine
                </span>
                <span>BuildUnion M.E.S.S.A. Visual Intelligence Platform</span>
              </div>
            </div>
          </motion.div>

          {/* Lightbox */}
          <AnimatePresence>
            {lightboxOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
                onClick={() => setLightboxOpen(false)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-white/60 hover:text-white"
                  onClick={() => setLightboxOpen(false)}
                >
                  <X className="h-6 w-6" />
                </Button>

                {/* Navigation */}
                {assets.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 text-white/60 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(prev => prev > 0 ? prev - 1 : assets.length - 1);
                      }}
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 text-white/60 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(prev => prev < assets.length - 1 ? prev + 1 : 0);
                      }}
                    >
                      <ChevronRight className="h-8 w-8" />
                    </Button>
                  </>
                )}

                {/* Image */}
                {assets[lightboxIndex]?.signedUrl && (
                  <img
                    src={assets[lightboxIndex].signedUrl}
                    alt={assets[lightboxIndex].name}
                    className="max-w-[90vw] max-h-[90vh] object-contain"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}

                {/* Caption */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-lg">
                  <p className="text-white text-sm">{assets[lightboxIndex]?.name}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

export default VisualIntelligenceDashboard;
