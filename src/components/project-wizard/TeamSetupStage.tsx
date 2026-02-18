// ============================================
// TEAM SETUP STAGE - Stage 7 of Project Wizard
// ============================================
// The Gatekeeper: Define team and permissions BEFORE execution
// Invite via Email (external) or Add BuildUnion User (internal)
// Set Access Levels: Owner/Admin, Foreman, Worker
// ============================================

import { useState, useCallback, useEffect } from "react";
import { useTierFeatures } from "@/hooks/useTierFeatures";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Mail,
  Search,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  Crown,
  HardHat,
  Wrench,
  X,
  ChevronRight,
  Sparkles,
  Clock,
  UserCheck,
} from "lucide-react";
import { HardHatSpinner } from "@/components/ui/loading-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Citation, CITATION_TYPES, createCitation } from "@/types/citation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Access Level definitions with visibility rules
// NOTE: Owner is AUTOMATIC (project creator) - not selectable
import { Clipboard, Hammer, Eye as EyeIcon, Truck } from "lucide-react";

const ACCESS_LEVELS = [
  {
    key: 'foreman',
    label: 'Foreman',
    description: 'Site supervision, task management, material coordination',
    icon: HardHat,
    color: 'blue',
    canSeePrices: false,
    canSeeTasks: true,
    canUpdateTasks: true,
    canManageTeam: false,
  },
  {
    key: 'subcontractor',
    label: 'Subcontractor',
    description: 'Trade-specific scope, assigned work packages only',
    icon: Hammer,
    color: 'orange',
    canSeePrices: false,
    canSeeTasks: true, // Only their scope
    canUpdateTasks: true,
    canManageTeam: false,
  },
  {
    key: 'inspector',
    label: 'Inspector / QC',
    description: 'Quality control, verification, sign-off authority',
    icon: Clipboard,
    color: 'purple',
    canSeePrices: false,
    canSeeTasks: true,
    canUpdateTasks: false, // Read + verify only
    canManageTeam: false,
  },
  {
    key: 'supplier',
    label: 'Supplier / Vendor',
    description: 'Material delivery schedules, quantities only',
    icon: Truck,
    color: 'green',
    canSeePrices: false,
    canSeeTasks: false,
    canUpdateTasks: false,
    canManageTeam: false,
  },
  {
    key: 'client',
    label: 'Client Representative',
    description: 'Progress reports, milestone updates, read-only',
    icon: EyeIcon,
    color: 'slate',
    canSeePrices: false,
    canSeeTasks: false,
    canUpdateTasks: false,
    canManageTeam: false,
  },
];

interface TeamMemberInvite {
  id: string;
  type: 'email' | 'user';
  email?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  accessLevel: 'foreman' | 'subcontractor' | 'inspector' | 'supplier' | 'client';
  status: 'pending' | 'active' | 'invited';
  invitedAt: string;
}

