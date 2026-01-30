import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Loader2, 
  Send, 
  Users, 
  CheckCircle2, 
  FileText,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  bu_profile?: {
    company_name: string | null;
    primary_trade: string | null;
  };
}

interface SaveAndSendContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contractNumber: string;
  onSaveAndSend: (selectedMemberIds: string[]) => Promise<void>;
  isSaving: boolean;
}

export function SaveAndSendContractDialog({
  open,
  onOpenChange,
  projectId,
  contractNumber,
  onSaveAndSend,
  isSaving
}: SaveAndSendContractDialogProps) {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!projectId || !open) return;

      setLoading(true);
      try {
        // Fetch project members
        const { data: members, error } = await supabase
          .from("project_members")
          .select("id, user_id, role")
          .eq("project_id", projectId);

        if (error) throw error;

        if (members && members.length > 0) {
          // Fetch profiles for each member
          const memberUserIds = members.map(m => m.user_id);
          
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", memberUserIds);

          const { data: buProfiles } = await supabase
            .from("bu_profiles")
            .select("user_id, company_name, primary_trade")
            .in("user_id", memberUserIds);

          // Merge data
          const enrichedMembers = members.map(member => ({
            ...member,
            profile: profiles?.find(p => p.user_id === member.user_id),
            bu_profile: buProfiles?.find(bp => bp.user_id === member.user_id),
          }));

          setTeamMembers(enrichedMembers);
        } else {
          setTeamMembers([]);
        }
      } catch (error) {
        console.error("Error fetching team members:", error);
        toast.error("Failed to load team members");
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, [projectId, open]);

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedMembers.size === teamMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(teamMembers.map(m => m.user_id)));
    }
  };

  const handleSendAndSave = async () => {
    const selectedMemberIds = Array.from(selectedMembers);
    await onSaveAndSend(selectedMemberIds);
  };

  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ");
  };

  const formatTrade = (trade: string | null | undefined) => {
    if (!trade) return null;
    return trade.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-cyan-500" />
            Save & Send Contract
          </DialogTitle>
          <DialogDescription>
            Select team members to notify about contract #{contractNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No team members found. The contract will be saved to documents.
              </p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-sm text-muted-foreground">
                  {selectedMembers.size} of {teamMembers.length} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs"
                >
                  {selectedMembers.size === teamMembers.length ? "Deselect All" : "Select All"}
                </Button>
              </div>

              {/* Team Members List */}
              <ScrollArea className="max-h-[280px]">
                <div className="space-y-2">
                  {teamMembers.map((member) => {
                    const isSelected = selectedMembers.has(member.user_id);
                    const displayName = member.profile?.full_name || 
                      member.bu_profile?.company_name || 
                      "Team Member";
                    
                    return (
                      <div
                        key={member.id}
                        onClick={() => toggleMember(member.user_id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          isSelected 
                            ? "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20" 
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleMember(member.user_id)}
                          className="pointer-events-none"
                        />
                        
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs">
                            {displayName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {displayName}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {formatRole(member.role)}
                            </Badge>
                            {member.bu_profile?.primary_trade && (
                              <span className="text-xs text-muted-foreground">
                                {formatTrade(member.bu_profile.primary_trade)}
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-cyan-500 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Info box */}
          <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-2">
              <FileText className="h-3 w-3" />
              Contract will be saved to project documents
            </p>
            {selectedMembers.size > 0 && (
              <p className="flex items-center gap-2">
                <Send className="h-3 w-3" />
                {selectedMembers.size} team member(s) will be notified
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendAndSave}
              disabled={isSaving}
              className="flex-1 gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Save & Send
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
