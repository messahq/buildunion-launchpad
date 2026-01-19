import { useState } from "react";
import { useProjectTeam } from "@/hooks/useProjectTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Users, 
  UserPlus, 
  Mail, 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Crown,
  UserMinus
} from "lucide-react";
import { toast } from "sonner";

interface TeamManagementProps {
  projectId: string;
  isOwner: boolean;
}

const TeamManagement = ({ projectId, isOwner }: TeamManagementProps) => {
  const { members, invitations, loading, sendInvitation, cancelInvitation, removeMember } = useProjectTeam(projectId);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) return;

    setSending(true);
    const result = await sendInvitation(inviteEmail);
    setSending(false);

    if (result.success) {
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setDialogOpen(false);
    } else {
      toast.error(result.error || "Failed to send invitation");
    }
  };

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    const result = await cancelInvitation(invitationId);
    if (result.success) {
      toast.success(`Invitation to ${email} cancelled`);
    } else {
      toast.error(result.error || "Failed to cancel invitation");
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!confirm(`Remove ${name} from this project?`)) return;
    
    const result = await removeMember(memberId);
    if (result.success) {
      toast.success(`${name} removed from project`);
    } else {
      toast.error(result.error || "Failed to remove member");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Accepted
          </Badge>
        );
      case "declined":
        return (
          <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 gap-1">
            <XCircle className="h-3 w-3" />
            Declined
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        </CardContent>
      </Card>
    );
  }

  const pendingInvitations = invitations.filter(i => i.status === "pending");
  const pastInvitations = invitations.filter(i => i.status !== "pending");

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              Team
            </CardTitle>
            <CardDescription>
              {members.length + 1} member{members.length !== 0 ? "s" : ""}
              {pendingInvitations.length > 0 && ` • ${pendingInvitations.length} pending`}
            </CardDescription>
          </div>
          {isOwner && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 gap-1">
                  <UserPlus className="h-4 w-4" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to collaborate on this project. They'll get access to all project documents and can participate in analysis.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendInvitation()}
                      />
                      <Button
                        onClick={handleSendInvitation}
                        disabled={!inviteEmail.trim() || sending}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Owner */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border-2 border-amber-200">
              <AvatarFallback className="bg-amber-100 text-amber-700 font-medium">
                <Crown className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-slate-900">Project Owner</p>
              <p className="text-xs text-slate-500">You</p>
            </div>
          </div>
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            Owner
          </Badge>
        </div>

        {/* Members */}
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between py-2 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-slate-100 text-slate-700 font-medium">
                  {member.full_name?.slice(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-slate-900">{member.full_name}</p>
                <p className="text-xs text-slate-500 capitalize">{member.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-slate-600">
                Member
              </Badge>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleRemoveMember(member.id, member.full_name || "Member")}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <>
            <div className="pt-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Pending Invitations
              </p>
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between py-2 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-amber-50 text-amber-600">
                        <Mail className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{invitation.email}</p>
                      <p className="text-xs text-slate-500">
                        Invited {new Date(invitation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(invitation.status)}
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Past Invitations */}
        {isOwner && pastInvitations.length > 0 && (
          <details className="pt-2">
            <summary className="text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600">
              Past Invitations ({pastInvitations.length})
            </summary>
            <div className="mt-2 space-y-2">
              {pastInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between py-2 opacity-60">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-slate-50 text-slate-400 text-xs">
                        {invitation.email.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm text-slate-600">{invitation.email}</p>
                  </div>
                  {getStatusBadge(invitation.status)}
                </div>
              ))}
            </div>
          </details>
        )}

        {members.length === 0 && pendingInvitations.length === 0 && (
          <div className="text-center py-4 text-slate-500 text-sm">
            <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p>No team members yet</p>
            {isOwner && <p className="text-xs mt-1">Invite colleagues to collaborate</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamManagement;
