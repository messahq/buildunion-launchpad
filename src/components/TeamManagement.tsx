import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectTeam, TEAM_ROLES, TeamRole } from "@/hooks/useProjectTeam";
import { useSubscription, getTeamLimit, getNextTier, SUBSCRIPTION_TIERS, SubscriptionTier } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Lock,
  Search,
  Building2,
  UserCheck,
  Shield,
  Check,
  Ban
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, ProjectRole } from "@/hooks/useProjectPermissions";

// Permission display configuration
const PERMISSION_GROUPS = {
  tasks: {
    label: "Tasks",
    icon: "📋",
    permissions: [
      { key: "canCreateTasks", label: "Create tasks" },
      { key: "canEditAllTasks", label: "Edit all tasks" },
      { key: "canAssignTasks", label: "Assign tasks" },
      { key: "canDeleteTasks", label: "Delete tasks" },
    ]
  },
  documents: {
    label: "Documents",
    icon: "📄",
    permissions: [
      { key: "canViewDocuments", label: "View documents" },
      { key: "canUploadDocuments", label: "Upload documents" },
      { key: "canDeleteDocuments", label: "Delete documents" },
    ]
  },
  team: {
    label: "Team",
    icon: "👥",
    permissions: [
      { key: "canViewTeamDetails", label: "View team details" },
      { key: "canViewAllData", label: "View all project data" },
      { key: "canSendToTeam", label: "Send to team" },
    ]
  },
  project: {
    label: "Project",
    icon: "🏗️",
    permissions: [
      { key: "canGenerateReports", label: "Generate reports" },
      { key: "canRunAIAnalysis", label: "Run AI analysis" },
      { key: "canEditAIResults", label: "Edit AI results" },
    ]
  },
};

// Permission matrix (simplified for display)
const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  owner: {
    canCreateTasks: true, canEditAllTasks: true, canAssignTasks: true, canDeleteTasks: true,
    canViewDocuments: true, canUploadDocuments: true, canDeleteDocuments: true,
    canViewTeamDetails: true, canViewAllData: true, canSendToTeam: true,
    canGenerateReports: true, canRunAIAnalysis: true, canEditAIResults: true,
  },
  foreman: {
    canCreateTasks: true, canEditAllTasks: true, canAssignTasks: true, canDeleteTasks: false,
    canViewDocuments: true, canUploadDocuments: true, canDeleteDocuments: false,
    canViewTeamDetails: true, canViewAllData: true, canSendToTeam: true,
    canGenerateReports: true, canRunAIAnalysis: true, canEditAIResults: true,
  },
  inspector: {
    canCreateTasks: false, canEditAllTasks: false, canAssignTasks: false, canDeleteTasks: false,
    canViewDocuments: true, canUploadDocuments: false, canDeleteDocuments: false,
    canViewTeamDetails: true, canViewAllData: true, canSendToTeam: false,
    canGenerateReports: true, canRunAIAnalysis: false, canEditAIResults: false,
  },
  subcontractor: {
    canCreateTasks: false, canEditAllTasks: false, canAssignTasks: false, canDeleteTasks: false,
    canViewDocuments: true, canUploadDocuments: true, canDeleteDocuments: false,
    canViewTeamDetails: false, canViewAllData: false, canSendToTeam: false,
    canGenerateReports: false, canRunAIAnalysis: false, canEditAIResults: false,
  },
  worker: {
    canCreateTasks: false, canEditAllTasks: false, canAssignTasks: false, canDeleteTasks: false,
    canViewDocuments: true, canUploadDocuments: false, canDeleteDocuments: false,
    canViewTeamDetails: false, canViewAllData: false, canSendToTeam: false,
    canGenerateReports: false, canRunAIAnalysis: false, canEditAIResults: false,
  },
  member: {
    canCreateTasks: false, canEditAllTasks: false, canAssignTasks: false, canDeleteTasks: false,
    canViewDocuments: true, canUploadDocuments: false, canDeleteDocuments: false,
    canViewTeamDetails: false, canViewAllData: false, canSendToTeam: false,
    canGenerateReports: false, canRunAIAnalysis: false, canEditAIResults: false,
  },
};

