/**
 * Offline Sync Utility for BuildUnion PWA
 * 
 * Stores pending task updates in IndexedDB when offline,
 * then syncs them when the network connection is restored.
 */

const DB_NAME = "buildunion-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-tasks";

interface PendingTaskUpdate {
  id: string;
  taskId: string;
  projectId: string;
  action: "create" | "update" | "delete" | "complete";
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

// Open IndexedDB connection
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("taskId", "taskId", { unique: false });
        store.createIndex("projectId", "projectId", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

// Check if we're online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Store a pending task update
export async function storePendingUpdate(
  taskId: string,
  projectId: string,
  action: PendingTaskUpdate["action"],
  data: Record<string, unknown>
): Promise<string> {
  const db = await openDB();
  
  const pendingUpdate: PendingTaskUpdate = {
    id: `${taskId}-${Date.now()}`,
    taskId,
    projectId,
    action,
    data,
    timestamp: Date.now(),
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(pendingUpdate);

    request.onsuccess = () => {
      console.log("[OfflineSync] Stored pending update:", pendingUpdate.id);
      resolve(pendingUpdate.id);
    };
    request.onerror = () => reject(request.error);
  });
}

// Get all pending updates
export async function getPendingUpdates(): Promise<PendingTaskUpdate[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get pending updates count
export async function getPendingCount(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Remove a pending update after successful sync
export async function removePendingUpdate(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      console.log("[OfflineSync] Removed pending update:", id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Update retry count for failed sync
export async function incrementRetryCount(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const item = getRequest.result as PendingTaskUpdate;
      if (item) {
        item.retryCount += 1;
        const putRequest = store.put(item);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Clear all pending updates for a project
export async function clearProjectPending(projectId: string): Promise<void> {
  const db = await openDB();
  const updates = await getPendingUpdates();
  const projectUpdates = updates.filter((u) => u.projectId === projectId);

  for (const update of projectUpdates) {
    await removePendingUpdate(update.id);
  }
}

// Register for background sync if available
export function registerBackgroundSync(): void {
  if ("serviceWorker" in navigator && "sync" in (window as unknown as { sync?: unknown })) {
    navigator.serviceWorker.ready.then((registration) => {
      // @ts-expect-error - sync is not in TypeScript's ServiceWorkerRegistration type
      if (registration.sync) {
        // @ts-expect-error - sync API
        registration.sync.register("sync-tasks").then(() => {
          console.log("[OfflineSync] Background sync registered");
        }).catch((err: Error) => {
          console.warn("[OfflineSync] Background sync registration failed:", err);
        });
      }
    });
  }
}

// Listen for online status changes
export function setupOnlineListener(onOnline: () => void): () => void {
  const handleOnline = () => {
    console.log("[OfflineSync] Network restored, triggering sync");
    onOnline();
  };

  window.addEventListener("online", handleOnline);

  return () => {
    window.removeEventListener("online", handleOnline);
  };
}

// Listen for offline status changes
export function setupOfflineListener(onOffline: () => void): () => void {
  const handleOffline = () => {
    console.log("[OfflineSync] Network lost, switching to offline mode");
    onOffline();
  };

  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("offline", handleOffline);
  };
}
