import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectTeam, TEAM_ROLES, TeamRole } from "@/hooks/useProjectTeam";
import { useSubscription, getTeamLimit, getNextTier, SUBSCRIPTION_TIERS, SubscriptionTier } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  UserMinus,
  Sparkles,
  TrendingUp,
  Lock
} from "lucide-react";
import { toast } from "sonner";

interface TeamManagementProps {
  projectId: string;
  isOwner: boolean;
}

const TeamManagement = ({ projectId, isOwner }: TeamManagementProps) => {
  const navigate = useNavigate();
  const { members, invitations, loading, sendInvitation, cancelInvitation, removeMember } = useProjectTeam(projectId);
  const { subscription } = useSubscription();
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<TeamRole>("member");
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  // Calculate team limit info
  const currentTier = subscription.tier;
  const teamLimit = getTeamLimit(currentTier);
  const currentTeamSize = members.length;
  const pendingCount = invitations.filter(i => i.status === "pending").length;
  const totalPotentialSize = currentTeamSize + pendingCount;
  const canInviteMore = teamLimit === Infinity || totalPotentialSize < teamLimit;
  const spotsRemaining = teamLimit === Infinity ? Infinity : Math.max(0, teamLimit - totalPotentialSize);
  const nextTier = getNextTier(currentTier);
  
  // Role selection is Premium+ feature
  const canSelectRoles = currentTier === "premium" || currentTier === "enterprise";

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) return;

    if (!canInviteMore) {
      setDialogOpen(false);
      setUpgradeDialogOpen(true);
      return;
    }

    setSending(true);
    const roleToSend = canSelectRoles ? selectedRole : "member";
    const result = await sendInvitation(inviteEmail, roleToSend);
    setSending(false);

    if (result.success) {
      const roleLabel = canSelectRoles ? ` as ${TEAM_ROLES[roleToSend].label}` : "";
      toast.success(`Invitation sent to ${inviteEmail}${roleLabel}`);
      setInviteEmail("");
      setSelectedRole("member");
      setDialogOpen(false);
    } else {
      toast.error(result.error || "Failed to send invitation");
    }
  };

  const handleInviteClick = () => {
    if (!canInviteMore && teamLimit > 0) {
      setUpgradeDialogOpen(true);
    } else if (teamLimit === 0) {
      setUpgradeDialogOpen(true);
    } else {
      setDialogOpen(true);
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

  const getTierDisplayName = (tier: SubscriptionTier): string => {
    const names: Record<SubscriptionTier, string> = {
      free: "Free",
      pro: "Pro",
      premium: "Premium",
      enterprise: "Enterprise"
    };
    return names[tier];
  };

  const getUpgradePrice = (): string => {
    if (nextTier === "pro") {
      return `$${SUBSCRIPTION_TIERS.pro.monthly.price}/month`;
    } else if (nextTier === "premium") {
      return `$${SUBSCRIPTION_TIERS.premium.monthly.price}/month`;
    }
    return "Contact us";
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
    <>
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-600" />
                Team
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <span>
                  {members.length + 1} member{members.length !== 0 ? "s" : ""}
                  {pendingInvitations.length > 0 && ` • ${pendingInvitations.length} pending`}
                </span>
                {teamLimit !== Infinity && teamLimit > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {spotsRemaining === 0 ? (
                      <span className="text-red-600">Limit reached</span>
                    ) : (
                      <span className="text-slate-600">{currentTeamSize}/{teamLimit} slots used</span>
                    )}
                  </Badge>
                )}
                {teamLimit === 0 && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Pro feature
                  </Badge>
                )}
              </CardDescription>
            </div>
            {isOwner && (
              <Button 
                size="sm" 
                className={`gap-1 ${canInviteMore && teamLimit > 0 ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'}`}
                onClick={handleInviteClick}
              >
                {teamLimit === 0 || !canInviteMore ? (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    Upgrade
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Invite
                  </>
                )}
              </Button>
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
          {members.map((member) => {
            const roleInfo = TEAM_ROLES[member.role as TeamRole] || TEAM_ROLES.member;
            return (
              <div key={member.id} className="flex items-center justify-between py-2 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-slate-100 text-slate-700 font-medium">
                      {roleInfo.icon}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{member.full_name}</p>
                    <p className="text-xs text-slate-500">{roleInfo.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-slate-600 capitalize">
                    {roleInfo.label}
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
            );
          })}

          {/* Pending Invitations */}
          {pendingInvitations.length > 0 && (
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

      {/* Invite Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to collaborate on this project. They'll get access to all project documents and can participate in analysis.
              {teamLimit !== Infinity && (
                <span className="block mt-2 text-amber-600">
                  {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} remaining on your {getTierDisplayName(currentTier)} plan.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            {/* Role Selection - Premium Feature */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Role</label>
                {!canSelectRoles && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                    <Lock className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
              {canSelectRoles ? (
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as TeamRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEAM_ROLES).map(([key, role]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span>{role.icon}</span>
                          <div>
                            <span className="font-medium">{role.label}</span>
                            <span className="text-xs text-slate-500 ml-2">{role.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50">
                  <span className="text-slate-500 text-sm">
                    Upgrade to Premium to assign specific roles like Foreman, Inspector, or Subcontractor
                  </span>
                </div>
              )}
            </div>

            <Button
              onClick={handleSendInvitation}
              disabled={!inviteEmail.trim() || sending}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {teamLimit === 0 ? "Unlock Team Collaboration" : "Upgrade for More Team Members"}
            </DialogTitle>
            <DialogDescription>
              {teamLimit === 0 ? (
                <>
                  Team collaboration is a <strong>Pro</strong> feature. Upgrade to invite up to 10 team members per project.
                </>
              ) : (
                <>
                  You've reached the {teamLimit} member limit on your <strong>{getTierDisplayName(currentTier)}</strong> plan. 
                  Upgrade to <strong>{nextTier ? getTierDisplayName(nextTier) : 'Enterprise'}</strong> for {nextTier === 'premium' ? '50' : 'unlimited'} team members.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {nextTier ? getTierDisplayName(nextTier) : 'Enterprise'} Plan
                  </p>
                  <p className="text-sm text-slate-600">
                    {nextTier === 'pro' && '10 team members per project'}
                    {nextTier === 'premium' && '50 team members per project'}
                    {nextTier === 'enterprise' && 'Unlimited team members'}
                    {!nextTier && 'Contact us for custom solutions'}
                  </p>
                </div>
                <p className="text-lg font-bold text-amber-600">
                  {getUpgradePrice()}
                </p>
              </div>
              <ul className="text-sm text-slate-600 space-y-1 mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Unlimited blueprint analysis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Push notifications for team
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Shared document library
                </li>
                {(nextTier === 'premium' || nextTier === 'enterprise') && (
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Team roles & permissions
                  </li>
                )}
              </ul>
              <Button 
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                onClick={() => {
                  setUpgradeDialogOpen(false);
                  navigate('/buildunion/pricing');
                }}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                View Upgrade Options
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamManagement;
