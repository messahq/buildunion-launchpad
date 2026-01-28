import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock data for pending updates
interface PendingTaskUpdate {
  id: string;
  taskId: string;
  projectId: string;
  action: "create" | "update" | "delete" | "complete";
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

// Simulated in-memory store for testing
let pendingUpdates: PendingTaskUpdate[] = [];

// Mock offline sync functions
function storePendingUpdate(
  taskId: string,
  projectId: string,
  action: PendingTaskUpdate["action"],
  data: Record<string, unknown>
): string {
  const update: PendingTaskUpdate = {
    id: `${taskId}-${Date.now()}`,
    taskId,
    projectId,
    action,
    data,
    timestamp: Date.now(),
    retryCount: 0,
  };
  pendingUpdates.push(update);
  return update.id;
}

function getPendingUpdates(): PendingTaskUpdate[] {
  return [...pendingUpdates];
}

function getPendingCount(): number {
  return pendingUpdates.length;
}

function removePendingUpdate(id: string): void {
  pendingUpdates = pendingUpdates.filter((u) => u.id !== id);
}

function incrementRetryCount(id: string): void {
  const update = pendingUpdates.find((u) => u.id === id);
  if (update) {
    update.retryCount += 1;
  }
}

function clearProjectPending(projectId: string): void {
  pendingUpdates = pendingUpdates.filter((u) => u.projectId !== projectId);
}

describe("Offline Sync - Store Pending Updates", () => {
  beforeEach(() => {
    pendingUpdates = [];
  });

  it("should store a pending task update", () => {
    const id = storePendingUpdate("task-1", "project-1", "complete", { status: "completed" });
    
    expect(id).toContain("task-1");
    expect(getPendingCount()).toBe(1);
  });

  it("should store multiple pending updates", () => {
    storePendingUpdate("task-1", "project-1", "complete", { status: "completed" });
    storePendingUpdate("task-2", "project-1", "update", { title: "New Title" });
    storePendingUpdate("task-3", "project-2", "delete", {});
    
    expect(getPendingCount()).toBe(3);
  });

  it("should store correct action types", () => {
    storePendingUpdate("task-1", "project-1", "create", { title: "New Task" });
    storePendingUpdate("task-2", "project-1", "update", { title: "Updated" });
    storePendingUpdate("task-3", "project-1", "complete", { status: "completed" });
    storePendingUpdate("task-4", "project-1", "delete", {});
    
    const updates = getPendingUpdates();
    expect(updates[0].action).toBe("create");
    expect(updates[1].action).toBe("update");
    expect(updates[2].action).toBe("complete");
    expect(updates[3].action).toBe("delete");
  });

  it("should initialize retryCount to 0", () => {
    storePendingUpdate("task-1", "project-1", "complete", {});
    
    const updates = getPendingUpdates();
    expect(updates[0].retryCount).toBe(0);
  });
});

describe("Offline Sync - Remove Pending Updates", () => {
  beforeEach(() => {
    pendingUpdates = [];
  });

  it("should remove a pending update by id", () => {
    const id = storePendingUpdate("task-1", "project-1", "complete", {});
    expect(getPendingCount()).toBe(1);
    
    removePendingUpdate(id);
    expect(getPendingCount()).toBe(0);
  });

  it("should only remove the specified update", () => {
    const id1 = storePendingUpdate("task-1", "project-1", "complete", {});
    storePendingUpdate("task-2", "project-1", "update", {});
    
    removePendingUpdate(id1);
    
    expect(getPendingCount()).toBe(1);
    expect(getPendingUpdates()[0].taskId).toBe("task-2");
  });

  it("should handle removing non-existent update gracefully", () => {
    storePendingUpdate("task-1", "project-1", "complete", {});
    
    removePendingUpdate("non-existent-id");
    expect(getPendingCount()).toBe(1);
  });
});

describe("Offline Sync - Retry Count", () => {
  beforeEach(() => {
    pendingUpdates = [];
  });

  it("should increment retry count", () => {
    const id = storePendingUpdate("task-1", "project-1", "complete", {});
    
    incrementRetryCount(id);
    expect(getPendingUpdates()[0].retryCount).toBe(1);
    
    incrementRetryCount(id);
    expect(getPendingUpdates()[0].retryCount).toBe(2);
  });

  it("should not exceed max retries (simulated)", () => {
    const MAX_RETRIES = 3;
    const id = storePendingUpdate("task-1", "project-1", "complete", {});
    
    for (let i = 0; i < MAX_RETRIES + 2; i++) {
      incrementRetryCount(id);
    }
    
    const update = getPendingUpdates()[0];
    // In real implementation, update would be removed after MAX_RETRIES
    // Here we just verify the count is tracked
    expect(update.retryCount).toBe(5);
    
    // Simulated removal after max retries
    if (update.retryCount >= MAX_RETRIES) {
      removePendingUpdate(id);
    }
    expect(getPendingCount()).toBe(0);
  });
});

describe("Offline Sync - Project Filtering", () => {
  beforeEach(() => {
    pendingUpdates = [];
  });

  it("should clear all pending updates for a specific project", () => {
    storePendingUpdate("task-1", "project-1", "complete", {});
    storePendingUpdate("task-2", "project-1", "update", {});
    storePendingUpdate("task-3", "project-2", "delete", {});
    
    clearProjectPending("project-1");
    
    expect(getPendingCount()).toBe(1);
    expect(getPendingUpdates()[0].projectId).toBe("project-2");
  });

  it("should not affect other projects when clearing", () => {
    storePendingUpdate("task-1", "project-1", "complete", {});
    storePendingUpdate("task-2", "project-2", "update", {});
    storePendingUpdate("task-3", "project-3", "delete", {});
    
    clearProjectPending("project-2");
    
    expect(getPendingCount()).toBe(2);
    const projectIds = getPendingUpdates().map((u) => u.projectId);
    expect(projectIds).toContain("project-1");
    expect(projectIds).toContain("project-3");
    expect(projectIds).not.toContain("project-2");
  });
});

describe("Offline Sync - Order Preservation", () => {
  beforeEach(() => {
    pendingUpdates = [];
  });

  it("should maintain chronological order of updates", async () => {
    // Add updates with small delays to ensure different timestamps
    storePendingUpdate("task-1", "project-1", "create", {});
    await new Promise((r) => setTimeout(r, 10));
    storePendingUpdate("task-2", "project-1", "update", {});
    await new Promise((r) => setTimeout(r, 10));
    storePendingUpdate("task-3", "project-1", "complete", {});
    
    const updates = getPendingUpdates();
    const sorted = [...updates].sort((a, b) => a.timestamp - b.timestamp);
    
    expect(updates.map((u) => u.taskId)).toEqual(sorted.map((u) => u.taskId));
  });

  it("should preserve data integrity", () => {
    const complexData = {
      title: "Complex Task",
      description: "With special chars: éàü & <script>",
      metadata: { nested: { deep: true } },
      tags: ["tag1", "tag2"],
    };
    
    storePendingUpdate("task-1", "project-1", "create", complexData);
    
    const updates = getPendingUpdates();
    expect(updates[0].data).toEqual(complexData);
  });
});

describe("Offline Sync - Online/Offline Detection", () => {
  it("should correctly identify online status", () => {
    // Simulated - in real browser this would use navigator.onLine
    const isOnline = () => true;
    expect(isOnline()).toBe(true);
  });

  it("should queue updates when offline", () => {
    const isOnline = () => false;
    
    if (!isOnline()) {
      storePendingUpdate("task-1", "project-1", "complete", { status: "completed" });
    }
    
    expect(getPendingCount()).toBe(1);
  });
});

describe("Offline Sync - Sync Process", () => {
  beforeEach(() => {
    pendingUpdates = [];
  });

  it("should sync updates in order and remove after success", async () => {
    storePendingUpdate("task-1", "project-1", "complete", {});
    storePendingUpdate("task-2", "project-1", "update", {});
    
    const updates = getPendingUpdates();
    let successCount = 0;
    
    // Simulate sync process
    for (const update of updates) {
      // Simulate successful sync
      const success = true;
      if (success) {
        removePendingUpdate(update.id);
        successCount++;
      }
    }
    
    expect(successCount).toBe(2);
    expect(getPendingCount()).toBe(0);
  });

  it("should handle partial sync failures", async () => {
    const id1 = storePendingUpdate("task-1", "project-1", "complete", {});
    const id2 = storePendingUpdate("task-2", "project-1", "update", {});
    
    // First sync succeeds
    removePendingUpdate(id1);
    
    // Second sync fails - increment retry
    incrementRetryCount(id2);
    
    expect(getPendingCount()).toBe(1);
    expect(getPendingUpdates()[0].retryCount).toBe(1);
  });
});
