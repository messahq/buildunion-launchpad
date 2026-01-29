import { useMemo } from "react";
import { useAuth } from "./useAuth";

export type ProjectRole = "owner" | "foreman" | "worker" | "inspector" | "subcontractor" | "member";

export interface ProjectPermissions {
  // Core permissions
  isOwner: boolean;
  role: ProjectRole;
  
  // Task permissions
  canCreateTasks: boolean;
  canEditAllTasks: boolean;
  canDeleteTasks: boolean;
  canUpdateOwnTaskStatus: boolean;
  canAssignTasks: boolean;
  
  // Document permissions
  canUploadDocuments: boolean;
  canDeleteDocuments: boolean;
  canViewDocuments: boolean;
  
  // Team permissions
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canViewTeamDetails: boolean;
  
  // Project permissions
  canEditProject: boolean;
  canArchiveProject: boolean;
  canGenerateReports: boolean;
  canViewAllData: boolean;
  canSendToTeam: boolean;
  
  // Contract permissions
  canCreateContracts: boolean;
  canSignContracts: boolean;
  
  // AI/Analysis permissions
  canRunAIAnalysis: boolean;
  canEditAIResults: boolean;
}

export const ROLE_LABELS: Record<ProjectRole, { label: string; labelHu: string; icon: string; color: string }> = {
  owner: { label: "Owner", labelHu: "Tulajdonos", icon: "👑", color: "text-amber-600" },
  foreman: { label: "Foreman", labelHu: "Művezető", icon: "👷‍♂️", color: "text-blue-600" },
  worker: { label: "Worker", labelHu: "Munkás", icon: "🔧", color: "text-slate-600" },
  inspector: { label: "Inspector", labelHu: "Ellenőr", icon: "🔍", color: "text-purple-600" },
  subcontractor: { label: "Subcontractor", labelHu: "Alvállalkozó", icon: "🏗️", color: "text-orange-600" },
  member: { label: "Team Member", labelHu: "Csapattag", icon: "👤", color: "text-gray-600" },
};

// Permission matrix based on role
const PERMISSION_MATRIX: Record<ProjectRole, Omit<ProjectPermissions, "isOwner" | "role">> = {
  owner: {
    canCreateTasks: true,
    canEditAllTasks: true,
    canDeleteTasks: true,
    canUpdateOwnTaskStatus: true,
    canAssignTasks: true,
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canViewDocuments: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canViewTeamDetails: true,
    canEditProject: true,
    canArchiveProject: true,
    canGenerateReports: true,
    canViewAllData: true,
    canSendToTeam: true,
    canCreateContracts: true,
    canSignContracts: true,
    canRunAIAnalysis: true,
    canEditAIResults: true,
  },
  foreman: {
    canCreateTasks: true,
    canEditAllTasks: true,
    canDeleteTasks: false,
    canUpdateOwnTaskStatus: true,
    canAssignTasks: true,
    canUploadDocuments: true,
    canDeleteDocuments: false,
    canViewDocuments: true,
    canInviteMembers: false,
    canRemoveMembers: false,
    canViewTeamDetails: true,
    canEditProject: false,
    canArchiveProject: false,
    canGenerateReports: true,
    canViewAllData: true,
    canSendToTeam: true,
    canCreateContracts: false,
    canSignContracts: false,
    canRunAIAnalysis: true,
    canEditAIResults: true,
  },
  inspector: {
    canCreateTasks: false,
    canEditAllTasks: false,
    canDeleteTasks: false,
    canUpdateOwnTaskStatus: true,
    canAssignTasks: false,
    canUploadDocuments: false,
    canDeleteDocuments: false,
    canViewDocuments: true,
    canInviteMembers: false,
    canRemoveMembers: false,
    canViewTeamDetails: true,
    canEditProject: false,
    canArchiveProject: false,
    canGenerateReports: true,
    canViewAllData: true,
    canSendToTeam: false,
    canCreateContracts: false,
    canSignContracts: false,
    canRunAIAnalysis: false,
    canEditAIResults: false,
  },
  subcontractor: {
    canCreateTasks: false,
    canEditAllTasks: false,
    canDeleteTasks: false,
    canUpdateOwnTaskStatus: true,
    canAssignTasks: false,
    canUploadDocuments: true,
    canDeleteDocuments: false,
    canViewDocuments: true,
    canInviteMembers: false,
    canRemoveMembers: false,
    canViewTeamDetails: false,
    canEditProject: false,
    canArchiveProject: false,
    canGenerateReports: false,
    canViewAllData: false,
    canSendToTeam: false,
    canCreateContracts: false,
    canSignContracts: false,
    canRunAIAnalysis: false,
    canEditAIResults: false,
  },
  worker: {
    canCreateTasks: false,
    canEditAllTasks: false,
    canDeleteTasks: false,
    canUpdateOwnTaskStatus: true,
    canAssignTasks: false,
    canUploadDocuments: false,
    canDeleteDocuments: false,
    canViewDocuments: true,
    canInviteMembers: false,
    canRemoveMembers: false,
    canViewTeamDetails: false,
    canEditProject: false,
    canArchiveProject: false,
    canGenerateReports: false,
    canViewAllData: false,
    canSendToTeam: false,
    canCreateContracts: false,
    canSignContracts: false,
    canRunAIAnalysis: false,
    canEditAIResults: false,
  },
  member: {
    canCreateTasks: false,
    canEditAllTasks: false,
    canDeleteTasks: false,
    canUpdateOwnTaskStatus: true,
    canAssignTasks: false,
    canUploadDocuments: false,
    canDeleteDocuments: false,
    canViewDocuments: true,
    canInviteMembers: false,
    canRemoveMembers: false,
    canViewTeamDetails: false,
    canEditProject: false,
    canArchiveProject: false,
    canGenerateReports: false,
    canViewAllData: false,
    canSendToTeam: false,
    canCreateContracts: false,
    canSignContracts: false,
    canRunAIAnalysis: false,
    canEditAIResults: false,
  },
};

interface UseProjectPermissionsProps {
  projectOwnerId?: string;
  memberRole?: string;
}

export function useProjectPermissions({ projectOwnerId, memberRole }: UseProjectPermissionsProps): ProjectPermissions {
  const { user } = useAuth();

  return useMemo(() => {
    const isOwner = user?.id === projectOwnerId;
    
    // Determine effective role
    let role: ProjectRole = "member";
    if (isOwner) {
      role = "owner";
    } else if (memberRole && memberRole in PERMISSION_MATRIX) {
      role = memberRole as ProjectRole;
    }

    // Get permissions from matrix
    const permissions = PERMISSION_MATRIX[role];

    return {
      isOwner,
      role,
      ...permissions,
    };
  }, [user?.id, projectOwnerId, memberRole]);
}

// Utility hook to get user's role from project members
export function useUserProjectRole(projectId: string | undefined, members: Array<{ user_id: string; role: string }>) {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user || !projectId) return null;
    
    const membership = members.find(m => m.user_id === user.id);
    return membership?.role as ProjectRole | undefined;
  }, [user?.id, projectId, members]);
}
