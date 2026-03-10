import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  isOnline,
  storePendingUpdate,
  storePendingCheckin,
  getPendingUpdates,
  getPendingCheckins,
  getPendingCount,
  removePendingUpdate,
  removePendingCheckin,
  incrementRetryCount,
  incrementCheckinRetryCount,
  setupOnlineListener,
  setupOfflineListener,
  registerBackgroundSync,
} from "@/lib/offlineSync";

interface UseOfflineSyncOptions {
  projectId?: string;
  onSyncComplete?: () => void;
}

export function useOfflineSync({ projectId, onSyncComplete }: UseOfflineSyncOptions = {}) {
  const { t } = useTranslation();
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Refresh pending count
  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  // Sync a single pending task update to the server
  const syncUpdate = useCallback(async (update: Awaited<ReturnType<typeof getPendingUpdates>>[0]) => {
    const MAX_RETRIES = 3;
    
    if (update.retryCount >= MAX_RETRIES) {
      console.warn("[OfflineSync] Max retries reached for:", update.id);
      await removePendingUpdate(update.id);
      return false;
    }

    try {
      switch (update.action) {
        case "complete": {
          const { error } = await supabase
            .from("project_tasks")
            .update({ 
              status: update.data.status as string,
              updated_at: new Date().toISOString() 
            })
            .eq("id", update.taskId);

          if (error) throw error;
          break;
        }
        case "update": {
          const { error } = await supabase
            .from("project_tasks")
            .update({ 
              ...update.data,
              updated_at: new Date().toISOString() 
            })
            .eq("id", update.taskId);

          if (error) throw error;
          break;
        }
        case "create": {
          const insertData = {
            ...update.data,
            project_id: update.projectId,
          } as {
            project_id: string;
            title: string;
            assigned_by: string;
            assigned_to: string;
            [key: string]: unknown;
          };
          
          const { error } = await supabase
            .from("project_tasks")
            .insert(insertData);

          if (error) throw error;
          break;
        }
        case "delete": {
          const { error } = await supabase
            .from("project_tasks")
            .delete()
            .eq("id", update.taskId);

          if (error) throw error;
          break;
        }
      }

      // Success - remove from pending
      await removePendingUpdate(update.id);
      return true;
    } catch (error) {
      console.error("[OfflineSync] Sync failed for:", update.id, error);
      await incrementRetryCount(update.id);
      return false;
    }
  }, []);

  // Sync a single pending checkin to the server
  const syncCheckin = useCallback(async (checkin: Awaited<ReturnType<typeof getPendingCheckins>>[0]) => {
    const MAX_RETRIES = 3;
    
    if (checkin.retryCount >= MAX_RETRIES) {
      console.warn("[OfflineSync] Max retries reached for checkin:", checkin.id);
      await removePendingCheckin(checkin.id);
      return false;
    }

    try {
      if (checkin.action === "checkin") {
        const insertData: { project_id: string; user_id: string; weather_snapshot: Record<string, unknown> } = {
          project_id: checkin.projectId,
          user_id: checkin.userId,
          weather_snapshot: (checkin.data.weather_snapshot as Record<string, unknown>) || {},
        };
        const { error } = await supabase
          .from("site_checkins")
          .insert(insertData);
        if (error) throw error;
      } else if (checkin.action === "checkout") {
        const checkinId = checkin.data.checkin_id as string;
        if (checkinId) {
          const { error } = await supabase
            .from("site_checkins")
            .update({ checked_out_at: checkin.data.checked_out_at as string || new Date(checkin.timestamp).toISOString() })
            .eq("id", checkinId);
          if (error) throw error;
        }
      }

      await removePendingCheckin(checkin.id);
      return true;
    } catch (error) {
      console.error("[OfflineSync] Checkin sync failed:", checkin.id, error);
      await incrementCheckinRetryCount(checkin.id);
      return false;
    }
  }, []);

  // Sync all pending updates
  const syncAllPending = useCallback(async () => {
    if (!isOnline()) {
      console.log("[OfflineSync] Cannot sync - offline");
      return;
    }

    setIsSyncing(true);
    
    try {
      const [pendingUpdates, pendingCheckins] = await Promise.all([
        getPendingUpdates(),
        getPendingCheckins(),
      ]);
      
      const totalPending = pendingUpdates.length + pendingCheckins.length;
      if (totalPending === 0) {
        setIsSyncing(false);
        return;
      }

      console.log(`[OfflineSync] Syncing ${totalPending} pending operations`);
      
      let successCount = 0;
      let failCount = 0;

      // Sync tasks (sorted by timestamp)
      const sortedTasks = pendingUpdates.sort((a, b) => a.timestamp - b.timestamp);
      for (const update of sortedTasks) {
        const success = await syncUpdate(update);
        if (success) successCount++;
        else failCount++;
      }

      // Sync checkins (sorted by timestamp)
      const sortedCheckins = pendingCheckins.sort((a, b) => a.timestamp - b.timestamp);
      for (const checkin of sortedCheckins) {
        const success = await syncCheckin(checkin);
        if (success) successCount++;
        else failCount++;
      }

      await refreshPendingCount();

      if (successCount > 0) {
        toast.success(
          t("offline.syncComplete", "{{count}} changes synced", { count: successCount })
        );
      }

      if (failCount > 0) {
        toast.warning(
          t("offline.syncFailed", "{{count}} changes failed to sync", { count: failCount })
        );
      }

      onSyncComplete?.();
    } finally {
      setIsSyncing(false);
    }
  }, [syncUpdate, syncCheckin, refreshPendingCount, onSyncComplete, t]);

  // Queue a task update for offline sync
  const queueTaskUpdate = useCallback(async (
    taskId: string,
    action: "create" | "update" | "delete" | "complete",
    data: Record<string, unknown>
  ) => {
    if (!projectId) {
      console.warn("[OfflineSync] No projectId provided");
      return false;
    }

    if (isOnline()) {
      // Online - try to sync directly
      return false; // Let the caller handle online updates normally
    }

    // Offline - queue the update
    await storePendingUpdate(taskId, projectId, action, data);
    await refreshPendingCount();
    
    toast.info(
      t("offline.savedLocally", "Change saved locally — will sync when online"),
      { icon: "📡" }
    );
    
    registerBackgroundSync();
    return true; // Indicates we handled it offline
  }, [projectId, refreshPendingCount, t]);

  // Queue a checkin/checkout for offline sync
  const queueCheckinUpdate = useCallback(async (
    userId: string,
    action: "checkin" | "checkout",
    data: Record<string, unknown>
  ) => {
    if (!projectId) {
      console.warn("[OfflineSync] No projectId provided");
      return false;
    }

    if (isOnline()) {
      return false;
    }

    await storePendingCheckin(projectId, userId, action, data);
    await refreshPendingCount();
    
    toast.info(
      action === "checkin"
        ? t("offline.checkinSaved", "Check-in saved locally — will sync when online")
        : t("offline.checkoutSaved", "Check-out saved locally — will sync when online"),
      { icon: "📡" }
    );
    
    registerBackgroundSync();
    return true;
  }, [projectId, refreshPendingCount, t]);

  // Setup listeners
  useEffect(() => {
    refreshPendingCount();

    const cleanupOnline = setupOnlineListener(() => {
      setOnline(true);
      toast.info(t("offline.backOnline", "Back online — syncing changes..."), { icon: "🔄" });
      syncAllPending();
    });

    const cleanupOffline = setupOfflineListener(() => {
      setOnline(false);
      toast.warning(t("offline.offline", "You're offline — changes will be saved locally"), { icon: "📡" });
    });

    return () => {
      cleanupOnline();
      cleanupOffline();
    };
  }, [refreshPendingCount, syncAllPending, t]);

  return {
    online,
    pendingCount,
    isSyncing,
    queueTaskUpdate,
    queueCheckinUpdate,
    syncAllPending,
    refreshPendingCount,
  };
}
