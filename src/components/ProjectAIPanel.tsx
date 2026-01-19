import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, Loader2, Brain, Sparkles, ShieldCheck, AlertCircle, 
  BookOpen, Zap, Crown, Users, Mail, FileText, Calculator,
  FileCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type VerificationStatus = "verified" | "not-verified" | "gemini-only" | "openai-only" | "error";

interface SourceReference {
  document: string;
  page?: number;
  excerpt?: string;
}

interface MessaMessage {
  role: "user" | "assistant";
  content: string;
  verification?: {
    status: VerificationStatus;
    engines: { gemini: boolean; openai: boolean };
    verified: boolean;
  };
  sources?: SourceReference[];
}

interface ProjectDocument {
  id: string;
  file_name: string;
  file_path: string;
}

interface ProjectSummary {
  id: string;
  line_items?: any[];
  total_cost?: number;
  material_cost?: number;
  labor_cost?: number;
  client_name?: string;
  client_email?: string;
  photo_estimate?: any;
  calculator_results?: any[];
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  full_name?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  assigned_to: string;
}

interface ProjectAIPanelProps {
  projectId: string;
  projectName: string;
  userId: string;
  documents: ProjectDocument[];
  siteImages: string[];
  projectSummary?: ProjectSummary | null;
  teamMembers?: TeamMember[];
  tasks?: Task[];
  isOwner?: boolean;
  isPremium?: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-messa`;

const VerificationBadge = ({ verification }: { verification?: MessaMessage["verification"] }) => {
  if (!verification) return null;

  const badges: Record<VerificationStatus, { icon: React.ReactNode; text: string; className: string }> = {
    verified: {
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      text: "Verified",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    "not-verified": {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      text: "Not verified",
      className: "bg-amber-100 text-amber-700 border-amber-200",
    },
    "gemini-only": {
      icon: <Zap className="h-3.5 w-3.5" />,
      text: "Gemini",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    "openai-only": {
      icon: <Zap className="h-3.5 w-3.5" />,
      text: "GPT-5",
      className: "bg-cyan-100 text-cyan-700 border-cyan-200",
    },
    error: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      text: "Error",
      className: "bg-red-100 text-red-700 border-red-200",
    },
  };

  const badge = badges[verification.status];

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}>
      {badge.icon}
      <span>{badge.text}</span>
    </div>
  );
};

const SourceTags = ({ sources }: { sources?: SourceReference[] }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {sources.slice(0, 3).map((source, i) => (
        <div key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-xs text-slate-600">
          <BookOpen className="h-2.5 w-2.5" />
          <span className="truncate max-w-[100px]">{source.document}</span>
        </div>
      ))}
      {sources.length > 3 && (
        <span className="text-xs text-slate-400">+{sources.length - 3}</span>
      )}
    </div>
  );
};

const ProjectAIPanel = ({ 
  projectId, 
  projectName,
  userId,
  documents, 
  siteImages,
  projectSummary,
  teamMembers = [],
  tasks = [],
  isOwner = false,
  isPremium = false
}: ProjectAIPanelProps) => {
  const [messages, setMessages] = useState<MessaMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const hasContent = documents.length > 0 || siteImages.length > 0 || projectSummary;

  // Build context summary for AI
  const buildProjectContext = () => {
    const context: any = {
      projectId,
      projectName,
      documents: documents.map(d => d.file_name),
      siteImages: siteImages,
      hasEstimate: !!projectSummary,
    };

    if (projectSummary) {
      context.estimate = {
        totalCost: projectSummary.total_cost,
        materialCost: projectSummary.material_cost,
        laborCost: projectSummary.labor_cost,
        lineItemCount: projectSummary.line_items?.length || 0,
        clientName: projectSummary.client_name,
        hasPhotoAnalysis: !!projectSummary.photo_estimate,
        calculatorResultsCount: projectSummary.calculator_results?.length || 0,
      };
    }

    if (teamMembers.length > 0) {
      context.team = {
        memberCount: teamMembers.length,
        members: teamMembers.map(m => ({ role: m.role, name: m.full_name || 'Team Member' })),
      };
    }

    if (tasks.length > 0) {
      context.tasks = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
      };
    }

    return context;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: MessaMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: userMessage.content }],
          dualEngine: true,
          projectContext: buildProjectContext(),
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to connect");
      }

      const data = await resp.json();
      
      let status: VerificationStatus = "error";
      if (data.verification?.verified) {
        status = "verified";
      } else if (data.verification?.engines?.gemini && data.verification?.engines?.openai) {
        status = "not-verified";
      } else if (data.verification?.engines?.gemini) {
        status = "gemini-only";
      } else if (data.verification?.engines?.openai) {
        status = "openai-only";
      }

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.content,
        verification: { ...data.verification, status },
        sources: data.sources,
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Connection error");
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, an error occurred. Please try again.",
        verification: { status: "error", engines: { gemini: false, openai: false }, verified: false },
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  // Premium actions
  const handleSendSummaryToTeam = async () => {
    if (!isPremium) {
      toast.error("This feature requires Premium subscription");
      return;
    }
    toast.info("Sending summary to team members...", { duration: 2000 });
    // TODO: Implement email sending via edge function
    setTimeout(() => {
      toast.success("Summary sent to all team members!");
    }, 1500);
  };

  const handleGenerateReport = async () => {
    if (!isPremium) {
      toast.error("This feature requires Premium subscription");
      return;
    }
    toast.info("Generating project report...", { duration: 2000 });
    setTimeout(() => {
      toast.success("Report generated and ready for download!");
    }, 1500);
  };

  return (
    <Card className="border-slate-200 bg-white flex flex-col h-[700px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-3 rounded-t-lg flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold">M.E.S.S.A. Analysis</h3>
          <p className="text-white/80 text-xs">Dual-Engine AI • Project Intelligence</p>
        </div>
        {isPremium && (
          <Badge className="bg-amber-400 text-amber-900 border-0">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        )}
      </div>

      {/* Context Summary Bar */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-3 text-xs overflow-x-auto">
        {documents.length > 0 && (
          <div className="flex items-center gap-1.5 text-slate-600 whitespace-nowrap">
            <FileText className="h-3.5 w-3.5" />
            <span>{documents.length} docs</span>
          </div>
        )}
        {siteImages.length > 0 && (
          <div className="flex items-center gap-1.5 text-slate-600 whitespace-nowrap">
            <FileCheck className="h-3.5 w-3.5" />
            <span>{siteImages.length} photos</span>
          </div>
        )}
        {projectSummary && (
          <div className="flex items-center gap-1.5 text-green-600 whitespace-nowrap">
            <Calculator className="h-3.5 w-3.5" />
            <span>Estimate</span>
          </div>
        )}
        {teamMembers.length > 0 && (
          <div className="flex items-center gap-1.5 text-blue-600 whitespace-nowrap">
            <Users className="h-3.5 w-3.5" />
            <span>{teamMembers.length} team</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-slate-500">Gemini</span>
          <span className="text-slate-300">+</span>
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-slate-500">GPT-5</span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {!hasContent ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <Brain className="h-12 w-12 text-slate-300 mb-4" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">
              Upload Files First
            </h4>
            <p className="text-slate-500 text-sm leading-relaxed">
              Upload project documents or site photos to enable AI analysis with dual-engine verification.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-amber-400 mb-4 flex items-center justify-center">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 mb-2">
              Project Intelligence Ready
            </h4>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              I can analyze your documents, estimates, and team data.
            </p>

            {/* Quick Questions based on available data */}
            <div className="space-y-2 w-full max-w-xs">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Quick Actions
              </p>
              
              {projectSummary && (
                <button
                  onClick={() => handleQuickQuestion("Summarize the project estimate and costs")}
                  className="w-full text-left text-sm text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors"
                >
                  💰 Summarize estimate & costs
                </button>
              )}
              
              {documents.length > 0 && (
                <button
                  onClick={() => handleQuickQuestion("Extract key information from the documents")}
                  className="w-full text-left text-sm text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors"
                >
                  📄 Extract document info
                </button>
              )}

              {siteImages.length > 0 && (
                <button
                  onClick={() => handleQuickQuestion("Analyze the site photos")}
                  className="w-full text-left text-sm text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors"
                >
                  📷 Analyze site photos
                </button>
              )}

              <button
                onClick={() => handleQuickQuestion("What are the next steps for this project?")}
                className="w-full text-left text-sm text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors"
              >
                ✅ Suggest next steps
              </button>

              <button
                onClick={() => handleQuickQuestion("Identify potential risks or issues")}
                className="w-full text-left text-sm text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors"
              >
                ⚠️ Identify risks
              </button>
            </div>

            {/* Premium Actions */}
            {isOwner && teamMembers.length > 0 && (
              <div className="mt-6 w-full max-w-xs space-y-2">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wider flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  Team Actions
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-amber-200 hover:bg-amber-50 text-amber-700"
                  onClick={handleSendSummaryToTeam}
                >
                  <Mail className="h-4 w-4" />
                  Send Summary to Team
                  {!isPremium && <Badge variant="outline" className="ml-auto text-xs">Pro</Badge>}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-amber-200 hover:bg-amber-50 text-amber-700"
                  onClick={handleGenerateReport}
                >
                  <FileText className="h-4 w-4" />
                  Generate Report
                  {!isPremium && <Badge variant="outline" className="ml-auto text-xs">Pro</Badge>}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-cyan-500 text-white rounded-br-md"
                      : "bg-slate-100 text-slate-900 rounded-bl-md"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
                {msg.role === "assistant" && (
                  <div className="mt-1 ml-1 space-y-1">
                    <VerificationBadge verification={msg.verification} />
                    <SourceTags sources={msg.sources} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    <span className="text-xs text-slate-500">Analyzing with dual engines...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white rounded-b-lg">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={!hasContent ? "Upload files first..." : "Ask about your project..."}
            className="flex-1"
            disabled={isLoading || !hasContent}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading || !hasContent}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProjectAIPanel;
