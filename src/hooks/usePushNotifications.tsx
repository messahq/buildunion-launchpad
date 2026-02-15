import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

let cachedVapidKey: string | null = null;

async function getVapidPublicKey(): Promise<string> {
  if (cachedVapidKey) return cachedVapidKey;

  try {
    const { data, error } = await supabase.functions.invoke("get-vapid-key");
    if (error) throw error;
    cachedVapidKey = data?.vapidPublicKey || "";
    return cachedVapidKey;
  } catch (e) {
    console.error("Failed to fetch VAPID key:", e);
    return "";
  }
}

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: "default",
  });

  // Check if push notifications are supported and listen for permission changes
  useEffect(() => {
    const isSupported = "serviceWorker" in navigator && "PushManager" in window;
    const permission = isSupported ? Notification.permission : "denied";

    setState((prev) => ({
      ...prev,
      isSupported,
      permission,
      isLoading: false,
    }));

    if (isSupported && user) {
      checkSubscription();
    }

    // Listen for permission changes via Permissions API
    let permissionStatus: PermissionStatus | null = null;
    const handlePermissionChange = () => {
      const newPermission = Notification.permission;
      setState((prev) => ({ ...prev, permission: newPermission }));
    };

    if (isSupported && navigator.permissions) {
      navigator.permissions.query({ name: "notifications" }).then((status) => {
        permissionStatus = status;
        status.addEventListener("change", handlePermissionChange);
      }).catch(() => {
        // Fallback: poll permission every 2 seconds
      });
    }

    // Fallback polling for browsers that don't support Permissions API well
    const interval = setInterval(() => {
      if (isSupported) {
        const current = Notification.permission;
        setState((prev) => {
          if (prev.permission !== current) {
            return { ...prev, permission: current };
          }
          return prev;
        });
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      if (permissionStatus) {
        permissionStatus.removeEventListener("change", handlePermissionChange);
      }
    };
  }, [user]);

  // Check if user is already subscribed
  const checkSubscription = useCallback(async () => {
    if (!user) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager?.getSubscription();

      if (subscription) {
        // Check if this subscription exists in our database
        const { data } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint)
          .single();

        setState((prev) => ({
          ...prev,
          isSubscribed: !!data,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isSubscribed: false,
        }));
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  }, [user]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    console.log("[Push] subscribe called, user:", !!user, "isSupported:", state.isSupported);
    if (!user || !state.isSupported) {
      toast.error("Push notifications are not supported");
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Request notification permission
      console.log("[Push] Requesting permission, current:", Notification.permission);
      const permission = await Notification.requestPermission();
      console.log("[Push] Permission result:", permission);
      setState((prev) => ({ ...prev, permission }));

      if (permission !== "granted") {
        toast.error("Notification permission denied. Please allow notifications in your browser settings (click the lock icon in the address bar).");
        setState((prev) => ({ ...prev, isLoading: false }));
        return false;
      }

      // Get service worker registration
      console.log("[Push] Waiting for service worker...");
      const registration = await navigator.serviceWorker.ready;
      console.log("[Push] Service worker ready, scope:", registration.scope);

      // Subscribe to push
      const vapidKey = await getVapidPublicKey();
      console.log("[Push] VAPID key fetched, length:", vapidKey?.length);
      if (!vapidKey) {
        toast.error("Push notification configuration is missing");
        setState((prev) => ({ ...prev, isLoading: false }));
        return false;
      }
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      console.log("[Push] Subscribing to push manager...");
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
      console.log("[Push] Subscription successful:", subscription.endpoint);

      const subscriptionJSON = subscription.toJSON();

      // Save subscription to database
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscriptionJSON.keys?.p256dh || "",
        auth: subscriptionJSON.keys?.auth || "",
      });

      if (error) {
        console.error("Error saving subscription:", error);
        toast.error("Failed to save notification preferences");
        setState((prev) => ({ ...prev, isLoading: false }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
      }));

      toast.success("Push notifications enabled!");
      return true;
    } catch (error: any) {
      console.error("[Push] Error subscribing:", error);
      toast.error(`Failed to enable push notifications: ${error?.message || 'Unknown error'}`);
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user, state.isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager?.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      toast.success("Push notifications disabled");
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      toast.error("Failed to disable push notifications");
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}
