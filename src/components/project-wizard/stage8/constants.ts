// ============================================
// STAGE 8: Constants & Configuration
// ============================================

import {
  Shield,
  Users,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  Image,
  Camera,
  AlertTriangle,
  Building2,
  Ruler,
  Hammer,
  Calendar,
  FolderOpen,
  Cloud,
  DollarSign,
} from "lucide-react";
import type { TierConfig, DocumentCategoryConfig, PanelConfig, TaskPhaseConfig, VisibilityTier } from "./types";

// ============================================
// VISIBILITY TIERS
// ============================================
export const VISIBILITY_TIERS: TierConfig[] = [
  {
    key: 'owner',
    label: 'Owner Only',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    canEdit: true,
    description: 'Financial data, profit margins, sensitive contracts',
  },
  {
    key: 'foreman',
    label: 'Foreman+',
    icon: Users,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    canEdit: true,
    description: 'Team management, scheduling, documents',
  },
  {
    key: 'worker',
    label: 'All Team',
    icon: Eye,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    canEdit: false,
    description: 'Task details, work instructions, weather alerts',
  },
  {
    key: 'public',
    label: 'Public',
    icon: EyeOff,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    canEdit: false,
    description: 'Client-safe project overview',
  },
];

// ============================================
// DOCUMENT CATEGORIES
// ============================================
export const DOCUMENT_CATEGORIES: DocumentCategoryConfig[] = [
  { key: 'legal', label: 'Legal', icon: FileCheck, color: 'text-red-600' },
  { key: 'technical', label: 'Technical', icon: FileText, color: 'text-blue-600' },
  { key: 'visual', label: 'Visual', icon: Image, color: 'text-green-600' },
  { key: 'verification', label: 'Verification', icon: Camera, color: 'text-purple-600' },
  { key: 'obc_pending', label: 'OBC Pending', icon: AlertTriangle, color: 'text-yellow-600' },
];

// ============================================
// 8 PANEL DEFINITIONS
// ============================================
export const PANELS: PanelConfig[] = [
  {
    id: 'panel-1-basics',
    panelNumber: 1,
    title: 'Project Basics',
    titleKey: 'stage8.panel1',
    icon: Building2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    visibilityTier: 'public',
    dataKeys: ['PROJECT_NAME', 'LOCATION', 'WORK_TYPE'],
    description: 'Name, address, work type',
  },
  {
    id: 'panel-2-gfa',
    panelNumber: 2,
    title: 'Area & Dimensions',
    titleKey: 'stage8.panel2',
    icon: Ruler,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
    visibilityTier: 'foreman',
    dataKeys: ['GFA_LOCK', 'BLUEPRINT_UPLOAD', 'SITE_CONDITION'],
    description: 'GFA, blueprints, site conditions',
  },
  {
    id: 'panel-3-trade',
    panelNumber: 3,
    title: 'Trade & Template',
    titleKey: 'stage8.panel3',
    icon: Hammer,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-300 dark:border-orange-700',
    visibilityTier: 'foreman',
    dataKeys: ['TRADE_SELECTION', 'TEMPLATE_LOCK', 'EXECUTION_MODE'],
    description: 'Trade, template, execution mode',
  },
  {
    id: 'panel-4-team',
    panelNumber: 4,
    title: 'Team Architecture',
    titleKey: 'stage8.panel4',
    icon: Users,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-300 dark:border-teal-700',
    visibilityTier: 'worker',
    dataKeys: ['TEAM_STRUCTURE', 'TEAM_MEMBER_INVITE', 'TEAM_PERMISSION_SET', 'TEAM_SIZE'],
    description: 'Members, roles, permissions',
  },
  {
    id: 'panel-5-timeline',
    panelNumber: 5,
    title: 'Execution Timeline',
    titleKey: 'stage8.panel5',
    icon: Calendar,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
    visibilityTier: 'worker',
    dataKeys: ['TIMELINE', 'END_DATE', 'DNA_FINALIZED'],
    description: 'Start/end dates, tasks, phases',
  },
  {
    id: 'panel-6-documents',
    panelNumber: 6,
    title: 'Documents & Contracts',
    titleKey: 'stage8.panel6',
    icon: FolderOpen,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50 dark:bg-sky-950/30',
    borderColor: 'border-sky-300 dark:border-sky-700',
    visibilityTier: 'foreman',
    dataKeys: ['BLUEPRINT_UPLOAD', 'SITE_PHOTO', 'VISUAL_VERIFICATION'],
    description: 'Blueprints, photos, contracts',
  },
  {
    id: 'panel-7-weather',
    panelNumber: 7,
    title: 'Site Log & Location',
    titleKey: 'stage8.panel7',
    icon: Cloud,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    visibilityTier: 'worker',
    dataKeys: ['WEATHER_ALERT', 'SITE_CONDITION'],
    description: 'Site log, weather alerts, location',
  },
  {
    id: 'panel-8-financial',
    panelNumber: 8,
    title: 'Financial Summary',
    titleKey: 'stage8.panel8',
    icon: DollarSign,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-300 dark:border-red-700',
    visibilityTier: 'owner',
    dataKeys: ['BUDGET', 'MATERIAL', 'DEMOLITION_PRICE'],
    description: 'Budget, costs, profit (Owner only)',
  },
];

// ============================================
// TASK PHASES FOR PANEL 5
// ============================================
export const TASK_PHASES: TaskPhaseConfig[] = [
  { key: 'demolition', label: 'Demolition', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950/30' },
  { key: 'preparation', label: 'Preparation', color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950/30' },
  { key: 'installation', label: 'Installation', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/30' },
  { key: 'finishing', label: 'Finishing & QC', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950/30' },
];
