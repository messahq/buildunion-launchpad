import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  MessageSquare, 
  Crown,
  Loader2,
  Send,
  X,
  ChevronLeft,
  Circle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  companyName: string | null;
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const TeamChat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Only Premium and Enterprise can access
  const hasPremiumAccess = subscription.tier === "premium" || subscription.tier === "enterprise";

  useEffect(() => {
    if (user && hasPremiumAccess) {
      fetchTeamMembers();
    } else {
      setIsLoading(false);
    }
  }, [user, hasPremiumAccess]);

  useEffect(() => {
    if (selectedMember && user) {
      fetchMessages(selectedMember.id);
      markMessagesAsRead(selectedMember.id);

      // Subscribe to new messages
      const channel = supabase
        .channel(`messages-${selectedMember.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "team_messages",
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            const newMsg = payload.new as any;
            if (newMsg.sender_id === selectedMember.id) {
              setMessages(prev => [...prev, {
                id: newMsg.id,
                senderId: newMsg.sender_id,
                recipientId: newMsg.recipient_id,
                message: newMsg.message,
                isRead: newMsg.is_read,
                createdAt: newMsg.created_at,
              }]);
              markMessagesAsRead(selectedMember.id);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedMember, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchTeamMembers = async () => {
    if (!user) return;

    try {
      // Get projects where user is owner or member
      const { data: ownedProjects } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", user.id);

      const { data: memberProjects } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id);

      const projectIds = [
        ...(ownedProjects?.map(p => p.id) || []),
        ...(memberProjects?.map(p => p.project_id) || [])
      ];

      if (projectIds.length === 0) {
        setTeamMembers([]);
        setIsLoading(false);
        return;
      }

      // Get all members from those projects
      const { data: members } = await supabase
        .from("project_members")
        .select("user_id")
        .in("project_id", projectIds);

      // Get project owners
      const { data: owners } = await supabase
        .from("projects")
        .select("user_id")
        .in("id", projectIds);

      const allUserIds = [
        ...new Set([
          ...(members?.map(m => m.user_id) || []),
          ...(owners?.map(o => o.user_id) || [])
        ])
      ].filter(id => id !== user.id);

      if (allUserIds.length === 0) {
        setTeamMembers([]);
        setIsLoading(false);
        return;
      }

      // Fetch their profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", allUserIds);

      const { data: buProfiles } = await supabase
        .from("bu_profiles")
        .select("user_id, company_name, avatar_url")
        .in("user_id", allUserIds);

      // Get unread message counts
      const { data: unreadMessages } = await supabase
        .from("team_messages")
        .select("sender_id")
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      // Get last messages
      const { data: lastMessages } = await supabase
        .from("team_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      // Combine data
      const teamData: TeamMember[] = allUserIds.map(userId => {
        const profile = profiles?.find(p => p.user_id === userId);
        const buProfile = buProfiles?.find(bp => bp.user_id === userId);
        const unreadCount = unreadMessages?.filter(m => m.sender_id === userId).length || 0;
        const lastMsg = lastMessages?.find(m => 
          (m.sender_id === userId && m.recipient_id === user.id) ||
          (m.sender_id === user.id && m.recipient_id === userId)
        );

        return {
          id: userId,
          fullName: profile?.full_name || "Team Member",
          avatarUrl: buProfile?.avatar_url || profile?.avatar_url || null,
          companyName: buProfile?.company_name || null,
          unreadCount,
          lastMessage: lastMsg?.message,
          lastMessageAt: lastMsg?.created_at,
        };
      });

      // Sort by last message or unread count
      teamData.sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
        if (a.lastMessageAt && b.lastMessageAt) {
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        }
        return 0;
      });

      setTeamMembers(teamData);
    } catch (err) {
      console.error("Error fetching team members:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (memberId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("team_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${memberId}),and(sender_id.eq.${memberId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(data?.map(m => ({
        id: m.id,
        senderId: m.sender_id,
        recipientId: m.recipient_id,
        message: m.message,
        isRead: m.is_read,
        createdAt: m.created_at,
      })) || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const markMessagesAsRead = async (memberId: string) => {
    if (!user) return;

    try {
      await supabase
        .from("team_messages")
        .update({ is_read: true })
        .eq("sender_id", memberId)
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      // Update local state
      setTeamMembers(prev => 
        prev.map(m => m.id === memberId ? { ...m, unreadCount: 0 } : m)
      );
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedMember || !newMessage.trim()) return;

    setIsSending(true);

    try {
      const { data, error } = await supabase
        .from("team_messages")
        .insert({
          sender_id: user.id,
          recipient_id: selectedMember.id,
          message: newMessage.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, {
        id: data.id,
        senderId: data.sender_id,
        recipientId: data.recipient_id,
        message: data.message,
        isRead: data.is_read,
        createdAt: data.created_at,
      }]);

      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const totalUnread = teamMembers.reduce((sum, m) => sum + m.unreadCount, 0);

  // Locked state for non-premium users
  if (!hasPremiumAccess) {
    return (
      <Card className="bg-white border-slate-200 overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-slate-100 to-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-slate-400" />
              <CardTitle className="text-lg font-semibold text-slate-400">
                Team Chat
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">
              <Crown className="h-3 w-3 mr-1" />
              Premium+
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-2">Direct Messaging</h3>
            <p className="text-sm text-slate-500 mb-4">
              Chat with your team members in real-time
            </p>
            <Button 
              onClick={() => navigate("/buildunion/pricing")}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              Upgrade to Premium
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white border-slate-200 overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                {totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </div>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Team Chat
              </CardTitle>
            </div>
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
              {teamMembers.length} contacts
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No team members yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Join projects to start chatting
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[250px]">
              <div className="divide-y divide-slate-100">
                {teamMembers.map(member => (
                  <SheetTrigger key={member.id} asChild>
                    <button
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                      onClick={() => setSelectedMember(member)}
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback className="bg-indigo-100 text-indigo-700">
                            {getInitials(member.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <Circle className="absolute bottom-0 right-0 w-3 h-3 fill-green-500 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {member.fullName}
                          </p>
                          {member.lastMessageAt && (
                            <span className="text-xs text-slate-400">
                              {formatDistanceToNow(new Date(member.lastMessageAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {member.lastMessage || member.companyName || "Start a conversation"}
                        </p>
                      </div>
                      {member.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white shrink-0">
                          {member.unreadCount}
                        </Badge>
                      )}
                    </button>
                  </SheetTrigger>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Chat Sheet */}
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => setSelectedMember(null)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {selectedMember && (
              <>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedMember.avatarUrl || undefined} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-700">
                    {getInitials(selectedMember.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-left truncate">
                    {selectedMember.fullName}
                  </SheetTitle>
                  <p className="text-xs text-slate-500 truncate">
                    {selectedMember.companyName || "Team Member"}
                  </p>
                </div>
              </>
            )}
          </div>
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.map(msg => {
              const isMine = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      isMine
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-slate-100 text-slate-800 rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? "text-indigo-200" : "text-slate-400"}`}>
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TeamChat;
