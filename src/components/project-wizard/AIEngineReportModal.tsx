// ============================================
// AI ENGINE REPORT MODAL
// ============================================
// Streaming AI reports triggered by AI icon clicks
// - Gemini: Files & Contracts Dashboard (hybrid visual layout)
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
    subtitle: "Files & Contracts",
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
  // PDF BUILD / DOWNLOAD — Professional A4 Layout
  // ============================================

  // Sanitize text: decode HTML entities, strip emoji & non-latin1 chars
  const sanitizeText = (text: string): string => {
    // Decode HTML entities (&#x26; → &, &#xA0; → space, etc.)
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    let clean = textarea.value;
    // Remove emoji and chars outside Latin-1 range (jsPDF helvetica supports ~Latin-1)
    clean = clean.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]/gu, "");
    // Replace common unicode with ASCII equivalents
    clean = clean.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
    clean = clean.replace(/\u2013/g, "-").replace(/\u2014/g, "--");
    clean = clean.replace(/\u2026/g, "...");
    clean = clean.replace(/⚠️?/g, "[!]").replace(/✓/g, "[ok]").replace(/✗/g, "[x]");
    clean = clean.replace(/☑/g, "[x]").replace(/☐/g, "[ ]");
    // Strip any remaining non-printable / non-latin1
    clean = clean.replace(/[^\x20-\x7E\xA0-\xFF•–—''""…§©®™°±×÷]/g, "");
    return clean;
  };

  const buildPdfDocument = useCallback(async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth(); // 210
    const pageHeight = doc.internal.pageSize.getHeight(); // 297
    const margin = 25; // 2.5cm all sides
    const maxWidth = pageWidth - margin * 2; // 160mm
    const bottomLimit = pageHeight - margin - 12; // reserve for footer
    const headerHeight = 15; // space for 2-row header + separator
    let y = margin;
    let isFirstPage = true;
    const projectName = sanitizeText((projectContext.projectName as string) || "N/A");
    // Get user email for header
    let userEmail = "";
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email || "";
    } catch { /* skip */ }
    // ── Load logo for header ──
    let logoImg: HTMLImageElement | null = null;
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => { logoImg = img; resolve(); };
        img.onerror = () => resolve(); // graceful fallback
        img.src = "/images/buildunion-logo-lightmode.png";
      });
    } catch { /* logo optional */ }

    // ── Helpers ──
    const currentPageBottom = () => bottomLimit;

    const addNewPageIfNeeded = (neededSpace: number) => {
      if (y + neededSpace > currentPageBottom()) {
        doc.addPage();
        isFirstPage = false;
        y = margin + headerHeight;
        drawPageHeader();
      }
    };

    // Dual-color "Build" (gray) + "Union" (amber) text helper
    const drawBrandText = (x: number, yPos: number, fontSize: number, align?: "left" | "center" | "right") => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "normal");
      const separator = " ";
      const buildText = "Build";
      const unionText = "Union";
      const buildW = doc.getTextWidth(buildText);
      const sepW = doc.getTextWidth(separator);
      const unionW = doc.getTextWidth(unionText);
      const totalW = buildW + sepW + unionW;
      let startX = x;
      if (align === "center") startX = x - totalW / 2;
      else if (align === "right") startX = x - totalW;

      doc.setTextColor(140, 140, 140); // Build — gray
      doc.text(buildText, startX, yPos);
      doc.setTextColor(245, 158, 11); // Union — amber-500
      doc.text(unionText, startX + buildW + sepW, yPos);
    };

    const drawPageHeader = () => {
      // Row 1: Logo centered, date right, email left
      if (logoImg) {
        try {
          const logoW = 8;
          const logoH = 8;
          doc.addImage(logoImg, "PNG", (pageWidth - logoW) / 2, margin - 2, logoW, logoH);
        } catch { /* skip */ }
      }
      // Date right
      const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(dateStr, pageWidth - margin, margin + 3, { align: "right" });
      // Email left
      if (userEmail) {
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 140);
        doc.text(userEmail, margin, margin + 3);
      }

      // Row 2: report type right, project name left
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(sanitizeText(`${config.name} — ${config.subtitle}`), pageWidth - margin, margin + 7, { align: "right" });
      doc.text(projectName, margin, margin + 7);

      // Separator line
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, margin + 10, pageWidth - margin, margin + 10);
    };

    const drawSectionSeparator = () => {
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
    };

    const isStatusLine = (text: string) => {
      const upper = text.toUpperCase();
      return upper.includes("AT RISK") || upper.includes("[!]") || upper.includes("FAIL") ||
             upper.includes("PASS") || upper.includes("[OK]") || upper.includes("COMPLIANT") ||
             upper.includes("NON-COMPLIANT");
    };

    const isRiskStatus = (text: string) => {
      const upper = text.toUpperCase();
      return upper.includes("AT RISK") || upper.includes("FAIL") || upper.includes("NON-COMPLIANT") || upper.includes("[!]");
    };

    const isCurrencyLine = (text: string) => /\$[\d,]+/.test(text);

    const drawStatusBox = (text: string, isRisk: boolean) => {
      const boxHeight = 8;
      addNewPageIfNeeded(boxHeight + 4);
      const bgColor = isRisk ? [254, 242, 242] : [240, 253, 244];
      const borderColor = isRisk ? [252, 165, 165] : [134, 239, 172];
      const textColor = isRisk ? [153, 27, 27] : [22, 101, 52];

      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.roundedRect(margin, y - 1, maxWidth, boxHeight, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      const cleanText = sanitizeText(text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/[*_]/g, ""));
      doc.text(cleanText, margin + 3, y + 4.5);
      y += boxHeight + 3;
    };

    // ── Title Page ──
    // Logo centered (larger)
    if (logoImg) {
      try {
        doc.addImage(logoImg, "PNG", pageWidth / 2 - 10, y, 20, 20);
        y += 24;
      } catch { /* skip */ }
    }

    // No brand text on title page — logo only
    y += 2;

    // Report title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    const titleText = sanitizeText(`${config.name} — ${config.subtitle}`);
    doc.text(titleText, pageWidth / 2, y, { align: "center" });
    y += 10;

    // Project info
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(sanitizeText(`Generated: ${new Date().toLocaleString()} | Project: ${projectName}`), pageWidth / 2, y, { align: "center" });
    y += 8;

    // Title separator — amber line
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineWidth(0.2);
    y += 10;

    // ── Parse & Render Markdown ──
    const lines = reportContent.split("\n");
    let i = 0;

    while (i < lines.length) {
      const rawLine = lines[i];
      const line = rawLine.trim();
      i++;

      if (!line) { y += 2.5; continue; }

      // H1
      if (line.startsWith("# ")) {
        if (!isFirstPage || y > margin + 40) {
          if (y > margin + headerHeight + 20) {
            doc.addPage();
            isFirstPage = false;
            y = margin + headerHeight;
            drawPageHeader();
          }
        }
        y += 2;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(20, 20, 20);
        const headerText = sanitizeText(line.replace(/^# /, "").replace(/[#*_]/g, ""));
        const wrapped = doc.splitTextToSize(headerText, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 7 + 3;
        drawSectionSeparator();
        continue;
      }

      // H2
      if (line.startsWith("## ")) {
        y += 6;
        addNewPageIfNeeded(20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        const headerText = sanitizeText(line.replace(/^## /, "").replace(/[#*_]/g, ""));
        const wrapped = doc.splitTextToSize(headerText, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 6.5 + 2;
        doc.setDrawColor(230, 230, 230);
        doc.line(margin, y, margin + 50, y);
        y += 4;
        continue;
      }

      // H3
      if (line.startsWith("### ")) {
        y += 3;
        addNewPageIfNeeded(14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        const headerText = sanitizeText(line.replace(/^### /, "").replace(/[#*_]/g, ""));
        const wrapped = doc.splitTextToSize(headerText, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5.5 + 2;
        continue;
      }

      // H4
      if (line.startsWith("#### ")) {
        y += 2;
        addNewPageIfNeeded(10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(70, 70, 70);
        const headerText = sanitizeText(line.replace(/^#### /, "").replace(/[#*_]/g, ""));
        const wrapped = doc.splitTextToSize(headerText, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5 + 2;
        continue;
      }

      // HR
      if (/^---+$/.test(line) || /^\*\*\*+$/.test(line)) {
        y += 2; drawSectionSeparator(); y += 2;
        continue;
      }

      // Status lines
      if (isStatusLine(line)) {
        drawStatusBox(line, isRiskStatus(line));
        continue;
      }

      // Checkboxes
      if (line.startsWith("- [ ]") || line.startsWith("- [x]") || line.startsWith("- [X]")) {
        addNewPageIfNeeded(8);
        const checked = line.startsWith("- [x]") || line.startsWith("- [X]");
        const itemText = sanitizeText(line.replace(/^- \[.\] /, "").replace(/\*\*(.*?)\*\*/g, "$1"));
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const prefix = checked ? "[x]" : "[ ]";
        const wrapped = doc.splitTextToSize(`${prefix} ${itemText}`, maxWidth - 10);
        addNewPageIfNeeded(wrapped.length * 4.5 + 2);
        doc.text(wrapped, margin + 10, y);
        y += wrapped.length * 4.5 + 1.5;
        continue;
      }

      // Bullet points
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const bulletText = sanitizeText(line.replace(/^[-*] /, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/[*_]/g, ""));
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const wrapped = doc.splitTextToSize(`• ${bulletText}`, maxWidth - 10);
        addNewPageIfNeeded(wrapped.length * 4.5 + 2);
        doc.text(wrapped, margin + 10, y);
        y += wrapped.length * 4.5 + 1.5;

        const obcMatch = bulletText.match(/(§[\d.]+\s*[A-Za-z\s]*|OBC\s+[\d.]+[A-Za-z\s]*)/i);
        if (obcMatch) {
          doc.setFont("courier", "normal");
          doc.setFontSize(8);
          doc.setTextColor(180, 100, 20);
          doc.text(`  [${obcMatch[1].trim()}]`, margin + 12, y);
          y += 4;
          doc.setFont("helvetica", "normal");
        }
        continue;
      }

      // Numbered lists
      if (/^\d+[\.\)] /.test(line)) {
        const listText = sanitizeText(line.replace(/^\d+[\.\)] /, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/[*_]/g, ""));
        const numMatch = line.match(/^(\d+)[\.\)]/);
        const num = numMatch ? numMatch[1] : "•";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const wrapped = doc.splitTextToSize(`${num}. ${listText}`, maxWidth - 10);
        addNewPageIfNeeded(wrapped.length * 4.5 + 2);
        doc.text(wrapped, margin + 10, y);
        y += wrapped.length * 4.5 + 1.5;
        continue;
      }

      // Currency lines
      if (isCurrencyLine(line)) {
        addNewPageIfNeeded(8);
        const cleanLine = sanitizeText(line.replace(/\*\*(.*?)\*\*/g, "$1").replace(/[*_]/g, ""));
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        const upper = cleanLine.toUpperCase();
        if (upper.includes("SAVE") || upper.includes("SAVING") || upper.includes("DISCOUNT")) {
          doc.setTextColor(22, 101, 52);
        } else if (upper.includes("FINE") || upper.includes("PENALTY") || upper.includes("RISK") || upper.includes("COST")) {
          doc.setTextColor(153, 27, 27);
        } else {
          doc.setTextColor(40, 40, 40);
        }
        const wrapped = doc.splitTextToSize(cleanLine, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5 + 2;
        continue;
      }

      // Regular paragraphs
      const cleanLine = sanitizeText(line.replace(/\*\*(.*?)\*\*/g, "$1").replace(/[*_`]/g, ""));
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      const wrapped = doc.splitTextToSize(cleanLine, maxWidth);

      if (wrapped.length >= 2) {
        const singleLineHeight = 5;
        const remainingOnPage = currentPageBottom() - y;
        if (remainingOnPage > singleLineHeight && remainingOnPage < singleLineHeight * 2.5) {
          addNewPageIfNeeded(wrapped.length * singleLineHeight + 3);
        }
      }

      addNewPageIfNeeded(wrapped.length * 5 + 2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 5 + 2;
    }

    // ── CTA Box at end ──
    const ctaHeight = 20;
    if (y + ctaHeight < currentPageBottom()) {
      y += 6;
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(margin, y, maxWidth, ctaHeight, 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text("Need help resolving compliance issues?", pageWidth / 2, y + 7, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("Visit buildunion.ca for professional guidance and OBC-compliant material sourcing.", pageWidth / 2, y + 13, { align: "center" });
    }

    // ── Footer on every page ──
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const footerY = pageHeight - margin + 2;

      // Separator line above footer
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

      // Left: Build Union branding
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const buildW = doc.getTextWidth("Build");
      const sepW = doc.getTextWidth(" ");
      doc.setTextColor(140, 140, 140);
      doc.text("Build", margin, footerY);
      doc.setTextColor(245, 158, 11);
      doc.text("Union", margin + buildW + sepW, footerY);

      // Center: report info + confidential
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text(sanitizeText(`${config.name} Report – Confidential`), pageWidth / 2, footerY, { align: "center" });

      // Right: page number
      doc.text(`Page ${p} of ${pageCount}`, pageWidth - margin, footerY, { align: "right" });
    }

    return doc;
  }, [reportContent, config, projectContext]);

  const handleDownloadPdf = useCallback(async () => {
    if (!reportContent) return;
    setIsGeneratingPdf(true);
    try {
      const doc = await buildPdfDocument();
      doc.save(`${config.name}-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [reportContent, config, buildPdfDocument]);

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
      const fileName = `${config.name.toLowerCase()}-report-${new Date().toISOString().slice(0, 10)}.pdf`;
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

      toast.success(`${config.name} report saved to Documents`);
    } catch (err) {
      console.error("Save to documents failed:", err);
      toast.error("Failed to save report");
    } finally {
      setIsSavingDoc(false);
    }
  }, [reportContent, projectId, config, buildPdfDocument]);

  if (!isOpen) return null;

  // For Gemini Visual, use the dedicated Files & Contracts Dashboard
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
