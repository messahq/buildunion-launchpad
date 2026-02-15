import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Send,
  Upload,
  Image as ImageIcon,
  FileText,
  Paperclip,
  ArrowDown,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string;
  message: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
  sender_name?: string;
  sender_role?: string;
  source?: 'project' | 'direct';
}

interface TeamMember {
  id: string;
  role: string;
  name: string;
  userId: string;
}

interface TeamChatPanelProps {
  projectId: string;
  userId: string;
  teamMembers: TeamMember[];
  compact?: boolean;
  onDocumentAdded?: () => void;
  defaultCollapsed?: boolean;
}

const roleGradients: Record<string, string> = {
  owner: "from-amber-400 to-orange-500",
  foreman: "from-teal-400 to-cyan-500",
  worker: "from-blue-400 to-indigo-500",
  inspector: "from-purple-400 to-violet-500",
  subcontractor: "from-pink-400 to-rose-500",
  member: "from-slate-400 to-slate-500",
};

export function TeamChatPanel({
  projectId,
  userId,
  teamMembers,
  compact = false,
  onDocumentAdded,
  defaultCollapsed = false,
}: TeamChatPanelProps) {
  const [isChatCollapsed, setIsChatCollapsed] = useState(defaultCollapsed);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Build userId→name/role map
  const memberMap = new Map<string, { name: string; role: string }>();
  teamMembers.forEach((m) => memberMap.set(m.userId, { name: m.name, role: m.role }));
  // Ensure the current user (owner) is in the map
  if (!memberMap.has(userId)) {
    memberMap.set(userId, { name: 'You', role: 'owner' });
  }

  // Fetch messages
  // Collect all userIds for this project (team members + owner)
  const allMemberUserIds = teamMembers.map(m => m.userId).filter(id => !!id);
  // Include the current user (owner) if not already in the list
  if (!allMemberUserIds.includes(userId)) {
    allMemberUserIds.push(userId);
  }

  const fetchMessages = useCallback(async () => {
    try {
      // 1. Fetch project-scoped chat messages
      const { data: projectMsgs, error: projErr } = await supabase
        .from("project_chat_messages")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (projErr) throw projErr;

      const enrichedProject: ChatMessage[] = (projectMsgs || []).map((msg) => {
        const member = memberMap.get(msg.user_id);
        return {
          ...msg,
          sender_name: member?.name || "Unknown",
          sender_role: member?.role || "member",
          source: 'project' as const,
        };
      });

      // 2. Fetch direct messages (team_messages) between project members
      let enrichedDirect: ChatMessage[] = [];
      if (allMemberUserIds.length >= 2) {
        const { data: directMsgs, error: dmErr } = await supabase
          .from("team_messages")
          .select("*")
          .or(
            allMemberUserIds
              .map(uid => `sender_id.eq.${uid},recipient_id.eq.${uid}`)
              .join(',')
          )
          .order("created_at", { ascending: true })
          .limit(200);

        if (!dmErr && directMsgs) {
          // Filter to only messages between project members
          enrichedDirect = directMsgs
            .filter(msg => 
              allMemberUserIds.includes(msg.sender_id) && 
              allMemberUserIds.includes(msg.recipient_id)
            )
            .map(msg => {
              const member = memberMap.get(msg.sender_id);
              return {
                id: `dm-${msg.id}`,
                project_id: projectId,
                user_id: msg.sender_id,
                message: msg.message,
                attachment_url: msg.attachment_url,
                attachment_name: msg.attachment_name,
                created_at: msg.created_at,
                sender_name: msg.sender_id === userId ? 'You' : (member?.name || "Unknown"),
                sender_role: member?.role || "member",
                source: 'direct' as const,
              };
            });
        }
      }

      // 3. Merge and sort by created_at
      const allMessages = [...enrichedProject, ...enrichedDirect]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setMessages(allMessages);
    } catch (err) {
      console.error("[TeamChat] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, allMemberUserIds.join(',')]);

  // Initial fetch + realtime subscription
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`project-chat-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_chat_messages",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          const member = memberMap.get(newMsg.user_id);
          const enriched: ChatMessage = {
            ...newMsg,
            sender_name: member?.name || "Unknown",
            sender_role: member?.role || "member",
            source: 'project',
          };
          // Dedup: skip if already added by optimistic update
          setMessages((prev) => {
            if (prev.some((m) => m.id === enriched.id)) return prev;
            return [...prev, enriched];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_messages",
        },
        (payload) => {
          const dm = payload.new as any;
          // Only show if both sender and recipient are project members
          if (
            allMemberUserIds.includes(dm.sender_id) &&
            allMemberUserIds.includes(dm.recipient_id)
          ) {
            const member = memberMap.get(dm.sender_id);
            const enriched: ChatMessage = {
              id: `dm-${dm.id}`,
              project_id: projectId,
              user_id: dm.sender_id,
              message: dm.message,
              attachment_url: dm.attachment_url,
              attachment_name: dm.attachment_name,
              created_at: dm.created_at,
              sender_name: dm.sender_id === userId ? 'You' : (member?.name || "Unknown"),
              sender_role: member?.role || "member",
              source: 'direct',
            };
            // Dedup
            setMessages((prev) => {
              if (prev.some((m) => m.id === enriched.id)) return prev;
              return [...prev, enriched];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchMessages]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Send message with optimistic update
  const handleSend = async () => {
    if (!newMessage.trim() && !isUploading) return;
    const messageText = newMessage.trim();
    setNewMessage("");
    setIsSending(true);
    try {
      const { data, error } = await supabase.from("project_chat_messages").insert({
        project_id: projectId,
        user_id: userId,
        message: messageText,
      }).select().single();

      if (error) throw error;

      // Optimistic: add message immediately (dedup with realtime)
      if (data) {
        const member = memberMap.get(userId);
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [
            ...prev,
            {
              ...data,
              sender_name: member?.name || "You",
              sender_role: member?.role || "owner",
              source: "project" as const,
            },
          ];
        });
      }
    } catch (err: any) {
      toast.error("Failed to send message");
      setNewMessage(messageText); // Restore on error
      console.error("[TeamChat] Send error:", err);
    } finally {
      setIsSending(false);
    }
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File too large (max 10MB)");
      return;
    }

    setIsUploading(true);
    try {
      const filePath = `${projectId}/chat/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("project-documents")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Also register in project_documents table for Documents panel with metadata
      const uploaderInfo = memberMap.get(userId);
      await supabase.from("project_documents").insert({
        project_id: projectId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        uploaded_by: userId,
        uploaded_by_name: uploaderInfo?.name || 'Unknown',
        uploaded_by_role: uploaderInfo?.role || 'member',
        mime_type: file.type || 'application/octet-stream',
        ai_analysis_status: 'pending',
      });

      // Send as chat message with attachment
      const { error: msgError } = await supabase
        .from("project_chat_messages")
        .insert({
          project_id: projectId,
          user_id: userId,
          message: `📎 ${file.name}`,
          attachment_url: publicUrl,
          attachment_name: file.name,
        });

      if (msgError) throw msgError;

      toast.success("File uploaded & saved to Documents");
      onDocumentAdded?.();
    } catch (err: any) {
      toast.error("Upload failed");
      console.error("[TeamChat] Upload error:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isImage = (name: string | null) => {
    if (!name) return false;
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
  };

  const chatHeight = compact ? "h-[280px]" : "h-[400px]";

  return (
    <div className="flex flex-col rounded-xl border border-amber-400/25 bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-yellow-50/80 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/25 overflow-hidden shadow-sm">
      {/* Chat Header - clickable to collapse/expand */}
      <button
        type="button"
        onClick={() => setIsChatCollapsed(!isChatCollapsed)}
        className="flex items-center justify-between px-3 py-2 border-b border-amber-300/30 dark:border-amber-500/15 bg-gradient-to-r from-amber-100/80 to-orange-100/60 dark:from-amber-950/40 dark:to-orange-950/30 w-full text-left hover:from-amber-200/80 hover:to-orange-200/60 dark:hover:from-amber-900/40 dark:hover:to-orange-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
          <MessageSquare className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
          <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
            Project Chat
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-amber-700/70 dark:text-amber-400/60">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </span>
          <motion.div
            animate={{ rotate: isChatCollapsed ? 0 : 180 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronDown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </motion.div>
        </div>
      </button>

      {/* Collapsible Chat Body */}
      <AnimatePresence initial={false}>
        {!isChatCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            {/* Messages Area */}
            <div className={cn("overflow-y-auto px-3 py-2 space-y-2", chatHeight)} ref={scrollRef}>
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500/50" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Send className="h-6 w-6 text-amber-400/40 mb-2" />
                  <p className="text-[11px] text-amber-800/60 dark:text-amber-400/50">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const isOwn = msg.user_id === userId;
                    const gradient = roleGradients[msg.sender_role || "member"] || roleGradients.member;
                    const showAvatar =
                      idx === 0 || messages[idx - 1]?.user_id !== msg.user_id;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className={cn("flex gap-2", isOwn ? "flex-row-reverse" : "flex-row")}
                      >
                        {/* Avatar */}
                        {showAvatar ? (
                          <div
                            className={cn(
                              "h-7 w-7 rounded-md bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold shadow-sm flex-shrink-0 mt-0.5",
                              gradient
                            )}
                          >
                            {(msg.sender_name || "?").charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <div className="w-7 flex-shrink-0" />
                        )}

                        {/* Message Bubble */}
                        <div
                          className={cn(
                            "max-w-[75%] rounded-xl px-3 py-2 space-y-1",
                            isOwn
                              ? "bg-gradient-to-br from-amber-200/60 to-orange-200/50 dark:from-amber-500/20 dark:to-orange-500/15 border border-amber-300/40 dark:border-amber-500/20"
                              : "bg-gradient-to-br from-amber-100/50 to-yellow-100/40 dark:from-amber-950/25 dark:to-yellow-950/20 border border-amber-200/30 dark:border-amber-500/10"
                          )}
                        >
                          {/* Sender name */}
                          {showAvatar && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-amber-900 dark:text-amber-200">
                                {msg.sender_name}
                              </span>
                              <span className="text-[8px] text-amber-600/70 dark:text-amber-400/50 capitalize">
                                {msg.sender_role}
                              </span>
                              {msg.source === 'direct' && (
                                <span className="text-[7px] font-bold text-blue-500 dark:text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded">
                                  DM
                                </span>
                              )}
                            </div>
                          )}

                          {/* Attachment preview */}
                          {msg.attachment_url && (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              {isImage(msg.attachment_name) ? (
                                <div className="rounded-lg overflow-hidden border border-amber-300/25 dark:border-amber-500/15 mt-1">
                                  <img
                                    src={msg.attachment_url}
                                    alt={msg.attachment_name || "attachment"}
                                    className="max-h-40 w-auto object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-200/40 dark:bg-amber-500/10 border border-amber-300/30 dark:border-amber-500/15 mt-1">
                                  <FileText className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                                  <span className="text-[10px] text-amber-900 dark:text-amber-200 truncate">
                                    {msg.attachment_name}
                                  </span>
                                </div>
                              )}
                            </a>
                          )}

                          {/* Message text */}
                          {msg.message && !msg.message.startsWith("📎") && (
                            <p className="text-[11px] text-amber-950 dark:text-white/85 leading-relaxed">
                              {msg.message}
                            </p>
                          )}

                          {/* Timestamp */}
                          <p className="text-[8px] text-amber-600/60 dark:text-amber-500/50 text-right">
                            {format(new Date(msg.created_at), "HH:mm")}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-amber-300/30 dark:border-amber-500/15 p-2 bg-gradient-to-r from-amber-100/70 to-orange-100/50 dark:from-amber-950/35 dark:to-orange-950/25">
              <div className="flex items-center gap-1.5">
                {/* File upload button */}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="h-8 w-8 p-0 text-amber-700 dark:text-amber-400/70 hover:text-amber-900 dark:hover:text-amber-200 hover:bg-amber-200/40 dark:hover:bg-amber-500/10"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {/* Message input */}
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 h-8 text-[11px] bg-white/60 dark:bg-amber-950/20 border-amber-300/30 dark:border-amber-500/15 placeholder:text-amber-500/50 text-amber-950 dark:text-white/90 focus-visible:ring-amber-400/30"
                  disabled={isSending}
                />

                {/* Send button */}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSend}
                  disabled={isSending || (!newMessage.trim() && !isUploading)}
                  className="h-8 w-8 p-0 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-md disabled:opacity-30"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
