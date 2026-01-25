import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  Search, 
  Send, 
  ArrowLeft,
  User,
  Clock,
  Check,
  CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  partnerCompany?: string;
  partnerTrade?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isLastMessageMine: boolean;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const tradeLabels: Record<string, string> = {
  general_contractor: "General Contractor",
  electrician: "Electrician",
  plumber: "Plumber",
  carpenter: "Carpenter",
  mason: "Mason",
  roofer: "Roofer",
  hvac_technician: "HVAC Technician",
  painter: "Painter",
  welder: "Welder",
  heavy_equipment_operator: "Heavy Equipment Operator",
  concrete_worker: "Concrete Worker",
  drywall_installer: "Drywall Installer",
  flooring_specialist: "Flooring Specialist",
  landscaper: "Landscaper",
  project_manager: "Project Manager",
  architect: "Architect",
  engineer: "Engineer",
  inspector: "Inspector",
  other: "Other",
};

export default function BuildUnionMessages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/buildunion/login");
      return;
    }
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (selectedConversation && user) {
      fetchMessages(selectedConversation.partnerId);
      
      // Set up realtime subscription
      const channel = supabase
        .channel(`inbox-${selectedConversation.partnerId}`)
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
            if (newMsg.sender_id === selectedConversation.partnerId) {
              setMessages(prev => [...prev, {
                id: newMsg.id,
                senderId: newMsg.sender_id,
                recipientId: newMsg.recipient_id,
                message: newMsg.message,
                isRead: newMsg.is_read,
                createdAt: newMsg.created_at,
              }]);
              markMessagesAsRead(selectedConversation.partnerId);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConversation, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredConversations(
        conversations.filter(c => 
          c.partnerName.toLowerCase().includes(query) ||
          c.partnerCompany?.toLowerCase().includes(query) ||
          c.partnerTrade?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch all messages for this user
      const { data: allMessages, error } = await supabase
        .from("team_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group messages by conversation partner
      const conversationMap = new Map<string, {
        partnerId: string;
        messages: any[];
        unreadCount: number;
      }>();

      allMessages?.forEach(msg => {
        const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            partnerId,
            messages: [],
            unreadCount: 0,
          });
        }
        
        const conv = conversationMap.get(partnerId)!;
        conv.messages.push(msg);
        
        if (msg.recipient_id === user.id && !msg.is_read) {
          conv.unreadCount++;
        }
      });

      // Fetch partner profiles
      const partnerIds = Array.from(conversationMap.keys());
      
      if (partnerIds.length === 0) {
        setConversations([]);
        setFilteredConversations([]);
        setIsLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", partnerIds);

      const { data: buProfiles } = await supabase
        .from("bu_profiles")
        .select("user_id, company_name, primary_trade, avatar_url")
        .in("user_id", partnerIds);

      const profileMap = new Map<string, any>();
      profiles?.forEach(p => profileMap.set(p.user_id, p));

      const buProfileMap = new Map<string, any>();
      buProfiles?.forEach(p => buProfileMap.set(p.user_id, p));

      // Build conversation list
      const convList: Conversation[] = [];
      conversationMap.forEach((conv, partnerId) => {
        const profile = profileMap.get(partnerId);
        const buProfile = buProfileMap.get(partnerId);
        const lastMsg = conv.messages[0];
        
        convList.push({
          partnerId,
          partnerName: profile?.full_name || buProfile?.company_name || "Unknown User",
          partnerAvatar: buProfile?.avatar_url || profile?.avatar_url,
          partnerCompany: buProfile?.company_name,
          partnerTrade: buProfile?.primary_trade,
          lastMessage: lastMsg.message,
          lastMessageTime: lastMsg.created_at,
          unreadCount: conv.unreadCount,
          isLastMessageMine: lastMsg.sender_id === user.id,
        });
      });

      // Sort by last message time
      convList.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      setConversations(convList);
      setFilteredConversations(convList);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      toast.error("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (partnerId: string) => {
    if (!user) return;
    setIsLoadingMessages(true);

    try {
      const { data, error } = await supabase
        .from("team_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`)
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

      markMessagesAsRead(partnerId);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const markMessagesAsRead = async (partnerId: string) => {
    if (!user) return;

    try {
      await supabase
        .from("team_messages")
        .update({ is_read: true })
        .eq("sender_id", partnerId)
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      // Update local conversation unread count
      setConversations(prev => prev.map(c => 
        c.partnerId === partnerId ? { ...c, unreadCount: 0 } : c
      ));
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    setIsSending(true);

    try {
      const { data, error } = await supabase
        .from("team_messages")
        .insert({
          sender_id: user.id,
          recipient_id: selectedConversation.partnerId,
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

      // Update conversation in list
      setConversations(prev => {
        const updated = prev.map(c => 
          c.partnerId === selectedConversation.partnerId 
            ? { ...c, lastMessage: data.message, lastMessageTime: data.created_at, isLastMessageMine: true }
            : c
        );
        return updated.sort((a, b) => 
          new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        );
      });

      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <BuildUnionHeader />
      
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/buildunion/workspace")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-cyan-500" />
              Messages
              {totalUnread > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {totalUnread}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              Direct messages with your connections
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-280px)] min-h-[500px]">
          {/* Conversations List */}
          <Card className="md:col-span-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-3 space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No conversations yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start a conversation from the Member Directory
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate("/buildunion/community")}
                  >
                    Go to Community
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map(conv => {
                    const initials = conv.partnerName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                    const isSelected = selectedConversation?.partnerId === conv.partnerId;
                    
                    return (
                      <button
                        key={conv.partnerId}
                        onClick={() => setSelectedConversation(conv)}
                        className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                          isSelected ? "bg-muted" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={conv.partnerAvatar || undefined} />
                              <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-sm">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            {conv.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`font-medium truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-foreground/80"}`}>
                                {conv.partnerName}
                              </p>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: false })}
                              </span>
                            </div>
                            {conv.partnerTrade && (
                              <p className="text-xs text-muted-foreground truncate">
                                {tradeLabels[conv.partnerTrade] || conv.partnerTrade}
                              </p>
                            )}
                            <p className={`text-sm truncate mt-0.5 ${conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                              {conv.isLastMessageMine && (
                                <span className="text-muted-foreground">You: </span>
                              )}
                              {conv.lastMessage}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-2 flex flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedConversation.partnerAvatar || undefined} />
                    <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      {selectedConversation.partnerName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedConversation.partnerName}</p>
                    {selectedConversation.partnerTrade && (
                      <p className="text-sm text-muted-foreground truncate">
                        {tradeLabels[selectedConversation.partnerTrade] || selectedConversation.partnerTrade}
                        {selectedConversation.partnerCompany && ` • ${selectedConversation.partnerCompany}`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-2" />
                      <p className="text-muted-foreground">No messages yet</p>
                      <p className="text-sm text-muted-foreground">Send a message to start the conversation</p>
                    </div>
                  ) : (
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
                                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-br-sm"
                                  : "bg-muted text-foreground rounded-bl-sm"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                              <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                                <p className={`text-[10px] ${isMine ? "text-cyan-100" : "text-muted-foreground"}`}>
                                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                </p>
                                {isMine && (
                                  msg.isRead ? (
                                    <CheckCheck className="h-3 w-3 text-cyan-100" />
                                  ) : (
                                    <Check className="h-3 w-3 text-cyan-200" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isSending}
                      className="flex-1"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={isSending || !newMessage.trim()}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageSquare className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Select a conversation
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Choose a conversation from the list to start messaging, or find new connections in the Community directory.
                </p>
              </div>
            )}
          </Card>
        </div>
      </main>

      <BuildUnionFooter />
    </div>
  );
}
