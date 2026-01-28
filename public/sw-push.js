// Push notification event handlers for the service worker
// This file is imported by the PWA plugin

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "New notification",
      icon: data.icon || "/pwa-icons/icon-512x512.png",
      badge: data.badge || "/pwa-icons/icon-512x512.png",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
        ...data.data,
      },
      actions: [
        {
          action: "view",
          title: "View",
        },
        {
          action: "close",
          title: "Close",
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "BuildUnion", options)
    );
  } catch (error) {
    console.error("Error showing notification:", error);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const urlToOpen = event.notification.data?.url || "/buildunion/workspace";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url.includes("/buildunion") && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("Push subscription changed, need to resubscribe");
  // The app will handle resubscription when it loads
});

// ============================================
// BACKGROUND SYNC FOR OFFLINE TASK UPDATES
// ============================================

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-tasks") {
    console.log("[SW] Background sync triggered for tasks");
    event.waitUntil(syncPendingTasks());
  }
});

async function syncPendingTasks() {
  // This will be handled by the app when it opens
  // The service worker notifies the app that sync is needed
  const allClients = await clients.matchAll({ includeUncontrolled: true });
  
  for (const client of allClients) {
    client.postMessage({
      type: "SYNC_TASKS",
      timestamp: Date.now(),
    });
  }
  
  console.log("[SW] Notified clients to sync tasks");
}

// Listen for messages from the app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: "1.1.0-offline-sync" });
  }
});
