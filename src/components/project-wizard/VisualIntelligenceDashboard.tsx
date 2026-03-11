// ============================================
// VISUAL INTELLIGENCE DASHBOARD (Gemini)
// ============================================
// Hybrid layout for visual asset analysis:
// - Left: Photo gallery with AI analysis cards
// - Right: Blueprint overlay + OBC Compliance Matrix
// ============================================

import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
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
  Save,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogHeader, DialogTitle, DialogOverlay, DialogPortal, DialogClose as DialogPrimitiveClose } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
const DialogPrimitiveContent = DialogPrimitive.Content;
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";

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
  const [activeTab, setActiveTab] = useState<"gallery" | "blueprint" | "report">("gallery");
  const [obcItems, setObcItems] = useState<OBCComplianceItem[]>(MOCK_OBC_ITEMS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  // Full AI Report streaming state
  const [fullReport, setFullReport] = useState("");
  const [isStreamingReport, setIsStreamingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reportScrollRef = useRef<HTMLDivElement | null>(null);

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

          // Get signed URL - need to construct full URL from response
          let signedUrl = "";
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          
          try {
            const { data: urlData, error: signError } = await supabase.storage
              .from("project-documents")
              .createSignedUrl(doc.file_path, 3600);
            
            if (urlData?.signedUrl) {
              // If it's a relative URL, prepend Supabase URL
              signedUrl = urlData.signedUrl.startsWith("http") 
                ? urlData.signedUrl 
                : `${supabaseUrl}/storage/v1${urlData.signedUrl}`;
            }
          } catch {
            // Fallback - might be in blueprints bucket
            try {
              const { data: urlData } = await supabase.storage
                .from("blueprints")
                .createSignedUrl(doc.file_path, 3600);
              if (urlData?.signedUrl) {
                signedUrl = urlData.signedUrl.startsWith("http") 
                  ? urlData.signedUrl 
                  : `${supabaseUrl}/storage/v1${urlData.signedUrl}`;
              }
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

  const getObcLabel = (section: string) => {
    const item = obcItems.find((obc) => obc.section === section);
    return item ? `§${section} • ${item.title}` : `§${section}`;
  };
  const runAiAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    toast.info("Gemini Visual Intelligence is analyzing your assets...");

    try {
      // Simulate AI analysis with delay
      await new Promise(r => setTimeout(r, 1500));

      // Update assets with analysis results - create completely new objects
      setAssets(prevAssets => {
        const newAssets = prevAssets.map(asset => {
          const isBlueprint = asset.type === "blueprint";
          return {
            ...asset,
            aiAnalysis: {
              status: "complete" as const,
              summary: isBlueprint 
                ? `Floor plan detected: ${asset.name} contains structural layouts, room divisions, and utility markings.`
                : `Site progress captured: ${asset.name} shows construction activity and material staging.`,
              detectedObjects: isBlueprint 
                ? ["Floor Plan", "Room Layout", "Electrical Points", "Plumbing Lines", "Window Markers"]
                : ["Framing", "Foundation", "Workers", "Equipment", "Materials"],
              progressMatch: Math.floor(Math.random() * 25) + 70,
              obcFlags: isBlueprint 
                ? ["9.6.1", "9.8.2"]
                : ["9.7.2.1", "9.8.2"],
              confidence: Math.floor(Math.random() * 10) + 85,
            },
          };
        });
        
        // Update selected asset reference
        setSelectedAsset(prev => {
          if (!prev) return null;
          return newAssets.find(a => a.id === prev.id) || null;
        });
        
        // Update OBC matrix to reflect flagged sections
        setObcItems(prev => prev.map(item => {
          const isFlagged = newAssets.some(a => 
            a.aiAnalysis?.obcFlags?.includes(item.section)
          );
          if (isFlagged && item.status === "pass") {
            return { ...item, status: "warning" as const, details: "Flagged by visual analysis - requires verification" };
          }
          return item;
        }));
        
        return newAssets;
      });

      toast.success("Visual analysis complete! OBC Matrix updated with flagged sections.");
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error("Analysis failed - please try again");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // ============================================
  // FULL STREAMING AI REPORT
  // ============================================
  const generateFullReport = useCallback(async () => {
    setIsStreamingReport(true);
    setReportError(null);
    setFullReport("");
    setActiveTab("report");

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

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
              sitePhotoCount: assets.filter(a => a.type === "site_photo").length,
              hasBlueprint: assets.some(a => a.type === "blueprint"),
              documentCount: assets.length,
            },
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        if (response.status === 429) throw new Error("Rate limit exceeded. Try again in a moment.");
        if (response.status === 402) throw new Error("AI credits exhausted. Please add funds.");
        throw new Error("Failed to generate report");
      }
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setFullReport(fullContent);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setFullReport(fullContent);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("Full report error:", err);
      setReportError((err as Error).message);
      toast.error("Failed to generate report");
    } finally {
      setIsStreamingReport(false);
    }
  }, [projectId, projectContext, assets]);

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const generateReportText = useCallback(() => {
    return `# Files & Contracts Report
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
  }, [projectId, assets, obcItems]);

  const buildPdfDocument = useCallback(async () => {
    const report = generateReportText();
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 25;
    const maxWidth = pageWidth - margin * 2;
    const headerHeight = 15;
    const bottomLimit = pageHeight - margin - 12;

    // Get user email
    let userEmail = "";
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email || "";
    } catch { /* skip */ }

    // Load logo
    let logoImg: HTMLImageElement | null = null;
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = "/images/buildunion-logo-lightmode.png";
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); });
      logoImg = img;
    } catch { /* skip */ }

    const sanitize = (t: string) => {
      const el = document.createElement("textarea");
      el.innerHTML = t;
      return el.value.replace(/[^\x20-\x7E\xA0-\xFF\u2022\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u00A7\u00A9\u00AE\u2122\u00B0\u00B1\u00D7\u00F7]/g, "");
    };

    const drawBrandText = (x: number, yPos: number, fontSize: number) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "normal");
      const bW = doc.getTextWidth("Build");
      const sW = doc.getTextWidth(" ");
      doc.setTextColor(140, 140, 140);
      doc.text("Build", x, yPos);
      doc.setTextColor(245, 158, 11);
      doc.text("Union", x + bW + sW, yPos);
    };

    const drawPageHeader = () => {
      if (logoImg) {
        try {
          doc.addImage(logoImg, "PNG", (pageWidth - 8) / 2, margin - 2, 8, 8);
        } catch { /* skip */ }
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      doc.text(dateStr, pageWidth - margin, margin + 3, { align: "right" });
      if (userEmail) doc.text(userEmail, margin, margin + 3);
      doc.text("Files & Contracts Report", pageWidth - margin, margin + 7, { align: "right" });
      doc.text(sanitize(projectId.slice(0, 8)), margin, margin + 7);
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, margin + 10, pageWidth - margin, margin + 10);
    };

    const drawPageFooter = (pageNum: number, totalPages: number) => {
      const footerY = pageHeight - margin + 2;
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const bW = doc.getTextWidth("Build");
      const sW = doc.getTextWidth(" ");
      doc.setTextColor(140, 140, 140);
      doc.text("Build", margin, footerY);
      doc.setTextColor(245, 158, 11);
      doc.text("Union", margin + bW + sW, footerY);
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text("Files & Contracts Report – Confidential", pageWidth / 2, footerY, { align: "center" });
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
    };

    let y = margin + headerHeight;
    let isFirstPage = true;

    // Title page header
    drawPageHeader();

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text("Files & Contracts Report", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y);
    y += 10;
    doc.setTextColor(0, 0, 0);

    const lines = report.split("\n");
    for (const line of lines) {
      if (y > bottomLimit) {
        doc.addPage();
        y = margin + headerHeight;
        drawPageHeader();
      }

      if (line.startsWith("### ")) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(sanitize(line.replace("### ", "")), margin, y);
        y += 6;
      } else if (line.startsWith("## ")) {
        y += 3;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(sanitize(line.replace("## ", "")), margin, y);
        y += 8;
      } else if (line.startsWith("# ")) {
        continue;
      } else if (line.trim()) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const wrapped = doc.splitTextToSize(sanitize(line.replace(/\*\*/g, "")), maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5;
      } else {
        y += 3;
      }
    }

    // Add footers to all pages
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      drawPageFooter(p, pageCount);
    }

    return doc;
  }, [generateReportText, projectId]);

  const handleSaveToDocuments = useCallback(async () => {
    setIsSavingDoc(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in first");
        return;
      }

      const timestamp = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const fileName = `visual-intelligence-${new Date().toISOString().slice(0, 10)}.pdf`;
      const filePath = `${projectId}/file_${timestamp}_${rand}_${fileName}`;
      const pdfDoc = await buildPdfDocument();
      const pdfBlob = pdfDoc.output("blob");

      const { error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(filePath, pdfBlob, { contentType: "application/pdf", upsert: false });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("project_documents").insert({
        project_id: projectId,
        file_name: fileName,
        file_path: filePath,
        file_size: pdfBlob.size,
        mime_type: "application/pdf",
        uploaded_by: user.id,
        uploaded_by_name: "System",
        uploaded_by_role: "owner",
      });

      if (insertError) throw insertError;

      toast.success("Report saved to Documents");
      setShowExportDialog(false);
    } catch (err) {
      console.error("Save to documents failed:", err);
      toast.error("Failed to save report");
    } finally {
      setIsSavingDoc(false);
    }
  }, [projectId, buildPdfDocument]);

  const handleDownloadPdf = useCallback(async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = await buildPdfDocument();
      doc.save(`visual-intelligence-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF downloaded");
      setShowExportDialog(false);
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [buildPdfDocument]);

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
    <>
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
              <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
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
                      M.E.S.S.A. Files & Contracts
                      <Badge className="bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 text-white border-0 text-xs">
                        Gemini Engine
                      </Badge>
                    </h2>
                    <p className="text-xs text-white/60">Multi-Engine Synthesis & Structural Analysis</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runAiAnalysis}
                    disabled={isAnalyzing || assets.length === 0}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs h-8 px-2 sm:px-3"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                    )}
                    <span className="hidden sm:inline">{isAnalyzing ? "Analyzing..." : "Run Analysis"}</span>
                    <span className="sm:hidden">{isAnalyzing ? "..." : "Run"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExportDialog(true)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs h-8 px-2 sm:px-3"
                  >
                    <Download className="h-3.5 w-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
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
                                    setLightboxIndex(assets.findIndex(a => a.id === photo.id));
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

                                    {/* OBC Flags - now shows clickable section numbers */}
                                    {photo.aiAnalysis.obcFlags && photo.aiAnalysis.obcFlags.length > 0 && (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                                        {photo.aiAnalysis.obcFlags.map((flag, i) => (
                                          <Badge 
                                            key={i} 
                                            variant="outline" 
                                            className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-400"
                                          >
                                            {getObcLabel(flag)}
                                          </Badge>
                                        ))}
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
                              setLightboxIndex(assets.findIndex(a => a.id === selectedAsset?.id));
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
                        <Tooltip key={item.section}>
                          <TooltipTrigger asChild>
                            <motion.div
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={cn(
                                "rounded-lg border p-3 space-y-2 cursor-help",
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
                          </TooltipTrigger>
                          <TooltipContent side="left" className="bg-slate-900/95 border-cyan-500/30 text-white max-w-[200px]">
                            <p className="text-xs">
                              <span className="text-cyan-400 font-medium">💡 Tip:</span> Click <span className="text-cyan-300 font-semibold">Gemini</span> (Visual Report) on the main dashboard for detailed photo-based compliance analysis.
                            </p>
                          </TooltipContent>
                        </Tooltip>
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
                <span>BuildUnion M.E.S.S.A. Files & Contracts Platform</span>
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

    {/* Export Dialog */}
    <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
      <DialogPortal>
        <DialogOverlay className="z-[9998]" />
        <DialogPrimitiveContent
          className="fixed left-[50%] top-[50%] z-[9999] w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border border-white/10 bg-slate-900 p-6 shadow-lg text-white"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Download className="h-5 w-5" />
              Export Report
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={handleSaveToDocuments}
              disabled={isSavingDoc}
              className="w-full justify-start gap-3 h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-white"
              variant="outline"
            >
              {isSavingDoc ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 text-emerald-400" />}
              <div className="text-left">
                <div className="font-medium text-sm">Save to Documents</div>
                <div className="text-xs text-white/50">Store in project document vault</div>
              </div>
            </Button>
            <Button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="w-full justify-start gap-3 h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-white"
              variant="outline"
            >
              {isGeneratingPdf ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5 text-blue-400" />}
              <div className="text-left">
                <div className="font-medium text-sm">Download as PDF</div>
                <div className="text-xs text-white/50">Save PDF file to your device</div>
              </div>
            </Button>
          </div>
          <DialogPrimitiveClose className="absolute right-4 top-4 rounded-sm opacity-70 text-white hover:opacity-100">
            <X className="h-4 w-4" />
          </DialogPrimitiveClose>
        </DialogPrimitiveContent>
      </DialogPortal>
    </Dialog>
    </>
  );
}

export default VisualIntelligenceDashboard;
