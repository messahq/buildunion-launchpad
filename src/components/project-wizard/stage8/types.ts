// ============================================
// STAGE 8: Shared Types & Interfaces
// ============================================

import { Citation } from "@/types/citation";

// ============================================
// VISIBILITY TIERS
// ============================================
export type VisibilityTier = 'owner' | 'foreman' | 'worker' | 'public';

export interface TierConfig {
  key: VisibilityTier;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  canEdit: boolean;
  description: string;
}

// ============================================
// DOCUMENT CATEGORIES
// ============================================
export type DocumentCategory = 'legal' | 'technical' | 'visual' | 'verification' | 'obc_pending';

export interface DocumentCategoryConfig {
  key: DocumentCategory;
  label: string;
  icon: React.ElementType;
  color: string;
}

// ============================================
// PANEL DEFINITIONS
// ============================================
export interface PanelConfig {
  id: string;
  panelNumber: number;
  title: string;
  titleKey: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  visibilityTier: VisibilityTier;
  dataKeys: string[];
  description: string;
}

// ============================================
// TASK WITH CHECKLIST INTERFACE
// ============================================
export interface TaskWithChecklist {
  id: string;
  title: string;
  status: string;
  priority: string;
  phase: string;
  assigned_to: string;
  due_date: string | null;
  created_at: string | null;
  checklist: { id: string; text: string; done: boolean; photoUrl?: string }[];
  isSubTask?: boolean;
  templateItemCost?: number | null;
}

// ============================================
// DOCUMENT WITH CATEGORY
// ============================================
export interface DocumentWithCategory {
  id: string;
  file_name: string;
  file_path: string;
  category: DocumentCategory;
  citationId?: string;
  uploadedAt?: string;
  uploaded_by_name?: string;
  uploaded_by_role?: string;
  ai_analysis_status?: string | null;
  ai_analysis_result?: {
    is_regulatory?: boolean;
    doc_type?: string;
    confidence?: string;
    key_details?: string;
  } | null;
}

// ============================================
// TASK PHASE CONFIG
// ============================================
export interface TaskPhaseConfig {
  key: string;
  label: string;
  color: string;
  bgColor: string;
}

// ============================================
// PROPS
// ============================================
export interface Stage8FinalReviewProps {
  projectId: string;
  userId: string;
  userRole: 'owner' | 'foreman' | 'worker' | 'inspector' | 'subcontractor' | 'supplier' | 'member';
  onComplete: () => void;
  className?: string;
}
