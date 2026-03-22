// ============================================
// Role-Based Access Control Hook
// ============================================
// Centralizes all role permission logic for Stage 8 and project views.
// Ensures "healthy" role hierarchy: Owner > Foreman > Worker/Inspector/Subcontractor/Supplier > Member
// ============================================

import { useMemo, useCallback } from "react";
import type { VisibilityTier } from "@/components/project-wizard/stage8/types";

export type ProjectRole = 'owner' | 'foreman' | 'worker' | 'inspector' | 'subcontractor' | 'supplier' | 'member';

interface UseRoleAccessOptions {
  userRole: ProjectRole;
  userId: string;
  isEditModeEnabled?: boolean;
}

interface RoleAccess {
  /** Owner or foreman with edit mode enabled */
  canEdit: boolean;
  /** Only Owner can view financial data */
  canViewFinancials: boolean;
  /** All team members can upload verification photos */
  canUploadTaskPhotos: boolean;
  /** Check if a specific user can toggle a task's status */
  canToggleTaskStatus: (taskAssignedTo: string) => boolean;
  /** Check if user has access to a given visibility tier */
  hasAccessToTier: (tier: VisibilityTier, panelId?: string) => boolean;
  /** Whether user is the project owner */
  isOwner: boolean;
  /** Whether user is foreman or higher */
  isForeman: boolean;
  /** Whether user can manage team (owner/foreman) */
  canManageTeam: boolean;
  /** Whether user can create/send contracts */
  canManageContracts: boolean;
  /** Whether user can generate reports (DNA, Invoice, etc.) */
  canGenerateReports: boolean;
  /** Whether user can finish/close the project */
  canFinishProject: boolean;
}

const TIER_HIERARCHY: Record<VisibilityTier, number> = {
  owner: 4,
  foreman: 3,
  worker: 2,
  public: 1,
};

const ROLE_TO_TIER: Record<string, VisibilityTier> = {
  owner: 'owner',
  foreman: 'foreman',
  worker: 'worker',
  inspector: 'worker',
  subcontractor: 'worker',
  supplier: 'worker',
  member: 'public',
};

export function useRoleAccess({ userRole, userId, isEditModeEnabled = false }: UseRoleAccessOptions): RoleAccess {
  const isOwner = userRole === 'owner';
  const isForeman = userRole === 'foreman';

  const canEdit = useMemo(() => {
    const hasPermission = isOwner || isForeman;
    // Owner must explicitly enable edit mode; Foreman can always edit operational data
    return hasPermission && (isForeman || isEditModeEnabled);
  }, [isOwner, isForeman, isEditModeEnabled]);

  // CRITICAL: Only Owner can view financial data — no exceptions
  const canViewFinancials = useMemo(() => isOwner, [isOwner]);

  // All team members can upload task verification photos
  const canUploadTaskPhotos = useMemo(() => {
    if (isOwner || isForeman) return true;
    return ['worker', 'inspector', 'subcontractor', 'supplier', 'member'].includes(userRole);
  }, [userRole, isOwner, isForeman]);

  // Task status toggle: Owner/Foreman any task, workers their own
  const canToggleTaskStatus = useCallback((taskAssignedTo: string) => {
    if (isOwner || isForeman) return true;
    if (['worker', 'inspector', 'subcontractor', 'supplier'].includes(userRole)) {
      return taskAssignedTo === userId;
    }
    return false;
  }, [userRole, userId, isOwner, isForeman]);

  // Visibility tier access with Subcontractor/Supplier panel overrides
  const hasAccessToTier = useCallback((tier: VisibilityTier, panelId?: string): boolean => {
    // Subcontractor/Supplier can see Trade & Template (Panel 3) for delivery/site log access
    if ((userRole === 'subcontractor' || userRole === 'supplier') && panelId === 'panel-3-trade') {
      return true;
    }
    const userTier = ROLE_TO_TIER[userRole] || 'public';
    return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[tier];
  }, [userRole]);

  const canManageTeam = useMemo(() => isOwner || isForeman, [isOwner, isForeman]);
  const canManageContracts = useMemo(() => isOwner, [isOwner]);
  const canGenerateReports = useMemo(() => isOwner, [isOwner]);
  const canFinishProject = useMemo(() => isOwner, [isOwner]);

  return {
    canEdit,
    canViewFinancials,
    canUploadTaskPhotos,
    canToggleTaskStatus,
    hasAccessToTier,
    isOwner,
    isForeman,
    canManageTeam,
    canManageContracts,
    canGenerateReports,
    canFinishProject,
  };
}
