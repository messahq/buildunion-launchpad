import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Hook to check if the current user is a team member of any project
 * (either as owner or invited member).
 * 
 * Team members bypass certain tier restrictions for collaborative features
 * like messaging, even if they're on the free tier.
 */
export function useIsTeamMember() {
  const { user } = useAuth();
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkTeamMembership = async () => {
      if (!user) {
        setIsTeamMember(false);
        setIsLoading(false);
        return;
      }

      try {
        // Check if user is a member of any project (invited)
        const { count: memberCount, error: memberError } = await supabase
          .from("project_members")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (memberError) {
          console.error("Error checking project membership:", memberError);
          setIsTeamMember(false);
          setIsLoading(false);
          return;
        }

        // Check if user owns any team-mode project
        const { count: ownerCount, error: ownerError } = await supabase
          .from("project_summaries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("mode", "team");

        if (ownerError) {
          console.error("Error checking project ownership:", ownerError);
        }

        // User is a team member if they're invited to any project OR own a team project
        const isMember = (memberCount || 0) > 0 || (ownerCount || 0) > 0;
        setIsTeamMember(isMember);
      } catch (error) {
        console.error("Error checking team membership:", error);
        setIsTeamMember(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkTeamMembership();
  }, [user]);

  return { isTeamMember, isLoading };
}
