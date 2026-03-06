import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Minimize2, Bell, BellOff, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { TypingDots } from "@/components/ui/loading-states";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant" | "system"; content: string; priority?: "low" | "medium" | "high" };

interface ProjectContext {
  projectId?: string;
  projectName: string;
  address: string;
  trade: string | null;
  status: string;
  workType: string;
  materialCost: number | null;
  laborCost: number | null;
  totalCost: number | null;
  teamSize: number;
  teamMembers: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  documentCount: number;
  contractCount: number;
  citationCount: number;
  citationTypes: string;
  startDate: string;
  endDate: string;
  gfa: string;
  executionMode: string;
  siteCondition: string;
  currentUserRole?: string;
  currentUserName?: string;
  tasksByStatus?: string;
  tasksByPhase?: string;
  taskDetails?: string;
  spentAmount?: number;
  committedAmount?: number;
  remainingAmount?: number;
}

interface MessaInsightsHook {
  insights: Array<{ type: string; message: string; priority: "low" | "medium" | "high" }>;
  hasInsight: boolean;
  topInsight: { type: string; message: string; priority: "low" | "medium" | "high" } | null;
  dismiss: () => void;
  enabled: boolean;
  toggleEnabled: (val: boolean) => void;
  insightCount: number;
}

interface ProjectMessaChatProps {
  open: boolean;
  onClose: () => void;
  projectContext: ProjectContext;
  messaInsights?: MessaInsightsHook;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-messa-project`;

const priorityConfig = {
  high: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", label: "⚠️" },
  medium: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", label: "⚡" },
  low: { icon: Info, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", label: "💡" },
};

export function ProjectMessaChat({ open, onClose, projectContext, messaInsights }: ProjectMessaChatProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [shownInsightIds, setShownInsightIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, isMinimized]);

  // Inject insight messages into chat when opening with insights
  useEffect(() => {
    if (!open || !messaInsights?.hasInsight || !messaInsights.insights.length) return;
    
    const newInsights = messaInsights.insights.filter(
      (ins) => !shownInsightIds.has(ins.type + ins.message)
    );
    
    if (newInsights.length === 0) return;

    const insightMessages: Msg[] = newInsights.map((ins) => ({
      role: "system" as const,
      content: ins.message,
      priority: ins.priority,
    }));

    setMessages((prev) => [...insightMessages, ...prev.filter(m => m.role !== "system")].sort((a, b) => {
      if (a.role === "system" && b.role !== "system") return -1;
      if (a.role !== "system" && b.role === "system") return 1;
      return 0;
    }));

    setShownInsightIds((prev) => {
      const next = new Set(prev);
      newInsights.forEach((ins) => next.add(ins.type + ins.message));
      return next;
    });

    messaInsights.dismiss();
  }, [open, messaInsights?.hasInsight, messaInsights?.insights]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = "";
    const chatMessages = [...messages.filter(m => m.role !== "system"), userMsg];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
          projectContext,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      console.error("MESSA chat error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${e.message || "Something went wrong. Try again."}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, projectContext]);

  if (!open) return null;

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-20 right-4 z-[60]"
      >
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full h-12 w-12 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-900/30 p-0"
        >
          <Sparkles className="h-5 w-5 text-white" />
        </Button>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-cyan-500 text-[9px] text-white flex items-center justify-center font-bold">
            {messages.filter((m) => m.role === "assistant").length}
          </span>
        )}
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "fixed right-0 top-0 bottom-0 z-[60]",
          "w-full sm:w-[380px] md:w-[420px]",
          "bg-background/95 backdrop-blur-xl",
          "border-l border-border/50",
          "shadow-[-8px_0_30px_-10px_rgba(0,0,0,0.3)]",
          "flex flex-col"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">MESSA</h3>
              <p className="text-[10px] text-muted-foreground">Project Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Proactive toggle */}
            {messaInsights && (
              <div className="flex items-center gap-1.5 mr-1 px-2 py-1 rounded-lg bg-muted/40 border border-border/30">
                {messaInsights.enabled ? (
                  <Bell className="h-3 w-3 text-amber-400" />
                ) : (
                  <BellOff className="h-3 w-3 text-muted-foreground" />
                )}
                <Switch
                  checked={messaInsights.enabled}
                  onCheckedChange={messaInsights.toggleEnabled}
                  className="scale-[0.65] origin-center"
                />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* System insight cards at top */}
          {messages.filter(m => m.role === "system").map((msg, i) => {
            const config = priorityConfig[msg.priority || "low"];
            const Icon = config.icon;
            return (
              <div key={`insight-${i}`} className={cn("rounded-xl px-3.5 py-2.5 border text-sm flex items-start gap-2", config.bg)}>
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
                <div>
                  <p className={cn("font-medium text-xs", config.color)}>MESSA Insight</p>
                  <p className="text-foreground/80 text-xs mt-0.5">{msg.content}</p>
                </div>
              </div>
            );
          })}

          {messages.filter(m => m.role !== "system").length === 0 && messages.filter(m => m.role === "system").length === 0 && (
            <div className="text-center py-8 space-y-3">
              <div className="h-12 w-12 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Ask me anything about this project</p>
                <p className="text-xs text-muted-foreground mt-1">
                  I know your costs, tasks, team, and every verified fact.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                {[
                  "Why is the total cost this much?",
                  "What tasks are pending?",
                  "Summarize the project status",
                  "Who is on the team?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="text-[10px] px-2.5 py-1.5 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Show empty state with quick actions if only insights are shown */}
          {messages.filter(m => m.role !== "system").length === 0 && messages.filter(m => m.role === "system").length > 0 && (
            <div className="text-center py-4 space-y-2">
              <p className="text-xs text-muted-foreground">Ask MESSA to discuss these insights or anything else</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {[
                  "Tell me more about these issues",
                  "What should I prioritize?",
                  "Summarize the project status",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="text-[10px] px-2.5 py-1.5 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.filter(m => m.role !== "system").map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-br-md"
                    : "bg-muted/60 text-foreground rounded-bl-md border border-border/30"
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3 border border-border/30">
                <TypingDots color="amber" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border/50 bg-background/80">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about this project..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 max-h-24"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shrink-0"
            >
              {isLoading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
              ) : (
                <Send className="h-4 w-4 text-white" />
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
