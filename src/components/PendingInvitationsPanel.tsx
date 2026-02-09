import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Mail, 
  Check, 
  X, 
  Users, 
  MapPin, 
  Crown,
  Calendar,
  Loader2 
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface PendingInvitation {
  id: string;
  projectId: string;
  projectName: string;
  projectAddress?: string;
  invitedBy: string;
  inviterName?: string;
  inviterAvatar?: string;
  role: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  foreman: "Foreman",
  subcontractor: "Subcontractor",
  inspector: "Inspector / QC",
  supplier: "Supplier / Vendor",
  client: "Client Representative",
  worker: "Worker",
  member: "Team Member",
};

const ROLE_COLORS: Record<string, string> = {
  foreman: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  subcontractor: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  inspector: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  supplier: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  client: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  worker: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  member: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
};

export function PendingInvitationsPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPendingInvitations();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchPendingInvitations = async () => {
    if (!user?.email) return;
    
    try {
      // Get pending invitations for the current user's email
      const { data: invitationData, error } = await supabase
        .from("team_invitations")
        .select(`
          id,
          project_id,
          role,
          invited_by,
          created_at,
          projects!inner(name, address)
        `)
        .eq("status", "pending")
        .ilike("email", user.email);

      if (error) throw error;

      if (!invitationData || invitationData.length === 0) {
        setInvitations([]);
        setIsLoading(false);
        return;
      }

      // Get inviter profiles
      const inviterIds = [...new Set(invitationData.map(inv => inv.invited_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", inviterIds);

      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      profiles?.forEach(p => profileMap.set(p.user_id, p));

      const formattedInvitations: PendingInvitation[] = invitationData.map((inv: any) => ({
        id: inv.id,
        projectId: inv.project_id,
        projectName: inv.projects?.name || "Unknown Project",
        projectAddress: inv.projects?.address || undefined,
        invitedBy: inv.invited_by,
        inviterName: profileMap.get(inv.invited_by)?.full_name || undefined,
        inviterAvatar: profileMap.get(inv.invited_by)?.avatar_url || undefined,
        role: inv.role || "member",
        createdAt: inv.created_at,
      }));

      setInvitations(formattedInvitations);
    } catch (err) {
      console.error("[PendingInvitations] Failed to fetch:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitation: PendingInvitation) => {
    if (!user) return;
    
    setProcessingId(invitation.id);
    
    try {
      // 1. Add user to project_members
      const { error: memberError } = await supabase
        .from("project_members")
        .insert({
          project_id: invitation.projectId,
          user_id: user.id,
          role: invitation.role,
        });

      if (memberError) throw memberError;

      // 2. Update invitation status to accepted
      const { error: updateError } = await supabase
        .from("team_invitations")
        .update({ 
          status: "accepted",
          responded_at: new Date().toISOString()
        })
        .eq("id", invitation.id);

      if (updateError) throw updateError;

      // Remove from local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      
      toast.success(`Joined "${invitation.projectName}" as ${ROLE_LABELS[invitation.role] || invitation.role}`);
      
      // Navigate to the project with appropriate view based on role
      navigate(`/buildunion/project/${invitation.projectId}`);
      
    } catch (err: any) {
      console.error("[PendingInvitations] Accept failed:", err);
      if (err?.message?.includes("duplicate")) {
        toast.error("You are already a member of this project");
        // Still update the invitation status
        await supabase
          .from("team_invitations")
          .update({ status: "accepted", responded_at: new Date().toISOString() })
          .eq("id", invitation.id);
        setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      } else {
        toast.error("Failed to accept invitation");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineInvitation = async (invitation: PendingInvitation) => {
    setProcessingId(invitation.id);
    
    try {
      const { error } = await supabase
        .from("team_invitations")
        .update({ 
          status: "declined",
          responded_at: new Date().toISOString()
        })
        .eq("id", invitation.id);

      if (error) throw error;

      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      toast.success("Invitation declined");
      
    } catch (err) {
      console.error("[PendingInvitations] Decline failed:", err);
      toast.error("Failed to decline invitation");
    } finally {
      setProcessingId(null);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Card className="border-indigo-200/50 dark:border-indigo-800/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-500" />
            <CardTitle className="text-base">Team Invitations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) return null;

  return (
    <Card className="border-indigo-200/50 dark:border-indigo-800/30 bg-gradient-to-br from-indigo-50/30 via-background to-purple-50/30 dark:from-indigo-950/20 dark:via-background dark:to-purple-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Mail className="h-5 w-5 text-indigo-500" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">
                {invitations.length}
              </span>
            </div>
            <CardTitle className="text-base bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              Team Invitations
            </CardTitle>
          </div>
        </div>
        <CardDescription>
          You have pending project invitations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[300px] pr-2">
          <div className="space-y-3">
            {invitations.map((invitation) => {
              const inviterInitials = invitation.inviterName
                ?.split(" ")
                .map(n => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "??";
              const isProcessing = processingId === invitation.id;

              return (
                <div
                  key={invitation.id}
                  className="p-4 rounded-lg border border-indigo-100 dark:border-indigo-800/50 bg-background/80 backdrop-blur-sm"
                >
                  {/* Project Info */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">
                        {invitation.projectName}
                      </h4>
                      {invitation.projectAddress && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {invitation.projectAddress}
                        </p>
                      )}
                    </div>
                    <Badge className={ROLE_COLORS[invitation.role] || ROLE_COLORS.member}>
                      {ROLE_LABELS[invitation.role] || invitation.role}
                    </Badge>
                  </div>

                  {/* Inviter Info */}
                  <div className="flex items-center gap-2 mb-3 pl-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={invitation.inviterAvatar || undefined} />
                      <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-xs">
                        {inviterInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      Invited by <span className="font-medium text-foreground">{invitation.inviterName || "Project Owner"}</span>
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvitation(invitation)}
                      disabled={isProcessing}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Accept & View Project
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineInvitation(invitation)}
                      disabled={isProcessing}
                      className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
