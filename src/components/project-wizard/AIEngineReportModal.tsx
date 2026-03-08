// ============================================
// AI ENGINE REPORT MODAL
// ============================================
// Streaming AI reports triggered by AI icon clicks
// - Gemini: Visual Intelligence Dashboard (hybrid visual layout)
// - GPT: Data Audit  
// - Claude: OBC Compliance
// - Lovable: DNA Integrity
// - Grok: Cost Insights
// ============================================

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";
import {
  X,
  Loader2,
  Download,
  RefreshCw,
  Sparkles,
  Brain,
  Shield,
  Heart,
  Zap,
  Eye,
  Save,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VisualIntelligenceDashboard } from "./VisualIntelligenceDashboard";

// Import engine images
import engineGeminiImg from "@/assets/engine-gemini.png";
import engineGptImg from "@/assets/engine-gpt.png";
import engineClaudeImg from "@/assets/engine-claude.png";
import engineLovableImg from "@/assets/engine-lovable.png";
import engineGrokImg from "@/assets/engine-grok.png";

export type AIEngineType = 
  | "gemini-visual"
  | "gpt-audit"
  | "claude-obc"
  | "lovable-dna"
  | "grok-insights";

interface AIEngineConfig {
  type: AIEngineType;
  name: string;
  subtitle: string;
  icon: React.ElementType;
  image: string;
  gradient: string;
  glowColor: string;
}

const ENGINE_CONFIGS: Record<AIEngineType, AIEngineConfig> = {
  "gemini-visual": {
    type: "gemini-visual",
    name: "Gemini",
    subtitle: "Visual Intelligence Report",
    icon: Eye,
    image: engineGeminiImg,
    gradient: "from-blue-500 via-cyan-400 to-teal-400",
    glowColor: "shadow-cyan-500/40",
  },
  "gpt-audit": {
    type: "gpt-audit",
    name: "GPT",
    subtitle: "Project Data Audit",
    icon: Brain,
    image: engineGptImg,
    gradient: "from-emerald-500 via-green-400 to-lime-400",
    glowColor: "shadow-emerald-500/40",
  },
  "claude-obc": {
    type: "claude-obc",
    name: "Claude",
    subtitle: "OBC Compliance Analysis",
    icon: Shield,
    image: engineClaudeImg,
    gradient: "from-orange-500 via-amber-400 to-yellow-400",
    glowColor: "shadow-orange-500/40",
  },
  "lovable-dna": {
    type: "lovable-dna",
    name: "Lovable",
    subtitle: "DNA Integrity Scan",
    icon: Heart,
    image: engineLovableImg,
    gradient: "from-pink-500 via-rose-400 to-red-400",
    glowColor: "shadow-pink-500/40",
  },
  "grok-insights": {
    type: "grok-insights",
    name: "Grok",
    subtitle: "Cost Optimization Insights",
    icon: Zap,
    image: engineGrokImg,
    gradient: "from-slate-400 via-gray-300 to-zinc-400",
    glowColor: "shadow-slate-500/40",
  },
};

interface AIEngineReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  engineType: AIEngineType;
  projectId: string;
  projectContext: Record<string, unknown>;
}

