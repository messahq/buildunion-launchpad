import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Send, 
  Mail, 
  User, 
  Loader2, 
  FileSpreadsheet, 
  CheckCircle2,
  Search,
  MessageSquare
} from "lucide-react";

interface LineItem {
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  source: "photo" | "calculator" | "template" | "blueprint" | "manual";
}

interface ShareSummaryDialogProps {
  summaryId?: string;
  lineItems: LineItem[];
  clientInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  totalAmount: number;
  formatCurrency: (amount: number) => string;
  children: React.ReactNode;
}

interface SearchedUser {
  id: string;
  user_id: string;
  company_name: string | null;
  primary_trade: string | null;
  avatar_url: string | null;
}

export function ShareSummaryDialog({ 
  summaryId,
  lineItems, 
  clientInfo,
  totalAmount,
  formatCurrency,
  children 
}: ShareSummaryDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"email" | "user">("email");
  
  // Email form state
  const [emailData, setEmailData] = useState({
    recipientEmail: clientInfo.email || "",
    subject: "Project Summary - BuildUnion",
    message: `Hi ${clientInfo.name || "there"},\n\nPlease find the attached project summary with ${lineItems.length} items totaling ${formatCurrency(totalAmount)}.\n\nBest regards`
  });

  // User search state
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [userMessage, setUserMessage] = useState("I'm sharing a project summary with you. Please review the details.");

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("bu_profiles")
        .select("id, user_id, company_name, primary_trade, avatar_url")
        .or(`company_name.ilike.%${query}%`)
        .neq("user_id", user?.id)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.recipientEmail) {
      toast.error("Please enter a recipient email");
      return;
    }

    setSending(true);
    try {
      // For now, we'll show a success toast as email sending requires additional setup
      // In production, this would call an edge function to send the email
      toast.success(`Summary will be sent to ${emailData.recipientEmail}`);
      toast.info("Email delivery feature requires SMTP configuration", { duration: 5000 });
      setOpen(false);
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleSendToUser = async () => {
    if (!selectedUser) {
      toast.error("Please select a user to send to");
      return;
    }

    if (!user) {
      toast.error("Please sign in to send messages");
      return;
    }

    setSending(true);
    try {
      // Create a message with the summary link
      const summaryLink = summaryId ? `/buildunion/summary?summaryId=${summaryId}` : "";
      const fullMessage = `${userMessage}\n\n📋 Project Summary:\n• ${lineItems.length} items\n• Total: ${formatCurrency(totalAmount)}\n• Client: ${clientInfo.name || "Not specified"}${summaryLink ? `\n\n🔗 View: ${window.location.origin}${summaryLink}` : ""}`;

      const { error } = await supabase
        .from("team_messages")
        .insert({
          sender_id: user.id,
          recipient_id: selectedUser.user_id,
          message: fullMessage
        });

      if (error) throw error;

      toast.success(`Summary sent to ${selectedUser.company_name || "user"}!`);
      setOpen(false);
      setSelectedUser(null);
      setUserSearch("");
      setSearchResults([]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatTrade = (trade: string | null) => {
    if (!trade) return "";
    return trade.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-amber-500" />
            Share Summary
          </DialogTitle>
          <DialogDescription>
            Send this project summary via email or direct message to another user.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "email" | "user")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="user" className="gap-2">
              <User className="h-4 w-4" />
              User
            </TabsTrigger>
          </TabsList>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4 mt-4">
            {/* Summary Preview */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="font-medium">Summary includes:</span>
              </div>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>• {lineItems.length} line items</li>
                <li>• Total: {formatCurrency(totalAmount)}</li>
                {clientInfo.name && <li>• Client: {clientInfo.name}</li>}
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient-email">Recipient Email *</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="client@example.com"
                value={emailData.recipientEmail}
                onChange={(e) => setEmailData(prev => ({ ...prev, recipientEmail: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                placeholder="Project Summary"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                placeholder="Add a personal message..."
                value={emailData.message}
                onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendEmail}
                disabled={sending || !emailData.recipientEmail}
                className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-500"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Send Email
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* User Tab */}
          <TabsContent value="user" className="space-y-4 mt-4">
            {/* Summary Preview */}
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 text-sm text-purple-800">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">Send as direct message</span>
              </div>
              <p className="mt-1 text-xs text-purple-600">
                The summary link and details will be shared via the internal messaging system.
              </p>
            </div>

            {/* User Search */}
            <div className="space-y-2">
              <Label>Search User</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company name..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>

              {/* Search Results */}
              {searching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              )}

              {searchResults.length > 0 && !selectedUser && (
                <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                  {searchResults.map((profile) => (
                    <button
                      key={profile.id}
                      className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => {
                        setSelectedUser(profile);
                        setUserSearch(profile.company_name || "");
                        setSearchResults([]);
                      }}
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white text-sm font-medium">
                        {(profile.company_name || "U")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {profile.company_name || "Unknown Company"}
                        </p>
                        {profile.primary_trade && (
                          <p className="text-xs text-muted-foreground truncate">
                            {formatTrade(profile.primary_trade)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected User */}
              {selectedUser && (
                <div className="border rounded-lg p-3 bg-green-50 border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-medium">
                        {(selectedUser.company_name || "U")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {selectedUser.company_name || "Unknown Company"}
                        </p>
                        {selectedUser.primary_trade && (
                          <Badge variant="secondary" className="text-xs">
                            {formatTrade(selectedUser.primary_trade)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-xs"
                    onClick={() => {
                      setSelectedUser(null);
                      setUserSearch("");
                    }}
                  >
                    Change user
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-message">Message</Label>
              <Textarea
                id="user-message"
                placeholder="Add a message with the summary..."
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendToUser}
                disabled={sending || !selectedUser}
                className="gap-2 bg-gradient-to-r from-purple-500 to-violet-500"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Message
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
