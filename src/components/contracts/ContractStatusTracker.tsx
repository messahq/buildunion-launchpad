import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Eye,
  Send,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Bell,
  History,
  Mail,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ContractEvent {
  id: string;
  event_type: string;
  event_data: any;
  ip_address: string | null;
  created_at: string;
}

interface ContractStatusTrackerProps {
  contractId: string;
  contractNumber: string;
  shareToken: string | null;
  status: string;
  sentToClientAt: string | null;
  clientViewedAt: string | null;
  clientSignedAt: string | null;
  clientEmail: string | null;
  onStatusChange?: () => void;
}

export const ContractStatusTracker = ({
  contractId,
  contractNumber,
  shareToken,
  status,
  sentToClientAt,
  clientViewedAt,
  clientSignedAt,
  clientEmail,
  onStatusChange,
}: ContractStatusTrackerProps) => {
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Subscribe to realtime events
  useEffect(() => {
    const channel = supabase
      .channel(`contract-events-${contractId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contract_events",
          filter: `contract_id=eq.${contractId}`,
        },
        (payload) => {
          const newEvent = payload.new as ContractEvent;
          setEvents((prev) => [newEvent, ...prev]);

          // Show notification based on event type
          if (newEvent.event_type === "viewed") {
            toast.info(`📧 Contract #${contractNumber} was viewed by client`, {
              duration: 5000,
            });
          } else if (newEvent.event_type === "signed") {
            toast.success(
              `✅ Contract #${contractNumber} was signed by client!`,
              {
                duration: 8000,
              }
            );
            onStatusChange?.();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contractId, contractNumber, onStatusChange]);

  // Fetch existing events
  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("contract_events")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setEvents(data);
      }
    };

    fetchEvents();
  }, [contractId]);

  const getShareLink = () => {
    if (!shareToken) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}/contract/view/${shareToken}`;
  };

  const copyShareLink = async () => {
    const link = getShareLink();
    if (!link) return;

    await navigator.clipboard.writeText(link);
    toast.success("Contract link copied to clipboard");
  };

  const sendToClient = async () => {
    if (!clientEmail) {
      toast.error("Client email is required to send the contract");
      return;
    }

    setIsSending(true);
    try {
      // Update sent timestamp
      await supabase
        .from("contracts")
        .update({ sent_to_client_at: new Date().toISOString() })
        .eq("id", contractId);

      // Log send event
      await supabase.from("contract_events").insert({
        contract_id: contractId,
        event_type: "sent",
        event_data: { recipient: clientEmail },
      });

      // TODO: Integrate with email service to actually send
      toast.success(`Contract link ready to send to ${clientEmail}`);
      onStatusChange?.();
    } catch (error) {
      console.error("Error sending contract:", error);
      toast.error("Failed to send contract");
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = () => {
    if (clientSignedAt) {
      return (
        <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
          <Check className="w-3 h-3 mr-1" />
          Signed
        </Badge>
      );
    }
    if (clientViewedAt) {
      return (
        <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">
          <Eye className="w-3 h-3 mr-1" />
          Viewed
        </Badge>
      );
    }
    if (sentToClientAt) {
      return (
        <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
          <Send className="w-3 h-3 mr-1" />
          Sent
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Clock className="w-3 h-3 mr-1" />
        Draft
      </Badge>
    );
  };

  const shareLink = getShareLink();

  return (
    <div className="space-y-3">
      {/* Status Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        {getStatusBadge()}

        {clientViewedAt && !clientSignedAt && (
          <span className="text-xs text-muted-foreground">
            Viewed {formatDistanceToNow(new Date(clientViewedAt), { addSuffix: true })}
          </span>
        )}

        {clientSignedAt && (
          <span className="text-xs text-muted-foreground">
            Signed {formatDistanceToNow(new Date(clientSignedAt), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <TooltipProvider>
          {shareLink && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={copyShareLink}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Link
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy shareable contract link</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(shareLink, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open client view in new tab</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {!sentToClientAt && clientEmail && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={sendToClient}
                  disabled={isSending}
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Send to Client
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send contract link to {clientEmail}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHistoryOpen(true)}
              >
                <History className="w-4 h-4 mr-1" />
                Activity
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View contract activity history</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Activity History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Contract Activity
            </DialogTitle>
            <DialogDescription>
              Activity log for Contract #{contractNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity yet
              </p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="mt-0.5">
                    {event.event_type === "viewed" && (
                      <Eye className="w-4 h-4 text-blue-500" />
                    )}
                    {event.event_type === "signed" && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                    {event.event_type === "sent" && (
                      <Send className="w-4 h-4 text-amber-500" />
                    )}
                    {event.event_type === "downloaded" && (
                      <ExternalLink className="w-4 h-4 text-purple-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">
                      {event.event_type === "viewed" && "Client viewed contract"}
                      {event.event_type === "signed" && "Client signed contract"}
                      {event.event_type === "sent" && "Contract sent to client"}
                      {event.event_type === "downloaded" && "Contract downloaded"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                    {event.ip_address && (
                      <p className="text-xs text-muted-foreground/70">
                        IP: {event.ip_address}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
