import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  FileText,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

// Custom icons for the engines
const GeminiIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const OpenAIIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.6 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.1408 1.6465 4.4708 4.4708 0 0 1 .5765 3.0137zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.5056-2.6067-1.4998z" />
  </svg>
);

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  verification?: {
    status: "verified" | "not-verified" | "gemini-only" | "openai-only" | "error";
    engines: { gemini: boolean; openai: boolean };
    verified: boolean;
  };
  sources?: Array<{ document: string; page?: number }>;
  isLoading?: boolean;
  engineStatus?: {
    gemini: "idle" | "analyzing" | "complete" | "error";
    openai: "idle" | "verifying" | "complete" | "error";
  };
}

interface DualEngineChatProps {
  projectId: string;
  projectName?: string;
}

const DualEngineChat = ({ projectId, projectName }: DualEngineChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      isLoading: true,
      engineStatus: {
        gemini: "analyzing",
        openai: "verifying",
      },
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ask-messa", {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          dualEngine: true,
          projectContext: {
            projectId,
            projectName,
          },
        },
      });

      if (error) throw error;

      // Update the assistant message with the response
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessage.id
            ? {
                ...m,
                content: data.content,
                verification: data.verification,
                sources: data.sources,
                isLoading: false,
                engineStatus: {
                  gemini: data.verification?.engines?.gemini ? "complete" : "error",
                  openai: data.verification?.engines?.openai ? "complete" : "error",
                },
              }
            : m
        )
      );
    } catch (err) {
      console.error("Chat error:", err);
      toast.error("Failed to get response. Please try again.");
      
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessage.id
            ? {
                ...m,
                content: "An error occurred. Please try again.",
                isLoading: false,
                engineStatus: { gemini: "error", openai: "error" },
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getVerificationBadge = (verification?: Message["verification"]) => {
    if (!verification) return null;

    if (verification.verified) {
      return (
        <div className="flex items-center gap-2 mb-3 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-600">Verified by Dual-Engine</span>
          <div className="flex gap-1 ml-auto">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
              <GeminiIcon className="w-3 h-3 text-blue-500" />
            </div>
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <OpenAIIcon className="w-3 h-3 text-emerald-500" />
            </div>
          </div>
        </div>
      );
    }

    if (verification.status === "not-verified") {
      return (
        <div className="flex items-center gap-2 mb-3 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-600">
            Conflict detected between engines. Manual verification required.
          </span>
        </div>
      );
    }

    return null;
  };

  const renderEngineStatus = (engineStatus?: Message["engineStatus"], isLoading?: boolean) => {
    if (!engineStatus) return null;

    const isAnalyzing = engineStatus.gemini === "analyzing" || engineStatus.openai === "verifying";

    return (
      <div className={`mb-4 ${isLoading ? 'p-3 rounded-lg bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-emerald-500/5 border border-slate-200' : ''}`}>
        {isLoading && (
          <div className="text-xs font-medium text-slate-600 mb-3 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Querying dual AI engines...
          </div>
        )}
        <div className="flex items-center gap-4">
          {/* Gemini Status */}
          <div className="flex items-center gap-2">
            <div className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              engineStatus.gemini === "complete" 
                ? "bg-blue-500/20 ring-2 ring-blue-500" 
                : engineStatus.gemini === "analyzing"
                  ? "bg-blue-500/10"
                  : engineStatus.gemini === "error"
                    ? "bg-red-500/10 ring-2 ring-red-500/50"
                    : "bg-gray-200"
            }`}>
              {engineStatus.gemini === "analyzing" && (
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
              )}
              <GeminiIcon className={`w-4 h-4 ${
                engineStatus.gemini === "complete" 
                  ? "text-blue-500" 
                  : engineStatus.gemini === "error"
                    ? "text-red-500"
                    : "text-blue-400"
              }`} />
            </div>
            <div className="flex flex-col">
              <span className={`text-xs font-semibold ${
                engineStatus.gemini === "complete" 
                  ? "text-blue-600" 
                  : engineStatus.gemini === "error"
                    ? "text-red-600"
                    : "text-slate-600"
              }`}>
                Gemini
              </span>
              <span className={`text-[10px] ${
                engineStatus.gemini === "analyzing" 
                  ? "text-blue-500 animate-pulse" 
                  : "text-muted-foreground"
              }`}>
                {engineStatus.gemini === "analyzing" && "Analyzing..."}
                {engineStatus.gemini === "complete" && "✓ Complete"}
                {engineStatus.gemini === "error" && "✗ Error"}
                {engineStatus.gemini === "idle" && "Waiting..."}
              </span>
            </div>
          </div>

          {/* Connecting line */}
          {isAnalyzing && (
            <div className="flex-1 flex items-center gap-1 max-w-[60px]">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-400 to-emerald-400 opacity-30 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-blue-500 to-emerald-500 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {/* OpenAI Status */}
          <div className="flex items-center gap-2">
            <div className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              engineStatus.openai === "complete" 
                ? "bg-emerald-500/20 ring-2 ring-emerald-500" 
                : engineStatus.openai === "verifying"
                  ? "bg-emerald-500/10"
                  : engineStatus.openai === "error"
                    ? "bg-red-500/10 ring-2 ring-red-500/50"
                    : "bg-gray-200"
            }`}>
              {engineStatus.openai === "verifying" && (
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
              )}
              <OpenAIIcon className={`w-4 h-4 ${
                engineStatus.openai === "complete" 
                  ? "text-emerald-500" 
                  : engineStatus.openai === "error"
                    ? "text-red-500"
                    : "text-emerald-400"
              }`} />
            </div>
            <div className="flex flex-col">
              <span className={`text-xs font-semibold ${
                engineStatus.openai === "complete" 
                  ? "text-emerald-600" 
                  : engineStatus.openai === "error"
                    ? "text-red-600"
                    : "text-slate-600"
              }`}>
                OpenAI
              </span>
              <span className={`text-[10px] ${
                engineStatus.openai === "verifying" 
                  ? "text-emerald-500 animate-pulse" 
                  : "text-muted-foreground"
              }`}>
                {engineStatus.openai === "verifying" && "Verifying..."}
                {engineStatus.openai === "complete" && "✓ Verified"}
                {engineStatus.openai === "error" && "✗ Error"}
                {engineStatus.openai === "idle" && "Waiting..."}
              </span>
            </div>
          </div>

          {/* Consensus indicator */}
          {engineStatus.gemini === "complete" && engineStatus.openai === "complete" && (
            <Badge className="ml-auto bg-gradient-to-r from-green-500 to-emerald-500 text-white gap-1 shadow-sm">
              <Sparkles className="h-3 w-3" />
              Consensus
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const renderSources = (sources?: Array<{ document: string; page?: number }>) => {
    if (!sources || sources.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">Sources:</p>
        <div className="flex flex-wrap gap-2">
          {sources.map((source, idx) => (
            <button
              key={idx}
              className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs hover:bg-muted/80 transition-colors"
            >
              <FileText className="h-3 w-3" />
              <span>{source.document}</span>
              {source.page && <span className="text-muted-foreground">, Page {source.page}</span>}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-amber-400 flex items-center justify-center shadow-lg">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-300 via-teal-300 to-amber-300 opacity-80" />
            </div>
            <div>
              <h3 className="font-semibold">M.E.S.S.A. Dual-Engine Analysis</h3>
              <p className="text-xs text-muted-foreground">Powered by Gemini Pro & GPT-5</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mb-4 text-amber-500/50" />
              <p className="font-medium">Ask M.E.S.S.A. about your project</p>
              <p className="text-sm mt-1">
                Questions are verified by dual AI engines for accuracy
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-4 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.role === "assistant" && message.isLoading && (
                      renderEngineStatus(message.engineStatus, true)
                    )}

                    {message.role === "assistant" && !message.isLoading && (
                      <>
                        {getVerificationBadge(message.verification)}
                        {renderEngineStatus(message.engineStatus, false)}
                      </>
                    )}

                    {!message.isLoading && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {message.content}
                      </div>
                    )}

                    {message.role === "assistant" && !message.isLoading && (
                      renderSources(message.sources)
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Ask about your project documents..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DualEngineChat;
