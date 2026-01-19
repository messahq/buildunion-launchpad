import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface OnlineUser {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  companyName: string | null;
  primaryTrade: string | null;
  lastSeen: Date;
}

export const useOnlinePresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch current user's profile for presence data
  const getCurrentUserProfile = useCallback(async () => {
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .single();

    const { data: buProfile } = await supabase
      .from("bu_profiles")
      .select("company_name, primary_trade, avatar_url")
      .eq("user_id", user.id)
      .single();

    return {
      id: user.id,
      fullName: profile?.full_name || user.email?.split("@")[0] || "Anonymous",
      avatarUrl: buProfile?.avatar_url || profile?.avatar_url || null,
      companyName: buProfile?.company_name || null,
      primaryTrade: buProfile?.primary_trade || null,
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setOnlineUsers([]);
      setIsConnected(false);
      return;
    }

    const setupPresence = async () => {
      const userProfile = await getCurrentUserProfile();
      if (!userProfile) return;

      // Create a presence channel for BuildUnion users
      const presenceChannel = supabase.channel("buildunion-presence", {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      presenceChannel
        .on("presence", { event: "sync" }, () => {
          const state = presenceChannel.presenceState();
          const users: OnlineUser[] = [];

          Object.entries(state).forEach(([key, presences]) => {
            if (Array.isArray(presences) && presences.length > 0) {
              const presence = presences[0] as any;
              users.push({
                id: key,
                fullName: presence.fullName || "Unknown",
                avatarUrl: presence.avatarUrl || null,
                companyName: presence.companyName || null,
                primaryTrade: presence.primaryTrade || null,
                lastSeen: new Date(presence.lastSeen || Date.now()),
              });
            }
          });

          setOnlineUsers(users.filter(u => u.id !== user.id));
        })
        .on("presence", { event: "join" }, ({ key, newPresences }) => {
          console.log("User joined:", key);
        })
        .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
          console.log("User left:", key);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            setIsConnected(true);
            // Track this user's presence
            await presenceChannel.track({
              ...userProfile,
              lastSeen: new Date().toISOString(),
            });
          }
        });

      setChannel(presenceChannel);

      // Update lastSeen periodically
      const updateInterval = setInterval(async () => {
        if (presenceChannel) {
          await presenceChannel.track({
            ...userProfile,
            lastSeen: new Date().toISOString(),
          });
        }
      }, 30000); // Update every 30 seconds

      return () => {
        clearInterval(updateInterval);
        presenceChannel.unsubscribe();
      };
    };

    setupPresence();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user, getCurrentUserProfile]);

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
    isConnected,
  };
};