interface SearchedUser {
  id: string;
  user_id: string;
  full_name: string;
  company_name: string | null;
  primary_trade: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

interface TeamSetupStageProps {
  projectId: string;
  userId: string;
  onComplete: (citations: Citation[]) => void;
  onSkip: () => void;
  className?: string;
}

export default function TeamSetupStage({
  projectId,
  userId,
  onComplete,
  onSkip,
  className,
}: TeamSetupStageProps) {
  const { features, canAddTeamMember, canUseFeature, getUpgradeMessage } = useTierFeatures();
  const [teamMembers, setTeamMembers] = useState<TeamMemberInvite[]>([]);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [pendingInvite, setPendingInvite] = useState<Partial<TeamMemberInvite> | null>(null);
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<string>('foreman');
  
  // Email invite state
  const [emailInput, setEmailInput] = useState('');
  const [isValidEmail, setIsValidEmail] = useState(false);
  
  // User search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  
  // Email validation
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsValidEmail(emailRegex.test(emailInput));
  }, [emailInput]);
  
  // Search BuildUnion users
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    
    const searchUsers = async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase.rpc('search_bu_users_for_team', {
          _search_query: searchQuery,
          _project_id: projectId,
          _limit: 8,
        });
        
        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error('[TeamSetup] Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    };
    
    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, projectId]);
  
  // Handle email invite
  const handleEmailInvite = useCallback(() => {
    if (!isValidEmail) return;
    
    // Tier check
    if (!canAddTeamMember(teamMembers.length)) {
      toast.error(`Team member limit reached (${features.maxTeamMembers} max on your plan)`, {
        action: { label: 'Upgrade', onClick: () => window.location.href = '/buildunion/pricing' },
      });
      return;
    }
    
    // Check if already added
    if (teamMembers.some(m => m.email?.toLowerCase() === emailInput.toLowerCase())) {
      toast.error('This email is already in the team');
      return;
    }
    
    setPendingInvite({
      id: `invite_${Date.now()}`,
      type: 'email',
      email: emailInput,
      status: 'pending',
    });
    setShowAccessDialog(true);
    setEmailInput('');
  }, [emailInput, isValidEmail, teamMembers]);
  
  // Handle user selection
  const handleUserSelect = useCallback((user: SearchedUser) => {
    // Tier check
    if (!canAddTeamMember(teamMembers.length)) {
      toast.error(`Team member limit reached (${features.maxTeamMembers} max on your plan)`, {
        action: { label: 'Upgrade', onClick: () => window.location.href = '/buildunion/pricing' },
      });
      return;
    }
    
    // Check if already added
    if (teamMembers.some(m => m.userId === user.user_id)) {
      toast.error('This user is already in the team');
      return;
    }
    
    setPendingInvite({
      id: `user_${Date.now()}`,
      type: 'user',
      userId: user.user_id,
      userName: user.full_name || user.company_name || 'Unknown',
      userAvatar: user.avatar_url || undefined,
      status: 'pending',
    });
    setShowAccessDialog(true);
    setSearchQuery('');
    setSearchResults([]);
  }, [teamMembers]);
  
  // Confirm access level and add to team
  const handleConfirmAccess = useCallback(() => {
    if (!pendingInvite) return;
    
    const newMember: TeamMemberInvite = {
      id: pendingInvite.id!,
      type: pendingInvite.type!,
      email: pendingInvite.email,
      userId: pendingInvite.userId,
      userName: pendingInvite.userName,
      userAvatar: pendingInvite.userAvatar,
      accessLevel: selectedAccessLevel as 'foreman' | 'subcontractor' | 'inspector' | 'supplier' | 'client',
      status: pendingInvite.type === 'email' ? 'pending' : 'active',
      invitedAt: new Date().toISOString(),
    };
    
    setTeamMembers(prev => [...prev, newMember]);
    setShowAccessDialog(false);
    setPendingInvite(null);
    setSelectedAccessLevel('foreman');
    
    toast.success(`${pendingInvite.type === 'email' ? 'Invitation prepared' : 'Team member added'}`);
  }, [pendingInvite, selectedAccessLevel]);
  
  // Remove team member
  const handleRemoveMember = useCallback((memberId: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== memberId));
  }, []);
  
  // Finalize team structure
  const handleFinalize = useCallback(async () => {
    if (teamMembers.length === 0) {
      onSkip();
      return;
    }
    
    setIsSaving(true);
    
    try {
      const citations: Citation[] = [];
      
      // Create individual member citations
      for (const member of teamMembers) {
        const memberCitation = createCitation({
          cite_type: CITATION_TYPES.TEAM_MEMBER_INVITE,
          question_key: 'team_member_invite',
          answer: member.type === 'email' 
            ? `Email: ${member.email}` 
            : `User: ${member.userName}`,
          value: {
            type: member.type,
            email: member.email,
            userId: member.userId,
            userName: member.userName,
            accessLevel: member.accessLevel,
          },
          metadata: {
            access_level: member.accessLevel,
            can_see_prices: ACCESS_LEVELS.find(l => l.key === member.accessLevel)?.canSeePrices,
            can_see_tasks: ACCESS_LEVELS.find(l => l.key === member.accessLevel)?.canSeeTasks,
            invited_at: member.invitedAt,
          },
        });
        citations.push(memberCitation);
        
        // If it's an email invite, create the team_invitation record
        if (member.type === 'email' && member.email) {
          // First get the project name and inviter name for the email
          const { data: projectData } = await supabase
            .from('projects')
            .select('name')
            .eq('id', projectId)
            .single();
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', userId)
            .single();
          
          const { error: inviteError } = await supabase
            .from('team_invitations')
            .insert({
              project_id: projectId,
              email: member.email,
              invited_by: userId,
              role: member.accessLevel,
              status: 'pending',
            });
          
          if (inviteError) {
            console.error('[TeamSetup] Failed to create invitation:', inviteError);
            toast.error(`Failed to invite ${member.email}`);
          } else {
            // Send invitation email via Resend
            try {
              const emailResult = await supabase.functions.invoke('send-invitation-email', {
                body: {
                  recipientEmail: member.email,
                  projectName: projectData?.name || 'Unnamed Project',
                  projectId,
                  inviterName: profileData?.full_name || 'A BuildUnion user',
                  role: member.accessLevel,
                },
              });
              
              if (emailResult.error) {
                console.error('[TeamSetup] Email API error:', emailResult.error);
              } else {
                console.log('[TeamSetup] Invitation email sent successfully to:', member.email);
                toast.success(`Invitation sent to ${member.email}`);
              }
            } catch (emailErr) {
              console.error('[TeamSetup] Failed to send email:', emailErr);
            }
          }
        }
        
        // If it's an existing user, add them directly to project_members
        if (member.type === 'user' && member.userId) {
          const { error: memberError } = await supabase
            .from('project_members')
            .insert({
              project_id: projectId,
              user_id: member.userId,
              role: member.accessLevel,
            });
          
          if (memberError && !memberError.message.includes('duplicate')) {
            console.error('[TeamSetup] Failed to add member:', memberError);
          }
        }
      }
      
      // Create team structure summary citation
      const structureCitation = createCitation({
        cite_type: CITATION_TYPES.TEAM_STRUCTURE,
        question_key: 'team_structure',
        answer: `Team: ${teamMembers.length} member(s) configured`,
        value: {
          total_members: teamMembers.length,
          by_role: {
            foremen: teamMembers.filter(m => m.accessLevel === 'foreman').length,
            subcontractors: teamMembers.filter(m => m.accessLevel === 'subcontractor').length,
            inspectors: teamMembers.filter(m => m.accessLevel === 'inspector').length,
            suppliers: teamMembers.filter(m => m.accessLevel === 'supplier').length,
            clients: teamMembers.filter(m => m.accessLevel === 'client').length,
          },
        },
        metadata: {
          configured_at: new Date().toISOString(),
          project_id: projectId,
        },
      });
      citations.push(structureCitation);
      
      // ✓ Create TEAM_PERMISSION_SET citation summarizing all access levels
      const permissionSummary = teamMembers.map(m => {
        const level = ACCESS_LEVELS.find(l => l.key === m.accessLevel);
        return {
          name: m.type === 'email' ? m.email : m.userName,
          role: m.accessLevel,
          canSeePrices: level?.canSeePrices || false,
          canSeeTasks: level?.canSeeTasks || false,
          canUpdateTasks: level?.canUpdateTasks || false,
          canManageTeam: level?.canManageTeam || false,
        };
      });
      
      const permissionCitation = createCitation({
        cite_type: CITATION_TYPES.TEAM_PERMISSION_SET,
        question_key: 'team_permissions',
        answer: `${teamMembers.length} permission set(s) configured`,
        value: { permissions: permissionSummary } as Record<string, unknown>,
        metadata: {
          configured_at: new Date().toISOString(),
          roles_used: [...new Set(teamMembers.map(m => m.accessLevel))],
        },
      });
      citations.push(permissionCitation);
      
      toast.success('Team structure saved!');
      onComplete(citations);
      
    } catch (err) {
      console.error('[TeamSetup] Save failed:', err);
      toast.error('Failed to save team structure');
    } finally {
      setIsSaving(false);
    }
  }, [teamMembers, projectId, userId, onComplete, onSkip]);
  
  return (
    <div className={cn("h-full flex flex-col md:flex-row overflow-hidden", className)}>
      {/* LEFT PANEL - Chat Interface */}
      <div className="w-full md:w-[400px] lg:w-[450px] border-r border-indigo-200/50 dark:border-indigo-800/30 flex flex-col h-full bg-gradient-to-b from-indigo-50/30 via-background to-purple-50/20 dark:from-indigo-950/20 dark:via-background dark:to-purple-950/10">
        {/* Header */}
        <div className="p-4 border-b border-indigo-200/50 dark:border-indigo-800/30 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/50 dark:to-purple-950/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-indigo-700 dark:text-indigo-300">
                Team Architecture
              </h2>
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
                Stage 6 • Permission Setup
              </p>
            </div>
          </div>
        </div>
        
        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* AI Introduction */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[90%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold">MESSA AI</span>
              </div>
              <p className="text-sm text-foreground mb-2">
                <strong>Who will work on this project?</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Add team members and set their access levels. This determines what data they can see.
              </p>
            </div>
          </motion.div>
          
          {/* Email Invite Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-start"
          >
            <div className="max-w-[90%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-2">
                <Mail className="h-4 w-4" />
                <span className="text-xs font-semibold">Invite via Email</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                For external contractors not in BuildUnion
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1 h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isValidEmail) {
                      handleEmailInvite();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleEmailInvite}
                  disabled={!isValidEmail}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
          
          {/* User Search Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-start"
          >
            <div className="max-w-[90%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-2">
                <Search className="h-4 w-4" />
                <span className="text-xs font-semibold">Add BuildUnion User</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Search registered members by name or trade
              </p>
              <div className="relative">
                <Input
                  placeholder="Search by name or trade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-sm pr-8"
                />
                {isSearching && (
                  <HardHatSpinner size="sm" className="absolute right-2 top-2.5" />
                )}
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors text-left flex items-center gap-2"
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-medium">
                        {user.full_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.full_name || user.company_name || 'Unknown'}</p>
                        {user.primary_trade && (
                          <p className="text-xs text-muted-foreground truncate capitalize">
                            {user.primary_trade.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                      {user.is_verified && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
          
          {/* Added Members List */}
          {teamMembers.length > 0 && (
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="flex justify-end"
             >
               <div className="max-w-[90%] rounded-2xl rounded-br-md px-4 py-3 border-2 border-amber-400 dark:border-amber-500 bg-card text-foreground shadow-lg shadow-amber-500/10 dark:shadow-amber-500/5">
                 <div className="flex items-center gap-2 mb-2">
                   <UserCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                   <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Team ({teamMembers.length})</span>
                 </div>
                 <div className="space-y-2">
                   {teamMembers.map((member) => {
                     const level = ACCESS_LEVELS.find(l => l.key === member.accessLevel);
                     return (
                       <div
                         key={member.id}
                         className="flex items-center gap-2 bg-amber-50/20 dark:bg-amber-900/10 rounded-lg p-2"
                       >
                         <div className="flex-1 min-w-0">
                           <p className="text-sm font-medium truncate text-foreground">
                             {member.type === 'email' ? member.email : member.userName}
                           </p>
                           <div className="flex items-center gap-2">
                             <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0">
                               {level?.label}
                             </Badge>
                             <span className="text-xs text-muted-foreground">
                               {member.status === 'pending' ? (
                                 <span className="flex items-center gap-1">
                                   <Clock className="h-3 w-3" /> Pending
                                 </span>
                               ) : (
                                 <span className="flex items-center gap-1">
                                   <CheckCircle2 className="h-3 w-3" /> Active
                                 </span>
                               )}
                             </span>
                           </div>
                         </div>
                         <button
                           onClick={() => handleRemoveMember(member.id)}
                           className="p-1 hover:bg-amber-100/30 dark:hover:bg-amber-900/20 rounded"
                         >
                           <X className="h-4 w-4 text-foreground" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="p-4 border-t border-indigo-200/50 dark:border-indigo-800/30 space-y-2">
          <Button
            onClick={handleFinalize}
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          >
            {isSaving ? (
              <>
                <HardHatSpinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {teamMembers.length > 0 ? 'Confirm Team & Continue' : 'Skip - Solo Mode'}
              </>
            )}
          </Button>
          {teamMembers.length === 0 && (
            <p className="text-xs text-center text-muted-foreground">
              You can always add team members later from Project Settings
            </p>
          )}
        </div>
      </div>
      
      {/* RIGHT PANEL - Visual Feedback */}
      <div className="flex-1 bg-gradient-to-br from-indigo-50/50 via-background to-purple-50/30 dark:from-indigo-950/20 dark:via-background dark:to-purple-950/10 p-6 overflow-y-auto hidden md:block">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Access Level Configuration
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Define who can see financial data vs. task-only views
            </p>
          </div>
          
          {/* Permission Cards */}
          <div className="grid gap-4">
            {ACCESS_LEVELS.map((level, index) => {
              const membersWithLevel = teamMembers.filter(m => m.accessLevel === level.key);
              const Icon = level.icon;
              
              return (
                <motion.div
                  key={level.key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all",
                    membersWithLevel.length > 0
                      ? `border-${level.color}-400 bg-${level.color}-50/50 dark:bg-${level.color}-950/20`
                      : "border-slate-200 dark:border-slate-800 bg-card"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                      level.key === 'owner' && "bg-gradient-to-br from-amber-400 to-orange-500",
                      level.key === 'foreman' && "bg-gradient-to-br from-blue-400 to-indigo-500",
                      level.key === 'worker' && "bg-gradient-to-br from-green-400 to-emerald-500"
                    )}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{level.label}</h3>
                        {membersWithLevel.length > 0 && (
                          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                            {membersWithLevel.length} assigned
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {level.description}
                      </p>
                      
                      {/* Visibility indicators */}
                      <div className="flex gap-3 mt-3">
                        <div className={cn(
                          "flex items-center gap-1 text-xs",
                          level.canSeePrices ? "text-green-600" : "text-red-500"
                        )}>
                          {level.canSeePrices ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          Prices
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 text-xs",
                          level.canSeeTasks ? "text-green-600" : "text-amber-500"
                        )}>
                          {level.canSeeTasks ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {level.key === 'worker' ? 'Own Tasks Only' : 'All Tasks'}
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 text-xs",
                          level.canManageTeam ? "text-green-600" : "text-slate-400"
                        )}>
                          {level.canManageTeam ? <Shield className="h-3 w-3" /> : <span className="h-3 w-3" />}
                          {level.canManageTeam ? 'Team Mgmt' : ''}
                        </div>
                      </div>
                      
                      {/* Members list */}
                      {membersWithLevel.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {membersWithLevel.map(m => (
                            <Badge key={m.id} variant="outline" className="text-xs">
                              {m.type === 'email' ? m.email : m.userName}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          {/* Info Box */}
          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-indigo-700 dark:text-indigo-300">
                  Operational Truth Protection
                </h4>
                <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-1">
                  These permissions are locked after project starts. Foremen will never see 
                  your profit margins or markup percentages - only materials and deadlines.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Access Level Dialog */}
      <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              Set Access Level
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              For: <strong>{pendingInvite?.type === 'email' ? pendingInvite.email : pendingInvite?.userName}</strong>
            </p>
            
            <RadioGroup
              value={selectedAccessLevel}
              onValueChange={setSelectedAccessLevel}
              className="space-y-3"
            >
              {ACCESS_LEVELS.map((level) => {
                const Icon = level.icon;
                return (
                  <div
                    key={level.key}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer",
                      selectedAccessLevel === level.key
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                        : "border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                    )}
                    onClick={() => setSelectedAccessLevel(level.key)}
                  >
                    <RadioGroupItem value={level.key} id={level.key} />
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      level.key === 'owner' && "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400",
                      level.key === 'foreman' && "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
                      level.key === 'worker' && "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={level.key} className="font-medium cursor-pointer">
                        {level.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{level.description}</p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccessDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAccess}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Add to Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
