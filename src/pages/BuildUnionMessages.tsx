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
  CheckCheck,
  Crown,
  Lock,
  Mail,
  Shield,
  X,
  FileText,
  Users,
  Plus,
  Trash2,
  Upload,
  Download,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useAdminRole } from "@/hooks/useAdminRole";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// Email Templates
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
}

const emailTemplates: EmailTemplate[] = [
  {
    id: "custom",
    name: "✍️ Custom Email",
    subject: "",
    message: "",
  },
  {
    id: "welcome",
    name: "👋 Welcome Email",
    subject: "Welcome to BuildUnion!",
    message: `Welcome to BuildUnion - Canada's leading construction management platform!

We're excited to have you join our growing community of construction professionals. Here's what you can do with BuildUnion:

• Create and manage construction projects
• Connect with skilled tradespeople in your area
• Generate professional quotes and contracts
• Track project progress in real-time

If you have any questions, don't hesitate to reach out. We're here to help you build better, together.

Best regards,
The BuildUnion Team`,
  },
  {
    id: "reminder",
    name: "⏰ Reminder",
    subject: "Reminder: Action Required",
    message: `This is a friendly reminder regarding your BuildUnion account.

We noticed that there are pending items that require your attention. Please log in to your account to review and complete any outstanding tasks.

If you need any assistance, our support team is always ready to help.

Thank you for being a valued member of the BuildUnion community.

Best regards,
The BuildUnion Team`,
  },
  {
    id: "project-update",
    name: "📋 Project Update",
    subject: "Project Update from BuildUnion",
    message: `We wanted to keep you updated on recent developments.

Here are the latest updates:

• [Project milestone or status update]
• [New features or improvements]
• [Important deadlines or dates]

Please review these updates and let us know if you have any questions or concerns.

We appreciate your continued partnership with BuildUnion.

Best regards,
The BuildUnion Team`,
  },
  {
    id: "invoice-reminder",
    name: "💰 Invoice Reminder",
    subject: "Invoice Reminder - Payment Due",
    message: `This is a reminder regarding an outstanding invoice.

We wanted to bring to your attention that payment is due for services rendered. Please review the invoice details and arrange for payment at your earliest convenience.

If you have already made the payment, please disregard this message. If you have any questions about the invoice, please don't hesitate to contact us.

Thank you for your prompt attention to this matter.

Best regards,
The BuildUnion Team`,
  },
  {
    id: "thank-you",
    name: "🙏 Thank You",
    subject: "Thank You from BuildUnion",
    message: `Thank you for your recent interaction with BuildUnion!

We truly appreciate your trust in our platform and are committed to providing you with the best construction management experience possible.

Your feedback and continued support help us improve and grow. If there's anything we can do to better serve you, please don't hesitate to let us know.

Wishing you success in all your projects!

Warm regards,
The BuildUnion Team`,
  },
];

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
  const { subscription } = useSubscription();
  const { isAdmin } = useAdminRole();
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
  
  // Admin Email Compose State
  const [isAdminEmailDialogOpen, setIsAdminEmailDialogOpen] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  const [adminEmailTo, setAdminEmailTo] = useState("");
  const [adminEmailName, setAdminEmailName] = useState("");
  const [adminEmailSubject, setAdminEmailSubject] = useState("");
  const [adminEmailMessage, setAdminEmailMessage] = useState("");
  const [isSendingAdminEmail, setIsSendingAdminEmail] = useState(false);
  
  // Bulk email recipients
  const [bulkRecipients, setBulkRecipients] = useState<Array<{ email: string; name: string }>>([
    { email: "", name: "" }
  ]);
  const [bulkSendProgress, setBulkSendProgress] = useState<{ sent: number; total: number; errors: string[] } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setAdminEmailSubject(template.subject);
      setAdminEmailMessage(template.message);
    }
  };

  // Bulk recipient helpers
  const addBulkRecipient = () => {
    setBulkRecipients(prev => [...prev, { email: "", name: "" }]);
  };

  const removeBulkRecipient = (index: number) => {
    if (bulkRecipients.length > 1) {
      setBulkRecipients(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateBulkRecipient = (index: number, field: "email" | "name", value: string) => {
    setBulkRecipients(prev => prev.map((r, i) => 
      i === index ? { ...r, [field]: value } : r
    ));
  };

  // CSV Import functionality
  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length === 0) {
          toast.error("CSV file is empty");
          return;
        }

        // Detect header row
        const firstLine = lines[0].toLowerCase();
        const hasHeader = firstLine.includes('email') || firstLine.includes('name') || firstLine.includes('e-mail');
        const startIndex = hasHeader ? 1 : 0;

        const importedRecipients: Array<{ email: string; name: string }> = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Parse CSV line (handle quoted values)
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if ((char === ',' || char === ';') && !inQuotes) {
              values.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim().replace(/^"|"$/g, ''));

          // Try to find email and name
          let email = '';
          let name = '';

          for (const val of values) {
            const trimmedVal = val.trim();
            if (emailRegex.test(trimmedVal) && !email) {
              email = trimmedVal;
            } else if (trimmedVal && !name && !emailRegex.test(trimmedVal)) {
              name = trimmedVal;
            }
          }

          if (email) {
            importedRecipients.push({ email, name });
          }
        }

        if (importedRecipients.length === 0) {
          toast.error("No valid email addresses found in the CSV file");
          return;
        }

        // Merge with existing recipients (remove empty ones first)
        const existingNonEmpty = bulkRecipients.filter(r => r.email.trim());
        const allRecipients = [...existingNonEmpty, ...importedRecipients];
        
        // Remove duplicates by email
        const uniqueRecipients = allRecipients.filter((r, index, self) => 
          index === self.findIndex(t => t.email.toLowerCase() === r.email.toLowerCase())
        );

        setBulkRecipients(uniqueRecipients.length > 0 ? uniqueRecipients : [{ email: "", name: "" }]);
        toast.success(`Imported ${importedRecipients.length} recipients from CSV`, {
          description: uniqueRecipients.length !== importedRecipients.length + existingNonEmpty.length 
            ? `${(importedRecipients.length + existingNonEmpty.length) - uniqueRecipients.length} duplicates removed`
            : undefined
        });
      } catch (err) {
        console.error("CSV parsing error:", err);
        toast.error("Failed to parse CSV file");
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read the file");
    };

    reader.readAsText(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  // Download CSV template
  const downloadCSVTemplate = () => {
    const csvContent = "email,name\nexample@email.com,John Doe\nanother@email.com,Jane Smith";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bulk_email_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const resetAdminEmailDialog = () => {
    setSelectedTemplate("custom");
    setAdminEmailTo("");
    setAdminEmailName("");
    setAdminEmailSubject("");
    setAdminEmailMessage("");
    setBulkRecipients([{ email: "", name: "" }]);
    setBulkSendProgress(null);
    setIsBulkMode(false);
    setIsAdminEmailDialogOpen(false);
  };

  // Premium access check
  const hasPremiumAccess = subscription.tier === "premium" || subscription.tier === "enterprise";

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

  const sendPushNotification = async (recipientId: string, senderName: string, messagePreview: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke("send-message-notification", {
        body: {
          recipientId,
          senderName,
          messagePreview: messagePreview.length > 50 ? messagePreview.slice(0, 50) + "..." : messagePreview,
        },
      });
    } catch (err) {
      // Silent fail - push notification is not critical
      console.error("Error sending push notification:", err);
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    // Check premium access before sending
    if (!hasPremiumAccess) {
      toast.error("Direct messaging is a Premium feature", {
        action: {
          label: "Upgrade",
          onClick: () => navigate("/buildunion/pricing"),
        },
      });
      return;
    }

    setIsSending(true);
    const messageText = newMessage.trim();

    try {
      const { data, error } = await supabase
        .from("team_messages")
        .insert({
          sender_id: user.id,
          recipient_id: selectedConversation.partnerId,
          message: messageText,
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

      // Send push notification to recipient
      const senderName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Someone";
      sendPushNotification(selectedConversation.partnerId, senderName, messageText);
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

  // Generate Email Preview HTML
  const generateEmailPreviewHtml = () => {
    const now = new Date();
    const torontoDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Toronto'
    });
    const torontoTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Toronto'
    });
    
    const recipientName = isBulkMode 
      ? (bulkRecipients.find(r => r.name.trim())?.name || "Recipient")
      : (adminEmailName || "Recipient");
    
    const messageHtml = adminEmailMessage.split('\n').map(line => 
      line.trim() ? `<p style="margin: 0 0 12px 0; line-height: 1.6;">${line}</p>` : ''
    ).join('');

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- HEADER -->
        <div style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); padding: 32px; text-align: center; border-bottom: 3px solid #f59e0b;">
          <div style="font-family: 'Montserrat', sans-serif; font-size: 28px; font-weight: 300; letter-spacing: 1px;">
            <span style="color: #475569;">Build</span><span style="color: #f59e0b;">Union</span>
          </div>
          <div style="font-size: 12px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px;">
            Construction Management Platform
          </div>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <span style="display: inline-block; padding: 0 16px; border-right: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              🌐 <a href="https://buildunion.ca" style="color: #374151; text-decoration: none; font-weight: 500;">buildunion.ca</a>
            </span>
            <span style="display: inline-block; padding: 0 16px; border-right: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              📧 <a href="mailto:admin@buildunion.ca" style="color: #374151; text-decoration: none; font-weight: 500;">admin@buildunion.ca</a>
            </span>
            <span style="display: inline-block; padding: 0 16px; font-size: 12px; color: #64748b;">
              📍 Toronto, Ontario, Canada
            </span>
          </div>
        </div>
        
        <!-- META BAR -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 16px 32px; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: flex-start; align-items: center; gap: 12px; padding-left: 96px;">
            <span style="font-size: 13px; color: #64748b;">${torontoDate}</span>
            <span style="color: #cbd5e1;">•</span>
            <span style="font-size: 12px; font-weight: 600; color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">OFFICIAL MESSAGE</span>
            <span style="color: #cbd5e1;">•</span>
            <span style="font-size: 13px; color: #64748b;">${torontoTime} (Toronto)</span>
          </div>
        </div>

        <!-- CONTENT -->
        <div style="padding: 40px 32px;">
          <p style="font-size: 18px; color: #1e293b; margin-bottom: 24px; font-weight: 500;">
            Dear ${recipientName},
          </p>
          
          <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-left: 4px solid #f59e0b; padding: 24px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">
              📝 Subject: ${adminEmailSubject || 'No subject'}
            </p>
            <div style="font-size: 15px; color: #1e293b; line-height: 1.7;">
              ${messageHtml || '<p style="color: #64748b;">No message content</p>'}
            </div>
          </div>
          
          <p style="font-size: 15px; color: #475569; margin-top: 32px; line-height: 1.6;">
            Best regards,<br />
            <strong style="color: #1e293b;">The BuildUnion Admin Team</strong>
          </p>
        </div>

        <!-- FOOTER -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <div style="font-family: 'Montserrat', sans-serif; font-size: 24px; font-weight: 300; margin-bottom: 16px; letter-spacing: 1px;">
            <span style="color: #475569;">Build</span><span style="color: #f59e0b;">Union</span>
          </div>
          
          <div style="height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 24px 0;"></div>
          
          <div style="margin: 20px 0; padding-left: 45px;">
            <span style="display: inline-block; margin: 6px 16px; font-size: 13px; color: #64748b;">
              🌐 <a href="https://buildunion.ca" style="color: #374151; text-decoration: none;">buildunion.ca</a>
            </span>
            <span style="display: inline-block; margin: 6px 16px; font-size: 13px; color: #64748b;">
              📧 <a href="mailto:admin@buildunion.ca" style="color: #374151; text-decoration: none;">admin@buildunion.ca</a>
            </span>
            <span style="display: inline-block; margin: 6px 16px; font-size: 13px; color: #64748b;">
              📞 <a href="tel:+14376011426" style="color: #374151; text-decoration: none;">437-601-1426</a>
            </span>
            <span style="display: inline-block; margin: 6px 16px; font-size: 13px; color: #64748b;">
              📍 Toronto, Ontario, Canada
            </span>
          </div>
          
          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 4px 0; font-size: 12px; color: #475569;">© 2026 BuildUnion. All rights reserved.</p>
            <p style="margin: 4px 0; font-size: 11px; color: #64748b;">This is an official communication from BuildUnion Admin.</p>
          </div>
        </div>
      </div>
    `;
  };

  // Send Admin Email (single or bulk)
  const sendAdminEmail = async () => {
    if (!adminEmailSubject.trim() || !adminEmailMessage.trim()) {
      toast.error("Please fill in subject and message");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (isBulkMode) {
      // Bulk send mode
      const validRecipients = bulkRecipients.filter(r => r.email.trim() && emailRegex.test(r.email.trim()));
      
      if (validRecipients.length === 0) {
        toast.error("Please add at least one valid recipient email");
        return;
      }

      setIsSendingAdminEmail(true);
      setBulkSendProgress({ sent: 0, total: validRecipients.length, errors: [] });

      const errors: string[] = [];
      let sent = 0;

      for (const recipient of validRecipients) {
        try {
          const response = await supabase.functions.invoke("send-admin-email", {
            body: {
              recipientEmail: recipient.email.trim(),
              recipientName: recipient.name.trim() || undefined,
              subject: adminEmailSubject.trim(),
              message: adminEmailMessage.trim(),
            },
          });

          if (response.error || !response.data?.success) {
            errors.push(`${recipient.email}: ${response.data?.error || response.error?.message || "Failed"}`);
          } else {
            sent++;
          }
        } catch (err) {
          errors.push(`${recipient.email}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }

        setBulkSendProgress({ sent, total: validRecipients.length, errors });
      }

      if (errors.length === 0) {
        toast.success(`All ${sent} emails sent successfully!`);
        resetAdminEmailDialog();
      } else if (sent > 0) {
        toast.warning(`Sent ${sent}/${validRecipients.length} emails. ${errors.length} failed.`);
      } else {
        toast.error("All emails failed to send");
      }

      setIsSendingAdminEmail(false);
    } else {
      // Single email mode
      if (!adminEmailTo.trim()) {
        toast.error("Please enter recipient email");
        return;
      }

      if (!emailRegex.test(adminEmailTo.trim())) {
        toast.error("Please enter a valid email address");
        return;
      }

      setIsSendingAdminEmail(true);

      try {
        const response = await supabase.functions.invoke("send-admin-email", {
          body: {
            recipientEmail: adminEmailTo.trim(),
            recipientName: adminEmailName.trim() || undefined,
            subject: adminEmailSubject.trim(),
            message: adminEmailMessage.trim(),
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        if (response.data?.success) {
          toast.success(`Email sent to ${adminEmailTo}`, {
            description: `Subject: ${adminEmailSubject}`,
          });
          resetAdminEmailDialog();
        } else {
          throw new Error(response.data?.error || "Failed to send email");
        }
      } catch (err) {
        console.error("Error sending admin email:", err);
        toast.error(err instanceof Error ? err.message : "Failed to send email");
      } finally {
        setIsSendingAdminEmail(false);
      }
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-cyan-500" />
                Messages
                {totalUnread > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {totalUnread}
                  </Badge>
                )}
              </h1>
              {!hasPremiumAccess && (
                <Badge variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950 dark:border-cyan-800 dark:text-cyan-300">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium Feature
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Direct messages with your connections
            </p>
          </div>
          
          {/* Admin Email Button */}
          {isAdmin && (
            <Button
              onClick={() => setIsAdminEmailDialogOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white gap-2"
            >
              <Shield className="h-4 w-4" />
              <Mail className="h-4 w-4" />
              Admin Email
            </Button>
          )}
        </div>

        {/* Admin Email Compose Dialog */}
        <Dialog open={isAdminEmailDialogOpen} onOpenChange={(open) => {
          if (!open) resetAdminEmailDialog();
          else setIsAdminEmailDialogOpen(true);
        }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-500" />
                {isBulkMode ? "Bulk Email - Send to Multiple Recipients" : "Send Email as Admin"}
              </DialogTitle>
              <DialogDescription>
                Send an email from <span className="font-medium text-amber-600">admin@buildunion.ca</span> to {isBulkMode ? "multiple recipients" : "any recipient"}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                <Button
                  variant={!isBulkMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsBulkMode(false)}
                  className={!isBulkMode ? "bg-amber-500 hover:bg-amber-600" : ""}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Single Email
                </Button>
                <Button
                  variant={isBulkMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsBulkMode(true)}
                  className={isBulkMode ? "bg-amber-500 hover:bg-amber-600" : ""}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Send
                </Button>
              </div>

              {/* Template Selector */}
              <div className="space-y-2">
                <Label htmlFor="email-template" className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-500" />
                  Email Template
                </Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {emailTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="h-px bg-border" />

              {/* Recipients Section */}
              {isBulkMode ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-amber-500" />
                      Recipients ({bulkRecipients.filter(r => r.email.trim()).length})
                    </Label>
                    <div className="flex items-center gap-2">
                      {/* CSV Import */}
                      <div className="relative">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCSVImport}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          title="Import CSV"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1 pointer-events-none"
                        >
                          <Upload className="h-3 w-3" />
                          Import CSV
                        </Button>
                      </div>
                      {/* Download Template */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={downloadCSVTemplate}
                        className="gap-1 text-muted-foreground hover:text-foreground"
                        title="Download CSV template"
                      >
                        <Download className="h-3 w-3" />
                        Template
                      </Button>
                      {/* Add Recipient */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addBulkRecipient}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </Button>
                    </div>
                  </div>
                  
                  <ScrollArea className="max-h-48 pr-4">
                    <div className="space-y-2">
                      {bulkRecipients.map((recipient, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            type="email"
                            placeholder="email@example.com"
                            value={recipient.email}
                            onChange={(e) => updateBulkRecipient(index, "email", e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Name (optional)"
                            value={recipient.name}
                            onChange={(e) => updateBulkRecipient(index, "name", e.target.value)}
                            className="w-36"
                          />
                          {bulkRecipients.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeBulkRecipient(index)}
                              className="h-9 w-9 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Bulk Progress */}
                  {bulkSendProgress && (
                    <div className="p-3 bg-muted rounded-lg border space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Sending progress:</span>
                        <span className="font-medium">{bulkSendProgress.sent} / {bulkSendProgress.total}</span>
                      </div>
                      <div className="w-full bg-muted-foreground/20 rounded-full h-2">
                        <div 
                          className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(bulkSendProgress.sent / bulkSendProgress.total) * 100}%` }}
                        />
                      </div>
                      {bulkSendProgress.errors.length > 0 && (
                        <div className="text-xs text-destructive mt-2">
                          <p className="font-medium">Errors:</p>
                          {bulkSendProgress.errors.slice(0, 3).map((err, i) => (
                            <p key={i} className="truncate">• {err}</p>
                          ))}
                          {bulkSendProgress.errors.length > 3 && (
                            <p>...and {bulkSendProgress.errors.length - 3} more</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email-to">Recipient Email *</Label>
                    <Input
                      id="admin-email-to"
                      type="email"
                      placeholder="recipient@example.com"
                      value={adminEmailTo}
                      onChange={(e) => setAdminEmailTo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-email-name">Recipient Name</Label>
                    <Input
                      id="admin-email-name"
                      placeholder="John Doe (optional)"
                      value={adminEmailName}
                      onChange={(e) => setAdminEmailName(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="admin-email-subject">Subject *</Label>
                <Input
                  id="admin-email-subject"
                  placeholder="Email subject..."
                  value={adminEmailSubject}
                  onChange={(e) => setAdminEmailSubject(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="admin-email-message">Message *</Label>
                <Textarea
                  id="admin-email-message"
                  placeholder="Write your message here..."
                  value={adminEmailMessage}
                  onChange={(e) => setAdminEmailMessage(e.target.value)}
                  rows={6}
                  className="resize-none font-mono text-sm"
                />
              </div>
              
              <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                <p className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-amber-600" />
                  {isBulkMode 
                    ? `Emails will be sent individually to ${bulkRecipients.filter(r => r.email.trim()).length} recipient(s) from admin@buildunion.ca`
                    : "Email will be sent from: admin@buildunion.ca"
                  }
                </p>
              </div>
            </div>
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={resetAdminEmailDialog}
                disabled={isSendingAdminEmail}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsPreviewOpen(true)}
                disabled={!adminEmailSubject && !adminEmailMessage}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button
                onClick={sendAdminEmail}
                disabled={
                  isSendingAdminEmail || 
                  !adminEmailSubject || 
                  !adminEmailMessage ||
                  (isBulkMode ? bulkRecipients.filter(r => r.email.trim()).length === 0 : !adminEmailTo)
                }
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isSendingAdminEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {isBulkMode ? `Sending ${bulkSendProgress?.sent || 0}/${bulkSendProgress?.total || 0}...` : "Sending..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {isBulkMode ? `Send to ${bulkRecipients.filter(r => r.email.trim()).length} Recipients` : "Send Email"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-amber-500" />
                Email Preview
              </DialogTitle>
              <DialogDescription>
                This is how your email will appear to the recipient
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto border rounded-lg bg-gray-100 dark:bg-gray-900 p-4">
              <div 
                className="bg-white rounded-lg shadow-lg overflow-hidden"
                dangerouslySetInnerHTML={{ __html: generateEmailPreviewHtml() }}
              />
            </div>
            
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsPreviewOpen(false)}
              >
                Close Preview
              </Button>
              <Button
                onClick={() => {
                  setIsPreviewOpen(false);
                  sendAdminEmail();
                }}
                disabled={
                  !adminEmailSubject || 
                  !adminEmailMessage ||
                  (isBulkMode ? bulkRecipients.filter(r => r.email.trim()).length === 0 : !adminEmailTo)
                }
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <Send className="h-4 w-4 mr-2" />
                {isBulkMode ? `Send to ${bulkRecipients.filter(r => r.email.trim()).length} Recipients` : "Send Email"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                  {hasPremiumAccess ? (
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
                  ) : (
                    <div className="flex items-center justify-between gap-4 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-cyan-600" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          Direct messaging is a Premium feature
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate("/buildunion/pricing")}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                      >
                        <Crown className="h-4 w-4 mr-1" />
                        Upgrade
                      </Button>
                    </div>
                  )}
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
