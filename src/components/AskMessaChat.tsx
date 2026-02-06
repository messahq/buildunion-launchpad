import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, MessageSquare, Loader2, ShieldCheck, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

type VerificationStatus = "verified" | "dual-processed" | "gemini-only" | "openai-only" | "error";

type Message = {
  role: "user" | "assistant";
  content: string;
  verification?: {
    status: VerificationStatus;
    engines: { gemini: boolean; openai: boolean };
    verified: boolean;
  };
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-messa`;

async function sendDualEngineMessage({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Array<{ role: string; content: string }>;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, dualEngine: true }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        onError("Rate limit exceeded. Please wait a moment and try again.");
        return;
      }
      if (resp.status === 402) {
        onError("AI credits exhausted. Please try again later.");
        return;
      }
      const errorData = await resp.json().catch(() => ({}));
      onError(errorData.error || "Failed to connect to Messa");
      return;
    }

    if (!resp.body) {
      onError("No response body received");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";

    while (true) {
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
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          // Incomplete JSON, put back and wait for more
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (error) {
    onError(error instanceof Error ? error.message : "Connection error");
  }
}

interface AskMessaChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const VerificationBadge = ({ verification }: { verification?: Message["verification"] }) => {
  if (!verification) return null;

  const badges: Record<VerificationStatus, { icon: React.ReactNode; text: string; className: string }> = {
    verified: {
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      text: "Operational Truth Verified",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    "dual-processed": {
      icon: <Zap className="h-3.5 w-3.5" />,
      text: "Dual-Engine Processed",
      className: "bg-cyan-100 text-cyan-700 border-cyan-200",
    },
    "gemini-only": {
      icon: <Zap className="h-3.5 w-3.5" />,
      text: "Gemini Response",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    "openai-only": {
      icon: <Zap className="h-3.5 w-3.5" />,
      text: "OpenAI Response",
      className: "bg-cyan-100 text-cyan-700 border-cyan-200",
    },
    error: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      text: "Processing Error",
      className: "bg-red-100 text-red-700 border-red-200",
    },
  };

  const badge = badges[verification.status];

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
      {badge.icon}
      <span>{badge.text}</span>
    </div>
  );
};

const AskMessaChat = ({ isOpen, onClose }: AskMessaChatProps) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!user) {
      toast.error("Please log in to use Ask Messa");
      navigate("/buildunion/login");
      return;
    }

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    await sendDualEngineMessage({
      messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: userMessage.content }],
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
          }
          return [...prev, { role: "assistant", content: assistantContent }];
        });
      },
      onDone: () => {
        setIsLoading(false);
      },
      onError: (error) => {
        toast.error(error);
        setIsLoading(false);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const isLoggedIn = !authLoading && user;

  return (
    <div className="fixed inset-4 sm:inset-auto sm:bottom-6 sm:right-6 bottom-20 w-auto sm:w-[420px] h-auto sm:h-[650px] max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Ask Messa</h3>
            <p className="text-white/80 text-xs">Dual-Engine AI • Construction Expert</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Dual-Engine Indicator */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-slate-600">Gemini</span>
        </div>
        <div className="text-slate-300">+</div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-slate-600">OpenAI</span>
        </div>
        <div className="text-slate-300">=</div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-slate-600 font-medium">Verified Truth</span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {!isLoggedIn ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 mb-4 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-slate-400" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 mb-2">
              Login Required
            </h4>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              Please log in to access the Ask Messa AI assistant and get verified construction insights.
            </p>
            <Button
              onClick={() => navigate("/buildunion/login")}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Log In to Continue
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-amber-400 mb-4 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 mb-2">
              Hi! I'm Messa
            </h4>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              Your AI assistant for BuildUnion and Canadian construction. 
              Ask me about the platform, subscription tiers, how to use features, 
              or construction codes and regulations!
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "How does BuildUnion work?",
                "What's in Pro tier?",
                "How do I create a project?",
                "OBC permit requirements",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-amber-500 text-white rounded-br-md"
                      : "bg-slate-100 text-slate-900 rounded-bl-md"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
                {msg.role === "assistant" && msg.verification && (
                  <div className="mt-1.5 ml-1">
                    <VerificationBadge verification={msg.verification} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    <span className="text-xs text-slate-500">Processing with dual engines...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoggedIn ? "Ask about codes, permits, safety..." : "Log in to chat"}
            className="flex-1"
            disabled={isLoading || !isLoggedIn}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !isLoggedIn}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AskMessaChat;
