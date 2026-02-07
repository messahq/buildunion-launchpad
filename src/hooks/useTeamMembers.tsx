import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface TeamMemberInfo {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  companyName?: string;
  primaryTrade?: string;
  projectName: string;
  projectId: string;
  role: string;
}

/**
 * Hook to fetch all team members from projects where the current user is involved
 * (either as owner or as an invited member).
 * Returns a deduplicated list of team members that the user can message.
 */
export function useTeamMembers() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMemberInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!user) {
        setTeamMembers([]);
        setIsLoading(false);
        return;
      }

      try {
        // 1. Get projects where user is owner (team mode)
        const { data: ownedProjects, error: ownedError } = await supabase
          .from("projects")
          .select("id, name")
          .eq("user_id", user.id)
          .is("archived_at", null);

        if (ownedError) {
          console.error("Error fetching owned projects:", ownedError);
        }

        // 2. Get projects where user is a member
        const { data: memberProjects, error: memberError } = await supabase
          .from("project_members")
          .select("project_id, role, projects(id, name, user_id)")
          .eq("user_id", user.id);

        if (memberError) {
          console.error("Error fetching member projects:", memberError);
        }

        // Collect all project IDs
        const ownedProjectIds = ownedProjects?.map(p => p.id) || [];
        const memberProjectIds = memberProjects?.map(m => m.project_id) || [];
        const allProjectIds = [...new Set([...ownedProjectIds, ...memberProjectIds])];

        if (allProjectIds.length === 0) {
          setTeamMembers([]);
          setIsLoading(false);
          return;
        }

        // 3. Get all members from these projects
        const { data: allMembers, error: membersError } = await supabase
          .from("project_members")
          .select("user_id, role, project_id, projects(id, name, user_id)")
          .in("project_id", allProjectIds);

        if (membersError) {
          console.error("Error fetching project members:", membersError);
        }

        // 4. Get project owners (they're not in project_members but can be messaged)
        const projectOwnerIds = new Set<string>();
        memberProjects?.forEach(mp => {
          const project = mp.projects as unknown as { id: string; name: string; user_id: string } | null;
          if (project?.user_id && project.user_id !== user.id) {
            projectOwnerIds.add(project.user_id);
          }
        });

        // Collect all unique user IDs (excluding current user)
        const memberUserIds = (allMembers || [])
          .map(m => m.user_id)
          .filter(id => id !== user.id);
        
        const allUserIds = [...new Set([...memberUserIds, ...Array.from(projectOwnerIds)])];

        if (allUserIds.length === 0) {
          setTeamMembers([]);
          setIsLoading(false);
          return;
        }

        // 5. Fetch profiles for these users
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", allUserIds);

        const { data: buProfiles } = await supabase
          .from("bu_profiles")
          .select("user_id, company_name, primary_trade, avatar_url")
          .in("user_id", allUserIds);

        const profileMap = new Map<string, { full_name?: string; avatar_url?: string }>();
        profiles?.forEach(p => profileMap.set(p.user_id, p));

        const buProfileMap = new Map<string, { company_name?: string; primary_trade?: string; avatar_url?: string }>();
        buProfiles?.forEach(p => buProfileMap.set(p.user_id, p));

        // Build project name map
        const projectNameMap = new Map<string, string>();
        ownedProjects?.forEach(p => projectNameMap.set(p.id, p.name));
        memberProjects?.forEach(mp => {
          const project = mp.projects as unknown as { id: string; name: string } | null;
          if (project) {
            projectNameMap.set(project.id, project.name);
          }
        });

        // Build team members list
        const membersMap = new Map<string, TeamMemberInfo>();

        // Add members from projects
        allMembers?.forEach(member => {
          if (member.user_id === user.id) return; // Skip self
          
          const profile = profileMap.get(member.user_id);
          const buProfile = buProfileMap.get(member.user_id);
          const project = member.projects as unknown as { id: string; name: string } | null;
          
          const key = member.user_id;
          if (!membersMap.has(key)) {
            membersMap.set(key, {
              userId: member.user_id,
              fullName: profile?.full_name || buProfile?.company_name || "Unknown User",
              avatarUrl: buProfile?.avatar_url || profile?.avatar_url,
              companyName: buProfile?.company_name,
              primaryTrade: buProfile?.primary_trade,
              projectName: project?.name || "Unknown Project",
              projectId: member.project_id,
              role: member.role,
            });
          }
        });

        // Add project owners (who invited the current user)
        memberProjects?.forEach(mp => {
          const project = mp.projects as unknown as { id: string; name: string; user_id: string } | null;
          if (!project || project.user_id === user.id) return;
          
          const key = project.user_id;
          if (!membersMap.has(key)) {
            const profile = profileMap.get(project.user_id);
            const buProfile = buProfileMap.get(project.user_id);
            
            membersMap.set(key, {
              userId: project.user_id,
              fullName: profile?.full_name || buProfile?.company_name || "Unknown User",
              avatarUrl: buProfile?.avatar_url || profile?.avatar_url,
              companyName: buProfile?.company_name,
              primaryTrade: buProfile?.primary_trade,
              projectName: project.name,
              projectId: project.id,
              role: "owner",
            });
          }
        });

        setTeamMembers(Array.from(membersMap.values()));
      } catch (error) {
        console.error("Error fetching team members:", error);
        setTeamMembers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamMembers();
  }, [user]);

  return { teamMembers, isLoading };
}
