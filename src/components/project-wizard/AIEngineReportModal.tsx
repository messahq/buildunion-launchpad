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

    // Abort any existing request
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

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE lines
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
            // Incomplete JSON, put back
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

  const handleDownload = () => {
    const blob = new Blob([reportContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.name}-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-4 md:inset-8 lg:inset-12 z-[101] flex flex-col rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black border border-white/10"
          >
            {/* Header */}
            <div className={cn(
              "shrink-0 p-4 md:p-6 border-b border-white/10",
              "bg-gradient-to-r",
              config.gradient,
              "bg-opacity-10"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
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
                      "w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center",
                      "bg-gradient-to-br",
                      config.gradient,
                      config.glowColor,
                      "shadow-lg"
                    )}
                  >
                    <img
                      src={config.image}
                      alt={config.name}
                      className="w-10 h-10 md:w-12 md:h-12 object-contain"
                    />
                  </motion.div>

                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      {config.name}
                      <Badge className={cn(
                        "text-xs",
                        "bg-gradient-to-r",
                        config.gradient,
                        "text-white border-0"
                      )}>
                        AI Engine
                      </Badge>
                    </h2>
                    <p className="text-sm text-white/60">{config.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {reportContent && !isLoading && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateReport}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Regenerate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 p-4 md:p-6">
              {isLoading && !reportContent && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="h-12 w-12 text-amber-400" />
                  </motion.div>
                  <p className="text-white/60 text-sm">
                    {config.name} is analyzing your project...
                  </p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="text-red-400 text-center">
                    <p className="font-medium">{error}</p>
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
                        <h1 className="text-2xl font-bold text-white mt-6 mb-4 flex items-center gap-2">
                          <Sparkles className="h-6 w-6 text-amber-400" />
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xl font-semibold text-white/90 mt-5 mb-3 border-b border-white/10 pb-2">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-lg font-medium text-white/80 mt-4 mb-2">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-white/70 leading-relaxed mb-3">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside text-white/70 space-y-1 mb-3">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside text-white/70 space-y-1 mb-3">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-white/70">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-white font-semibold">{children}</strong>
                      ),
                      code: ({ children }) => (
                        <code className="px-1.5 py-0.5 bg-white/10 rounded text-amber-300 text-sm">
                          {children}
                        </code>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-amber-500/50 pl-4 italic text-white/60">
                          {children}
                        </blockquote>
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
            <div className="shrink-0 p-4 border-t border-white/10 bg-black/30">
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>Powered by {config.name} AI Engine</span>
                <span>BuildUnion Visual Intelligence Platform</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AIEngineReportModal;
