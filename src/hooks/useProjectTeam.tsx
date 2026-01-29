import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ProjectRole, ROLE_LABELS } from "./useProjectPermissions";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email?: string;
  full_name?: string;
  avatar_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_updated_at?: string | null;
}

export type TeamRole = "foreman" | "worker" | "inspector" | "subcontractor" | "member";

export const TEAM_ROLES: Record<TeamRole, { label: string; description: string; icon: string; permissions: string[] }> = {
  foreman: { 
    label: "Foreman", 
    description: "Leads and supervises the work crew", 
    icon: "👷‍♂️",
    permissions: ["Create tasks", "Edit tasks", "Upload documents", "Generate reports", "View all data"]
  },
  worker: { 
    label: "Worker", 
    description: "Performs construction tasks", 
    icon: "🔧",
    permissions: ["View assigned tasks", "Update own task status", "View documents"]
  },
  inspector: { 
    label: "Inspector", 
    description: "Ensures quality and compliance", 
    icon: "🔍",
    permissions: ["View all data", "Generate reports", "View team details"]
  },
  subcontractor: { 
    label: "Subcontractor", 
    description: "Specialized trade contractor", 
    icon: "🏗️",
    permissions: ["View assigned tasks", "Upload documents", "Update own task status"]
  },
  member: { 
    label: "Team Member", 
    description: "General project access", 
    icon: "👤",
    permissions: ["View assigned tasks", "Update own task status", "View documents"]
  },
};

interface TeamInvitation {
  id: string;
  email: string;
  status: string;
  created_at: string;
  project_id: string;
  role?: TeamRole;
}

interface PendingInvitation {
  id: string;
  project_id: string;
  project_name: string;
  invited_by: string;
  created_at: string;
}

export function useProjectTeam(projectId?: string) {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch team members and invitations
  const fetchTeamData = useCallback(async () => {
    if (!projectId || !user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId);

      if (membersError) throw membersError;

      // Get user details for members including GPS location from bu_profiles
      const membersWithDetails = await Promise.all(
        (membersData || []).map(async (member) => {
          // Fetch from profiles for name
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", member.user_id)
            .maybeSingle();

          // Fetch from bu_profiles for GPS location
          const { data: buProfile } = await supabase
            .from("bu_profiles")
            .select("latitude, longitude, location_updated_at, avatar_url")
            .eq("user_id", member.user_id)
            .maybeSingle();

          return {
            ...member,
            full_name: profile?.full_name || "Unknown User",
            avatar_url: buProfile?.avatar_url || profile?.avatar_url || null,
            latitude: buProfile?.latitude || null,
            longitude: buProfile?.longitude || null,
            location_updated_at: buProfile?.location_updated_at || null,
          };
        })
      );

      setMembers(membersWithDetails);

      // Fetch invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (!invitationsError) {
        // Map the invitations to ensure role is properly typed
        const typedInvitations = (invitationsData || []).map((inv) => ({
          ...inv,
          role: (inv.role as TeamRole) || undefined,
        }));
        setInvitations(typedInvitations);
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  // Set up realtime subscription
  useEffect(() => {
    if (!projectId) return;

    fetchTeamData();

    // Subscribe to realtime changes
    const membersChannel = supabase
      .channel(`project-members-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_members",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchTeamData();
        }
      )
      .subscribe();

    const invitationsChannel = supabase
      .channel(`team-invitations-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_invitations",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchTeamData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(invitationsChannel);
    };
  }, [projectId, fetchTeamData]);

  // Send invitation with optional role
  const sendInvitation = async (email: string, role: TeamRole = "member") => {
    if (!projectId || !user) return { success: false, error: "Not authenticated" };

    try {
      // Store role in team_invitations table (server-side storage)
      const { error } = await supabase.from("team_invitations").insert({
        project_id: projectId,
        email: email.toLowerCase().trim(),
        invited_by: user.id,
        status: "pending",
        role: role, // Store role in database
      });

      if (error) {
        if (error.code === "23505") {
          return { success: false, error: "This email has already been invited" };
        }
        throw error;
      }

      await fetchTeamData();
      return { success: true };
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      return { success: false, error: error.message || "Failed to send invitation" };
    }
  };

  // Cancel invitation
  const cancelInvitation = async (invitationId: string) => {
    if (!user) return { success: false, error: "Not authenticated" };

    try {
      const { error } = await supabase
        .from("team_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      await fetchTeamData();
      return { success: true };
    } catch (error: any) {
      console.error("Error canceling invitation:", error);
      return { success: false, error: error.message || "Failed to cancel invitation" };
    }
  };

  // Remove member
  const removeMember = async (memberId: string) => {
    if (!user) return { success: false, error: "Not authenticated" };

    try {
      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      await fetchTeamData();
      return { success: true };
    } catch (error: any) {
      console.error("Error removing member:", error);
      return { success: false, error: error.message || "Failed to remove member" };
    }
  };

  return {
    members,
    invitations,
    loading,
    sendInvitation,
    cancelInvitation,
    removeMember,
    refresh: fetchTeamData,
  };
}

// Hook for fetching user's pending invitations
export function usePendingInvitations() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("team_invitations")
        .select(`
          id,
          project_id,
          invited_by,
          created_at,
          projects:project_id (name)
        `)
        .eq("email", user.email.toLowerCase())
        .eq("status", "pending");

      if (error) throw error;

      const formattedInvitations = (data || []).map((inv: any) => ({
        id: inv.id,
        project_id: inv.project_id,
        project_name: inv.projects?.name || "Unknown Project",
        invited_by: inv.invited_by,
        created_at: inv.created_at,
      }));

      setInvitations(formattedInvitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchInvitations();

    if (!user?.email) return;

    // Subscribe to realtime changes
    const channel = supabase
      .channel("user-invitations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_invitations",
        },
        () => {
          fetchInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, fetchInvitations]);

  // Accept invitation with role
  const acceptInvitation = async (invitationId: string, projectId: string) => {
    if (!user) return { success: false, error: "Not authenticated" };

    try {
      // Get the invitation to find email and role from database (server-side)
      const { data: invitation } = await supabase
        .from("team_invitations")
        .select("email, role")
        .eq("id", invitationId)
        .maybeSingle();

      // Use role from database - never from client storage
      const role = (invitation?.role as TeamRole) || "member";

      // Update invitation status
      const { error: updateError } = await supabase
        .from("team_invitations")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", invitationId);

      if (updateError) throw updateError;

      // Add as project member with role from database
      const { error: memberError } = await supabase
        .from("project_members")
        .insert({
          project_id: projectId,
          user_id: user.id,
          role: role,
        });

      if (memberError && memberError.code !== "23505") {
        throw memberError;
      }

      await fetchInvitations();
      return { success: true };
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      return { success: false, error: error.message || "Failed to accept invitation" };
    }
  };

  // Decline invitation
  const declineInvitation = async (invitationId: string) => {
    if (!user) return { success: false, error: "Not authenticated" };

    try {
      const { error } = await supabase
        .from("team_invitations")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", invitationId);

      if (error) throw error;

      await fetchInvitations();
      return { success: true };
    } catch (error: any) {
      console.error("Error declining invitation:", error);
      return { success: false, error: error.message || "Failed to decline invitation" };
    }
  };

  return {
    invitations,
    loading,
    acceptInvitation,
    declineInvitation,
    refresh: fetchInvitations,
  };
}
