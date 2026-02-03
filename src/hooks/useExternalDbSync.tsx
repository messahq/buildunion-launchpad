import { useExternalDb } from "./useExternalDb";
import { toast } from "sonner";

/**
 * Centralized External Database Sync Service
 * 
 * This hook provides synchronized writes to the external Supabase Pro database
 * for all entity types (projects, contracts, tasks) with user feedback.
 * 
 * Architecture: Lovable Cloud (primary) → External Supabase Pro (mirror)
 * Goal: "Operational Truth" - what admin sees must exist in external DB
 */

interface SyncResult {
  success: boolean;
  error?: string;
}

interface ProjectData {
  id: string;
  lovable_user_id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  status?: string;
}

interface ContractData {
  id: string;
  lovable_user_id: string;
  project_id?: string | null;
  title: string;
  status?: string;
}

interface TaskData {
  id: string;
  project_id: string;
  title: string;
  status?: string;
}

export const useExternalDbSync = () => {
  const { insert, update, remove, query } = useExternalDb();

  /**
   * Sync a project to the external database
   * @param project Project data to sync
   * @param showToast Whether to show toast notifications (default: true)
   */
  const syncProject = async (
    project: ProjectData,
    showToast = true
  ): Promise<SyncResult> => {
    try {
      const result = await insert("projects", {
        id: project.id,
        lovable_user_id: project.lovable_user_id,
        name: project.name,
        description: project.description || null,
        address: project.address || null,
        status: project.status || "draft",
      });

      if (result.error) {
        // Check if it's a duplicate key error (already exists)
        if (result.error.includes("duplicate") || result.error.includes("23505")) {
          // Try to update instead
          const updateResult = await update(
            "projects",
            {
              name: project.name,
              description: project.description || null,
              address: project.address || null,
              status: project.status || "draft",
            },
            { id: project.id }
          );

          if (updateResult.error) {
            throw new Error(updateResult.error);
          }
          
          if (showToast) {
            console.log("[External DB] Project updated:", project.id);
          }
          return { success: true };
        }
        
        throw new Error(result.error);
      }

      if (showToast) {
        console.log("[External DB] Project synced:", project.id);
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[External DB] Project sync failed:", errorMessage);
      
      if (showToast) {
        toast.warning("⚠️ External DB sync failed", {
          description: "Project saved locally. External backup pending.",
        });
      }
      
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Sync a contract to the external database
   * @param contract Contract data to sync
   * @param showToast Whether to show toast notifications (default: true)
   */
  const syncContract = async (
    contract: ContractData,
    showToast = true
  ): Promise<SyncResult> => {
    try {
      const result = await insert("contracts", {
        id: contract.id,
        lovable_user_id: contract.lovable_user_id,
        project_id: contract.project_id || null,
        title: contract.title,
        status: contract.status || "draft",
      });

      if (result.error) {
        // Check if it's a duplicate key error (already exists)
        if (result.error.includes("duplicate") || result.error.includes("23505")) {
          // Try to update instead
          const updateResult = await update(
            "contracts",
            {
              title: contract.title,
              status: contract.status || "draft",
              project_id: contract.project_id || null,
            },
            { id: contract.id }
          );

          if (updateResult.error) {
            throw new Error(updateResult.error);
          }
          
          if (showToast) {
            console.log("[External DB] Contract updated:", contract.id);
          }
          return { success: true };
        }
        
        throw new Error(result.error);
      }

      if (showToast) {
        console.log("[External DB] Contract synced:", contract.id);
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[External DB] Contract sync failed:", errorMessage);
      
      if (showToast) {
        toast.warning("⚠️ External DB sync failed", {
          description: "Contract saved locally. External backup pending.",
        });
      }
      
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Sync a task to the external database
   * @param task Task data to sync
   * @param showToast Whether to show toast notifications (default: true)
   */
  const syncTask = async (
    task: TaskData,
    showToast = true
  ): Promise<SyncResult> => {
    try {
      const result = await insert("project_tasks", {
        id: task.id,
        project_id: task.project_id,
        title: task.title,
        status: task.status || "pending",
      });

      if (result.error) {
        // Check if it's a duplicate key error (already exists)
        if (result.error.includes("duplicate") || result.error.includes("23505")) {
          // Try to update instead
          const updateResult = await update(
            "project_tasks",
            {
              title: task.title,
              status: task.status || "pending",
            },
            { id: task.id }
          );

          if (updateResult.error) {
            throw new Error(updateResult.error);
          }
          
          if (showToast) {
            console.log("[External DB] Task updated:", task.id);
          }
          return { success: true };
        }
        
        throw new Error(result.error);
      }

      if (showToast) {
        console.log("[External DB] Task synced:", task.id);
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[External DB] Task sync failed:", errorMessage);
      
      if (showToast) {
        toast.warning("⚠️ External DB sync failed", {
          description: "Task saved locally. External backup pending.",
        });
      }
      
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Bulk sync multiple entities at once
   * Useful for initial migration or catch-up sync
   */
  const bulkSync = async (
    entities: {
      projects?: ProjectData[];
      contracts?: ContractData[];
      tasks?: TaskData[];
    }
  ): Promise<{ 
    projects: SyncResult[];
    contracts: SyncResult[];
    tasks: SyncResult[];
  }> => {
    const results = {
      projects: [] as SyncResult[],
      contracts: [] as SyncResult[],
      tasks: [] as SyncResult[],
    };

    // Sync projects
    if (entities.projects?.length) {
      for (const project of entities.projects) {
        const result = await syncProject(project, false);
        results.projects.push(result);
      }
    }

    // Sync contracts
    if (entities.contracts?.length) {
      for (const contract of entities.contracts) {
        const result = await syncContract(contract, false);
        results.contracts.push(result);
      }
    }

    // Sync tasks
    if (entities.tasks?.length) {
      for (const task of entities.tasks) {
        const result = await syncTask(task, false);
        results.tasks.push(result);
      }
    }

    const totalSynced = 
      results.projects.filter(r => r.success).length +
      results.contracts.filter(r => r.success).length +
      results.tasks.filter(r => r.success).length;

    const totalFailed = 
      results.projects.filter(r => !r.success).length +
      results.contracts.filter(r => !r.success).length +
      results.tasks.filter(r => !r.success).length;

    if (totalSynced > 0 && totalFailed === 0) {
      toast.success(`✅ ${totalSynced} records synced to external DB`);
    } else if (totalSynced > 0 && totalFailed > 0) {
      toast.warning(`⚠️ Sync partial: ${totalSynced} succeeded, ${totalFailed} failed`);
    } else if (totalFailed > 0) {
      toast.error(`❌ Sync failed: ${totalFailed} records could not be synced`);
    }

    return results;
  };

  /**
   * Delete a record from external database
   */
  const deleteFromExternal = async (
    table: "projects" | "contracts" | "project_tasks",
    id: string
  ): Promise<SyncResult> => {
    try {
      const result = await remove(table, { id });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      console.log(`[External DB] ${table} deleted:`, id);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[External DB] ${table} delete failed:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  return {
    syncProject,
    syncContract,
    syncTask,
    bulkSync,
    deleteFromExternal,
  };
};
