import { useState, useEffect, useRef } from "react";
import { 
  MapPin, 
  Briefcase, 
  Clock, 
  CheckCircle, 
  Users, 
  MessageSquare, 
  Phone, 
  Globe, 
  Send,
  Award,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface MemberDetailDialogProps {
  member: {
    id: string;
    user_id: string;
    avatar_url?: string;
    company_name?: string;
    primary_trade?: string;
    secondary_trades?: string[];
    availability?: string;
    service_area?: string;
    experience_years?: number;
    is_verified?: boolean;
    is_contractor?: boolean;
    is_union_member?: boolean;
    union_name?: string;
    bio?: string;
    phone?: string;
    company_website?: string;
    certifications?: string[];
    experience_level?: string;
  } | null;
  profileName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const experienceLevelLabels: Record<string, string> = {
  apprentice: "Apprentice",
  journeyman: "Journeyman",
  master: "Master",
  supervisor: "Supervisor",
  manager: "Manager",
};

const availabilityColors: Record<string, string> = {
  available: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  busy: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  unavailable: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export const MemberDetailDialog = ({ member, profileName, open, onOpenChange }: MemberDetailDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasPremiumAccess = subscription.tier === "premium" || subscription.tier === "enterprise";
  const isOwnProfile = user?.id === member?.user_id;

  const displayName = profileName || member?.company_name || "BuildUnion Member";
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const tradeName = member?.primary_trade ? tradeLabels[member.primary_trade] || member.primary_trade : "Trade Professional";

  useEffect(() => {
    if (showChat && member && user) {
      fetchMessages();
      
      const channel = supabase
        .channel(`dm-${member.user_id}`)
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
            if (newMsg.sender_id === member.user_id) {
              setMessages(prev => [...prev, {
                id: newMsg.id,
                senderId: newMsg.sender_id,
                recipientId: newMsg.recipient_id,
                message: newMsg.message,
                isRead: newMsg.is_read,
                createdAt: newMsg.created_at,
              }]);
              markMessagesAsRead();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [showChat, member, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!open) {
      setShowChat(false);
      setMessages([]);
      setNewMessage("");
    }
  }, [open]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    if (!user || !member) return;
    setIsLoadingMessages(true);

    try {
      const { data, error } = await supabase
        .from("team_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${member.user_id}),and(sender_id.eq.${member.user_id},recipient_id.eq.${user.id})`)
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

      markMessagesAsRead();
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user || !member) return;

    try {
      await supabase
        .from("team_messages")
        .update({ is_read: true })
        .eq("sender_id", member.user_id)
        .eq("recipient_id", user.id)
        .eq("is_read", false);
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  const sendMessage = async () => {
    if (!user || !member || !newMessage.trim()) return;

    setIsSending(true);

    try {
      const { data, error } = await supabase
        .from("team_messages")
        .insert({
          sender_id: user.id,
          recipient_id: member.user_id,
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
      toast.success("Message sent!");
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleStartChat = () => {
    if (!user) {
      toast.error("Please log in to send messages");
      return;
    }
    if (!hasPremiumAccess) {
      toast.info("Direct messaging is a Premium feature", {
        action: {
          label: "Upgrade",
          onClick: () => navigate("/buildunion/pricing"),
        },
      });
      return;
    }
    setShowChat(true);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="sr-only">Member Profile</DialogTitle>
        </DialogHeader>

        {!showChat ? (
          <div className="space-y-4 overflow-y-auto">
            {/* Profile Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
                  {member.is_verified && (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  )}
                </div>
                {member.company_name && profileName && member.company_name !== profileName && (
                  <p className="text-sm text-muted-foreground">{member.company_name}</p>
                )}
                <p className="text-muted-foreground">{tradeName}</p>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {member.availability && (
                    <Badge 
                      variant="secondary" 
                      className={availabilityColors[member.availability] || availabilityColors.available}
                    >
                      {member.availability}
                    </Badge>
                  )}
                  {member.is_contractor && (
                    <Badge variant="outline">
                      <Briefcase className="h-3 w-3 mr-1" />
                      Contractor
                    </Badge>
                  )}
                  {member.is_union_member && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      <Users className="h-3 w-3 mr-1" />
                      Union
                    </Badge>
                  )}
                  {member.experience_level && (
                    <Badge variant="outline">
                      {experienceLevelLabels[member.experience_level] || member.experience_level}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Details */}
            <div className="grid gap-3">
              {member.bio && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">About</p>
                  <p className="text-sm text-muted-foreground">{member.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {member.service_area && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{member.service_area}</span>
                  </div>
                )}
                {member.experience_years && member.experience_years > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{member.experience_years} years experience</span>
                  </div>
                )}
              </div>

              {member.union_name && member.is_union_member && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <Users className="h-4 w-4" />
                  <span>{member.union_name}</span>
                </div>
              )}

              {member.certifications && member.certifications.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                    <Award className="h-4 w-4" /> Certifications
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {member.certifications.map((cert, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {member.secondary_trades && member.secondary_trades.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Other Trades</p>
                  <div className="flex flex-wrap gap-1">
                    {member.secondary_trades.map((trade) => (
                      <Badge key={trade} variant="outline" className="text-xs">
                        {tradeLabels[trade] || trade}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Contact Options */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">Contact</p>
              <div className="grid grid-cols-1 gap-2">
                {/* Message Button - Always show for other users' profiles */}
                {!isOwnProfile && (
                  <Button 
                    onClick={handleStartChat}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                    {!hasPremiumAccess && user && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">Premium</Badge>
                    )}
                  </Button>
                )}
                
                {/* Call and Website buttons */}
                <div className="flex gap-2">
                  {member.phone && (
                    <Button
                      variant="outline"
                      asChild
                      className="flex-1"
                    >
                      <a href={`tel:${member.phone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </a>
                    </Button>
                  )}
                  {member.company_website && (
                    <Button
                      variant="outline"
                      asChild
                      className="flex-1"
                    >
                      <a 
                        href={member.company_website.startsWith('http') ? member.company_website : `https://${member.company_website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Chat View
          <div className="flex flex-col h-[400px]">
            <div className="flex items-center gap-3 pb-3 border-b">
              <Button variant="ghost" size="sm" onClick={() => setShowChat(false)}>
                <X className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{tradeName}</p>
              </div>
            </div>

            <ScrollArea className="flex-1 py-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                  <p className="text-xs text-muted-foreground">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="space-y-3 px-1">
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
                              : "bg-muted text-foreground rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? "text-indigo-200" : "text-muted-foreground"}`}>
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2 pt-3 border-t">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                disabled={isSending}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage} 
                disabled={!newMessage.trim() || isSending}
                size="icon"
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