interface RolePermissionsPreviewProps {
  role: TeamRole;
  compact?: boolean;
}

function RolePermissionsPreview({ role, compact = false }: RolePermissionsPreviewProps) {
  const rolePerms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.member;
  const roleInfo = ROLE_LABELS[role as ProjectRole];
  
  // Count allowed permissions
  const allowedCount = Object.values(rolePerms).filter(Boolean).length;
  const totalCount = Object.keys(rolePerms).length;
  
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3 w-3" />
        <span>{allowedCount}/{totalCount} permissions</span>
      </div>
    );
  }
  
  return (
    <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Shield className="h-4 w-4 text-amber-600" />
        <span>Permissions for {roleInfo?.label || role}</span>
        <Badge variant="outline" className="ml-auto text-xs">
          {allowedCount}/{totalCount}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => (
          <div key={groupKey} className="space-y-1.5">
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <span>{group.icon}</span>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.permissions.map(({ key, label }) => {
                const allowed = rolePerms[key];
                return (
                  <div 
                    key={key} 
                    className={cn(
                      "flex items-center gap-1.5 text-xs",
                      allowed ? "text-slate-700" : "text-slate-400"
                    )}
                  >
                    {allowed ? (
                      <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                    ) : (
                      <Ban className="h-3 w-3 text-slate-300 flex-shrink-0" />
                    )}
                    <span className="truncate">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-slate-500 pt-1 border-t border-slate-200">
        All roles can update their own assigned task status.
      </p>
    </div>
  );
}

// Component for changing member roles (owner only)
interface MemberRoleSelectorProps {
  memberId: string;
  currentRole: TeamRole;
  memberName: string;
}

function MemberRoleSelector({ memberId, currentRole, memberName }: MemberRoleSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [role, setRole] = useState<TeamRole>(currentRole);
  
  const handleRoleChange = async (newRole: TeamRole) => {
    if (newRole === role) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("project_members")
        .update({ role: newRole })
        .eq("id", memberId);
      
      if (error) throw error;
      
      setRole(newRole);
      const roleLabel = ROLE_LABELS[newRole as ProjectRole]?.label || newRole;
      toast.success(`${memberName}'s role changed to ${roleLabel}`);
    } catch (err: any) {
      console.error("Error updating role:", err);
      toast.error(err.message || "Failed to update role");
    } finally {
      setIsUpdating(false);
    }
  };
  
  const roleInfo = ROLE_LABELS[role as ProjectRole];
  
  return (
    <Select value={role} onValueChange={(v) => handleRoleChange(v as TeamRole)} disabled={isUpdating}>
      <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs border-slate-200 bg-white">
        <SelectValue>
          <span className="flex items-center gap-1.5">
            {isUpdating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <span>{roleInfo?.icon}</span>
            )}
            <span>{roleInfo?.label || role}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-50 bg-white border shadow-lg">
        {Object.entries(TEAM_ROLES)
          .filter(([key]) => key !== "owner") // Can't assign owner role
          .map(([key, info]) => (
            <SelectItem key={key} value={key} className="text-xs">
              <span className="flex items-center gap-2">
                <span>{info.icon}</span>
                <span>{info.label}</span>
              </span>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

interface TeamManagementProps {
  projectId: string;
  isOwner: boolean;
  onMemberClick?: (memberId: string, memberName: string) => void;
}

interface SearchedUser {
  id: string;
  user_id: string;
  company_name: string | null;
  primary_trade: string | null;
  avatar_url: string | null;
  full_name?: string;
  email?: string;
}

const TeamManagement = ({ projectId, isOwner, onMemberClick }: TeamManagementProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { members, invitations, loading, sendInvitation, cancelInvitation, removeMember } = useProjectTeam(projectId);
  const { subscription } = useSubscription();
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<TeamRole>("member");
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<"email" | "user">("email");
  
  // User search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);

  // Task progress tracking per member
  const [memberTaskStats, setMemberTaskStats] = useState<Record<string, { total: number; completed: number }>>({});

  // Fetch task statistics for all members
  useEffect(() => {
    const fetchTaskStats = async () => {
      if (!projectId) return;
      
      const { data: tasks } = await supabase
        .from("project_tasks")
        .select("assigned_to, status")
        .eq("project_id", projectId);
      
      if (tasks) {
        const stats: Record<string, { total: number; completed: number }> = {};
        tasks.forEach(task => {
          if (!stats[task.assigned_to]) {
            stats[task.assigned_to] = { total: 0, completed: 0 };
          }
          stats[task.assigned_to].total++;
          if (task.status === "completed") {
            stats[task.assigned_to].completed++;
          }
        });
        setMemberTaskStats(stats);
      }
    };
    
    fetchTaskStats();
    
    // Subscribe to task changes
    const channel = supabase
      .channel(`task_stats_${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_tasks",
          filter: `project_id=eq.${projectId}`,
        },
        () => fetchTaskStats()
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

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

  // Search for BU users - by company name, full name, or trade
  // Uses RPC function that bypasses RLS to allow finding all users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        // Use the new RPC function that bypasses RLS
        const { data, error } = await supabase.rpc("search_bu_users_for_team", {
          _search_query: searchQuery.trim(),
          _project_id: projectId,
          _limit: 10,
        });

        if (error) throw error;

        // Map results to SearchedUser format
        const results: SearchedUser[] = (data || []).map((u: any) => ({
          id: u.id,
          user_id: u.user_id,
          company_name: u.company_name,
          primary_trade: u.primary_trade,
          avatar_url: u.avatar_url,
          full_name: u.full_name || u.company_name || "Unknown User",
        }));

        setSearchResults(results);
      } catch (err) {
        console.error("Error searching users:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, projectId]);

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

  const handleInviteUser = async (targetUser: SearchedUser) => {
    if (!canInviteMore) {
      setDialogOpen(false);
      setUpgradeDialogOpen(true);
      return;
    }

    setSending(true);
    const roleToSend = canSelectRoles ? selectedRole : "member";
    
    // Use server-side function for role validation and member addition
    try {
      const { data, error } = await supabase
        .rpc('add_project_member_validated', {
          _project_id: projectId,
          _user_id: targetUser.user_id,
          _role: roleToSend,
        });

      if (error) {
        throw error;
      }

      // Type assertion for the RPC response
      const result = data as { success: boolean; error?: string; role?: string } | null;

      if (result && !result.success) {
        if (result.error === 'User is already a team member') {
          toast.error("This user is already a team member");
        } else {
          throw new Error(result.error || 'Failed to add team member');
        }
      } else if (result && result.success) {
        // Send notification to the added user
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              title: 'Added to Project',
              body: `You've been added to a project team`,
              userIds: [targetUser.user_id],
              data: { type: 'project_member_added', projectId }
            }
          });
        } catch (notifErr) {
          // Don't fail the operation if notification fails
          console.warn('Failed to send notification:', notifErr);
        }

        const assignedRole = result.role || 'member';
        const roleLabel = assignedRole !== 'member' ? ` as ${TEAM_ROLES[assignedRole as TeamRole]?.label || assignedRole}` : "";
        toast.success(`${targetUser.full_name || targetUser.company_name} added to team${roleLabel}`);
        setSearchQuery("");
        setSelectedUser(null);
        setSelectedRole("member");
        setDialogOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add team member");
    } finally {
      setSending(false);
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

  const resetInviteDialog = () => {
    setInviteEmail("");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setSelectedRole("member");
    setInviteMode("email");
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
            const taskStats = memberTaskStats[member.user_id] || { total: 0, completed: 0 };
            const progressPercent = taskStats.total > 0 
              ? Math.round((taskStats.completed / taskStats.total) * 100) 
              : 0;
            
            return (
              <div key={member.id} className="flex items-center justify-between py-3 border-t border-slate-100">
                <div 
                  className={cn(
                    "flex items-center gap-3 flex-1",
                    onMemberClick && "cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                  )}
                  onClick={() => onMemberClick?.(member.user_id, member.full_name || "Team Member")}
                >
                  {/* Avatar with progress ring */}
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-slate-100 text-slate-700 font-medium">
                        {roleInfo.icon}
                      </AvatarFallback>
                    </Avatar>
                    {taskStats.total > 0 && (
                      <div 
                        className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center"
                        title={`${taskStats.completed}/${taskStats.total} tasks completed`}
                      >
                        <span className={cn(
                          "text-[10px] font-bold",
                          progressPercent === 100 ? "text-green-600" :
                          progressPercent >= 50 ? "text-amber-600" : "text-slate-500"
                        )}>
                          {progressPercent}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium text-slate-900 truncate",
                      onMemberClick && "hover:text-amber-600 transition-colors"
                    )}>
                      {member.full_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500">{roleInfo.label}</p>
                      {taskStats.total > 0 && (
                        <>
                          <span className="text-slate-300">•</span>
                          <p className={cn(
                            "text-xs",
                            progressPercent === 100 ? "text-green-600" : "text-slate-500"
                          )}>
                            {taskStats.completed}/{taskStats.total} tasks
                          </p>
                        </>
                      )}
                    </div>
                    {/* Progress bar */}
                    {taskStats.total > 0 && (
                      <div className="mt-1.5 h-1.5 w-full max-w-[120px] bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            progressPercent === 100 ? "bg-green-500" :
                            progressPercent >= 50 ? "bg-amber-500" : "bg-slate-400"
                          )}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <MemberRoleSelector
                      memberId={member.id}
                      currentRole={member.role as TeamRole}
                      memberName={member.full_name || "Member"}
                    />
                  ) : (
                    <Badge variant="outline" className="text-slate-600 capitalize">
                      {roleInfo.label}
                    </Badge>
                  )}
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMember(member.id, member.full_name || "Member");
                      }}
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
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetInviteDialog();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Add someone to collaborate on this project.
              {teamLimit !== Infinity && (
                <span className="block mt-2 text-amber-600">
                  {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} remaining on your {getTierDisplayName(currentTier)} plan.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={inviteMode} onValueChange={(v) => setInviteMode(v as "email" | "user")} className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                By Email
              </TabsTrigger>
              <TabsTrigger value="user" className="gap-2">
                <UserCheck className="h-4 w-4" />
                BU User
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 pt-4">
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
                            <span className="font-medium">{role.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50">
                    <span className="text-slate-500 text-sm">
                      Upgrade to Premium to assign roles
                    </span>
                  </div>
                )}
              </div>

              {/* Role Permissions Preview */}
              {canSelectRoles && (
                <RolePermissionsPreview role={selectedRole} />
              )}

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
            </TabsContent>

            <TabsContent value="user" className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Search by Name, Company or Trade
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Name, company or trade..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searching ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => setSelectedUser(selectedUser?.id === result.id ? null : result)}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                        ${selectedUser?.id === result.id 
                          ? 'bg-amber-50 border-2 border-amber-300' 
                          : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                        }
                      `}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={result.avatar_url || undefined} />
                        <AvatarFallback className="bg-amber-100 text-amber-700">
                          {(result.full_name || result.company_name || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {result.full_name || result.company_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {result.company_name && (
                            <span className="flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3" />
                              {result.company_name}
                            </span>
                          )}
                          {result.primary_trade && (
                            <Badge variant="outline" className="text-xs">
                              {result.primary_trade.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {selectedUser?.id === result.id && (
                        <CheckCircle2 className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="text-center py-6 text-slate-500 text-sm">
                  <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p>No users found</p>
                  <p className="text-xs mt-1">Try a different search or invite by email</p>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-sm">
                  <Search className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p>Type at least 2 characters to search</p>
                </div>
              )}

              {/* Role Selection for BU User */}
              {selectedUser && (
                <div className="space-y-2 pt-2 border-t">
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
                              <span className="font-medium">{role.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Will be added as Team Member
                    </p>
                  )}
                  
                  {/* Role Permissions Preview for BU User */}
                  {canSelectRoles && (
                    <RolePermissionsPreview role={selectedRole} />
                  )}
                </div>
              )}

              <Button
                onClick={() => selectedUser && handleInviteUser(selectedUser)}
                disabled={!selectedUser || sending}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Add to Team
              </Button>
            </TabsContent>
          </Tabs>
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
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
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