export function AIEngineReportModal({
  isOpen,
  onClose,
  engineType,
  projectId,
  projectContext,
}: AIEngineReportModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const config = ENGINE_CONFIGS[engineType];

  // Generate report on open
  useEffect(() => {
    if (isOpen && !reportContent && !isLoading) {
      generateReport();
    }
  }, [isOpen]);

  const generateReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setReportContent("");

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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
            reportType: engineType,
            projectId,
            projectContext,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a moment.");
        }
        if (response.status === 402) {
          throw new Error("AI credits exhausted. Please add funds to continue.");
        }
        throw new Error("Failed to generate report");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

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
              setReportContent(fullContent);
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
              setReportContent(fullContent);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("Report generation error:", err);
      setError((err as Error).message || "Failed to generate report");
      toast.error("Failed to generate report");
    } finally {
      setIsLoading(false);
    }
  }, [engineType, projectId, projectContext]);

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setReportContent("");
    setError(null);
    onClose();
  };

  // ============================================
  // PDF DOWNLOAD
  // ============================================
  const handleDownloadPdf = useCallback(() => {
    if (!reportContent) return;
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;
      let y = 20;

      const addNewPageIfNeeded = (neededSpace: number) => {
        if (y + neededSpace > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
      };

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(30, 30, 30);
      doc.text(`${config.name} — ${config.subtitle}`, margin, y);
      y += 10;

      // Date
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated: ${new Date().toLocaleString()} • Project: ${(projectContext.projectName as string) || "N/A"}`, margin, y);
      y += 4;

      // Separator
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Parse markdown lines
      const lines = reportContent.split("\n");
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          y += 3;
          continue;
        }

        // H2 headers
        if (line.startsWith("## ")) {
          addNewPageIfNeeded(14);
          y += 4;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          doc.setTextColor(40, 40, 40);
          const headerText = line.replace(/^## /, "").replace(/[#*_]/g, "");
          const wrapped = doc.splitTextToSize(headerText, maxWidth);
          doc.text(wrapped, margin, y);
          y += wrapped.length * 6 + 3;
          doc.setDrawColor(220, 220, 220);
          doc.line(margin, y - 1, margin + 60, y - 1);
          continue;
        }

        // H3 headers
        if (line.startsWith("### ")) {
          addNewPageIfNeeded(10);
          y += 2;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(60, 60, 60);
          const headerText = line.replace(/^### /, "").replace(/[#*_]/g, "");
          const wrapped = doc.splitTextToSize(headerText, maxWidth);
          doc.text(wrapped, margin, y);
          y += wrapped.length * 5 + 2;
          continue;
        }

        // H1 headers
        if (line.startsWith("# ")) {
          addNewPageIfNeeded(16);
          y += 4;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.setTextColor(20, 20, 20);
          const headerText = line.replace(/^# /, "").replace(/[#*_]/g, "");
          const wrapped = doc.splitTextToSize(headerText, maxWidth);
          doc.text(wrapped, margin, y);
          y += wrapped.length * 7 + 4;
          continue;
        }

        // Bullet points
        if (line.startsWith("- ") || line.startsWith("* ")) {
          addNewPageIfNeeded(8);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          const bulletText = line.replace(/^[-*] /, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/[*_]/g, "");
          const wrapped = doc.splitTextToSize(`• ${bulletText}`, maxWidth - 4);
          doc.text(wrapped, margin + 4, y);
          y += wrapped.length * 4.5 + 1;
          continue;
        }

        // Checkbox items
        if (line.startsWith("- [ ]") || line.startsWith("- [x]") || line.startsWith("- [X]")) {
          addNewPageIfNeeded(8);
          const checked = line.startsWith("- [x]") || line.startsWith("- [X]");
          const itemText = line.replace(/^- \[.\] /, "").replace(/\*\*(.*?)\*\*/g, "$1");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          const prefix = checked ? "☑" : "☐";
          const wrapped = doc.splitTextToSize(`${prefix} ${itemText}`, maxWidth - 4);
          doc.text(wrapped, margin + 4, y);
          y += wrapped.length * 4.5 + 1;
          continue;
        }

        // Regular paragraphs
        addNewPageIfNeeded(8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const cleanLine = line.replace(/\*\*(.*?)\*\*/g, "$1").replace(/[*_]/g, "");
        const wrapped = doc.splitTextToSize(cleanLine, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 4.5 + 1;
      }

      // Footer on each page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `BuildUnion ${config.name} Report • Page ${i}/${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      doc.save(`${config.name}-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [reportContent, config, projectContext]);

  // ============================================
  // SAVE TO DOCUMENTS
  // ============================================
  const handleSaveToDocuments = useCallback(async () => {
    if (!reportContent) return;
    setIsSavingDoc(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in first");
        return;
      }

      const timestamp = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const fileName = `${config.name.toLowerCase()}-report-${new Date().toISOString().slice(0, 10)}.md`;
      const filePath = `${projectId}/file_${timestamp}_${rand}_${fileName}`;
      const blob = new Blob([reportContent], { type: "application/octet-stream" });

      const { error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(filePath, blob, { contentType: "application/octet-stream", upsert: false });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("project_documents").insert({
        project_id: projectId,
        file_name: fileName,
        file_path: filePath,
        file_size: blob.size,
        mime_type: "application/octet-stream",
        uploaded_by: user.id,
        uploaded_by_name: "System",
        uploaded_by_role: "owner",
      });

      if (insertError) throw insertError;

      toast.success(`${config.name} report saved to Documents`);
    } catch (err) {
      console.error("Save to documents failed:", err);
      toast.error("Failed to save report");
    } finally {
      setIsSavingDoc(false);
    }
  }, [reportContent, projectId, config]);

  if (!isOpen) return null;

  // For Gemini Visual, use the dedicated Visual Intelligence Dashboard
  if (engineType === "gemini-visual") {
    return (
      <VisualIntelligenceDashboard
        isOpen={isOpen}
        onClose={handleClose}
        projectId={projectId}
        projectContext={projectContext}
      />
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
          />

          {/* Modal — full-screen on mobile, inset on desktop */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 sm:inset-4 md:inset-8 lg:inset-12 z-[101] flex flex-col rounded-none sm:rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black border-0 sm:border border-white/10"
          >
            {/* Header */}
            <div className="shrink-0 p-3 sm:p-4 md:p-6 border-b border-white/10 bg-black/60 backdrop-blur-md relative overflow-hidden">
              {/* Subtle gradient accent */}
              <div className={cn("absolute inset-0 opacity-15 bg-gradient-to-r", config.gradient)} />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Engine icon */}
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        `0 0 20px 5px hsl(var(--primary) / 0.2)`,
                        `0 0 30px 10px hsl(var(--primary) / 0.4)`,
                        `0 0 20px 5px hsl(var(--primary) / 0.2)`,
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn(
                      "w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0",
                      "bg-gradient-to-br",
                      config.gradient,
                      config.glowColor,
                      "shadow-lg"
                    )}
                  >
                    <img
                      src={config.image}
                      alt={config.name}
                      className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain"
                    />
                  </motion.div>

                  <div className="min-w-0">
                    <h2 className="text-base sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2 truncate" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
                      {config.name}
                      <Badge className={cn(
                        "text-[10px] sm:text-xs shrink-0",
                        "bg-gradient-to-r",
                        config.gradient,
                        "text-white border-0"
                      )}>
                        AI
                      </Badge>
                    </h2>
                    <p className="text-xs sm:text-sm text-white/80 truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{config.subtitle}</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {reportContent && !isLoading && (
                    <>
                      {/* Mobile: icon-only buttons. Desktop: with labels */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateReport}
                        className="bg-white/20 border-white/30 text-white hover:bg-white/30 h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3 font-medium"
                        title="Regenerate"
                      >
                        <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline ml-1">Regenerate</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf}
                        className="bg-white/20 border-white/30 text-white hover:bg-white/30 h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3 font-medium"
                        title="Download PDF"
                      >
                        {isGeneratingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                        <span className="hidden sm:inline ml-1">PDF</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveToDocuments}
                        disabled={isSavingDoc}
                        className="bg-white/20 border-white/30 text-white hover:bg-white/30 h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3 font-medium"
                        title="Save to Documents"
                      >
                        {isSavingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                        <span className="hidden sm:inline ml-1">Save</span>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 p-3 sm:p-4 md:p-6">
              {isLoading && !reportContent && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="h-12 w-12 text-amber-400" />
                  </motion.div>
                  <p className="text-white/60 text-sm text-center">
                    {config.name} is analyzing your project...
                  </p>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                        className={cn("w-2 h-2 rounded-full bg-gradient-to-r", config.gradient)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="text-red-400 text-center px-4">
                    <p className="font-medium text-sm sm:text-base">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateReport}
                      className="mt-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Try Again
                    </Button>
                  </div>
                </div>
              )}

              {reportContent && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="prose prose-invert prose-sm md:prose-base max-w-none"
                >
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-xl sm:text-2xl font-bold text-white mt-6 mb-4 flex items-center gap-2">
                          <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 shrink-0" />
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg sm:text-xl font-semibold text-white/90 mt-5 mb-3 border-b border-white/10 pb-2">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base sm:text-lg font-medium text-white/80 mt-4 mb-2">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-white/70 leading-relaxed mb-3 text-sm sm:text-base">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside text-white/70 space-y-1 mb-3 text-sm sm:text-base">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside text-white/70 space-y-1 mb-3 text-sm sm:text-base">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-white/70 text-sm sm:text-base">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-white font-semibold">{children}</strong>
                      ),
                      code: ({ children }) => (
                        <code className="px-1.5 py-0.5 bg-white/10 rounded text-amber-300 text-xs sm:text-sm">
                          {children}
                        </code>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-amber-500/50 pl-4 italic text-white/60 text-sm sm:text-base">
                          {children}
                        </blockquote>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-3">
                          <table className="w-full border-collapse border border-white/10 text-sm">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-white/10 px-2 py-1 bg-white/5 text-white/80 text-left text-xs sm:text-sm font-semibold">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-white/10 px-2 py-1 text-white/60 text-xs sm:text-sm">
                          {children}
                        </td>
                      ),
                    }}
                  >
                    {reportContent}
                  </ReactMarkdown>

                  {isLoading && (
                    <div className="flex items-center gap-2 text-white/40 mt-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Generating...</span>
                    </div>
                  )}
                </motion.div>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="shrink-0 p-3 sm:p-4 border-t border-white/10 bg-black/30">
              <div className="flex items-center justify-between text-[10px] sm:text-xs text-white/40">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Powered by {config.name} AI Engine
                </span>
                <span>BuildUnion Intelligence Platform</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AIEngineReportModal;
