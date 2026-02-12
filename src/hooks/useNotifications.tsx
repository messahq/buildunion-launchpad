import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Notification {
  id: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  sent_at: string;
  status: string;
  read_at: string | null;
  link: string | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notification_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data as unknown as Notification[]) || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notification-center")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notification_logs",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as unknown as Notification, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notification_logs")
      .update({ read_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notification_logs")
      .update({ read_at: new Date().toISOString() } as Record<string, unknown>)
      .in("id", unreadIds);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from("notification_logs")
      .delete()
      .eq("id", id);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const deleteAllNotifications = async () => {
    if (!user || notifications.length === 0) return;

    const ids = notifications.map((n) => n.id);
    const { error } = await supabase
      .from("notification_logs")
      .delete()
      .in("id", ids);

    if (!error) {
      setNotifications([]);
    }
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications, refetch: fetchNotifications };
};
