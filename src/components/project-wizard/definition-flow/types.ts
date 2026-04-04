// ============================================
// Definition Flow — Shared Types, Constants & Helpers
// Extracted from DefinitionFlowStage.tsx
// ============================================

import {
  Hammer,
  PaintBucket,
  Layers,
  Settings,
  User,
  Users,
} from "lucide-react";

export interface TemplateItem {
  id: string;
  name: string;
  category: 'material' | 'labor';
  baseQuantity: number;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  applyWaste?: boolean;
}

export interface TeamMember {
  id: string;
  role: string;
  count: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: 'blueprint' | 'site_photo';
  file: File;
  previewUrl?: string;
  uploadProgress?: number;
  uploaded?: boolean;
  storageUrl?: string;
}

export const TRADE_OPTIONS = [
  { key: 'flooring', label: 'Flooring', icon: Layers },
  { key: 'painting', label: 'Painting', icon: PaintBucket },
  { key: 'drywall', label: 'Drywall', icon: Hammer },
  { key: 'concrete', label: 'Concrete', icon: Hammer },
  { key: 'custom', label: 'Custom', icon: Settings },
] as const;

export const TEAM_SIZE_OPTIONS = [
  { key: 'solo', label: 'Solo', description: 'User/Client only', icon: User },
  { key: 'team', label: 'Team', description: 'Multiple workers', icon: Users },
] as const;

export const TEAM_ROLES = [
  { key: 'foreman', label: 'Foreman' },
  { key: 'instructor', label: 'Instructor' },
  { key: 'worker', label: 'Worker' },
  { key: 'apprentice', label: 'Apprentice' },
  { key: 'helper', label: 'Helper' },
] as const;

export function generateTemplateItems(trade: string, gfaSqft: number): TemplateItem[] {
  const templates: Record<string, TemplateItem[]> = {
    flooring: [
      { id: '1', name: 'Hardwood Flooring', category: 'material', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 8.50, totalPrice: gfaSqft * 8.50, applyWaste: true },
      { id: '2', name: 'Underlayment', category: 'material', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 0.75, totalPrice: gfaSqft * 0.75, applyWaste: true },
      { id: '3', name: 'Transition Strips', category: 'material', baseQuantity: Math.ceil(gfaSqft / 200), quantity: Math.ceil(gfaSqft / 200), unit: 'pcs', unitPrice: 25, totalPrice: Math.ceil(gfaSqft / 200) * 25, applyWaste: false },
      { id: '4', name: 'Installation Labor', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 4.50, totalPrice: gfaSqft * 4.50, applyWaste: false },
      { id: '5', name: 'Baseboards', category: 'material', baseQuantity: Math.round(4 * Math.sqrt(gfaSqft) * 0.85), quantity: Math.round(4 * Math.sqrt(gfaSqft) * 0.85), unit: 'ln ft', unitPrice: 3.25, totalPrice: Math.round(4 * Math.sqrt(gfaSqft) * 0.85) * 3.25, applyWaste: true },
    ],
    painting: [
      { id: '1', name: 'Interior Paint (Premium)', category: 'material', baseQuantity: Math.ceil(gfaSqft / 350), quantity: Math.ceil(gfaSqft / 350), unit: 'gal', unitPrice: 45, totalPrice: Math.ceil(gfaSqft / 350) * 45, applyWaste: true },
      { id: '2', name: 'Primer', category: 'material', baseQuantity: Math.ceil(gfaSqft / 400), quantity: Math.ceil(gfaSqft / 400), unit: 'gal', unitPrice: 35, totalPrice: Math.ceil(gfaSqft / 400) * 35, applyWaste: true },
      { id: '3', name: 'Supplies (Brushes, Rollers, Tape)', category: 'material', baseQuantity: 1, quantity: 1, unit: 'kit', unitPrice: 85, totalPrice: 85, applyWaste: false },
      { id: '4', name: 'Surface Prep Labor', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 0.75, totalPrice: gfaSqft * 0.75, applyWaste: false },
      { id: '5', name: 'Painting Labor', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 2.50, totalPrice: gfaSqft * 2.50, applyWaste: false },
    ],
    drywall: [
      { id: '1', name: 'Drywall Sheets (4x8)', category: 'material', baseQuantity: Math.ceil(gfaSqft / 32), quantity: Math.ceil(gfaSqft / 32), unit: 'sheets', unitPrice: 18, totalPrice: Math.ceil(gfaSqft / 32) * 18, applyWaste: true },
      { id: '2', name: 'Joint Compound', category: 'material', baseQuantity: Math.ceil(gfaSqft / 500), quantity: Math.ceil(gfaSqft / 500), unit: 'buckets', unitPrice: 22, totalPrice: Math.ceil(gfaSqft / 500) * 22, applyWaste: true },
      { id: '3', name: 'Drywall Tape', category: 'material', baseQuantity: Math.ceil(gfaSqft / 100), quantity: Math.ceil(gfaSqft / 100), unit: 'rolls', unitPrice: 8, totalPrice: Math.ceil(gfaSqft / 100) * 8, applyWaste: true },
      { id: '4', name: 'Installation Labor', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 2.25, totalPrice: gfaSqft * 2.25, applyWaste: false },
      { id: '5', name: 'Finishing Labor (Tape & Mud)', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 1.75, totalPrice: gfaSqft * 1.75, applyWaste: false },
    ],
    concrete: [
      { id: '1', name: 'Ready-Mix Concrete', category: 'material', baseQuantity: Math.ceil(gfaSqft / 27), quantity: Math.ceil(gfaSqft / 27), unit: 'cu yd', unitPrice: 165, totalPrice: Math.ceil(gfaSqft / 27) * 165, applyWaste: true },
      { id: '2', name: 'Rebar (Grade 60)', category: 'material', baseQuantity: Math.ceil(gfaSqft * 0.5), quantity: Math.ceil(gfaSqft * 0.5), unit: 'lbs', unitPrice: 0.85, totalPrice: Math.ceil(gfaSqft * 0.5) * 0.85, applyWaste: true },
      { id: '3', name: 'Wire Mesh', category: 'material', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 0.45, totalPrice: gfaSqft * 0.45, applyWaste: true },
      { id: '4', name: 'Forming & Pouring Labor', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 3.50, totalPrice: gfaSqft * 3.50, applyWaste: false },
      { id: '5', name: 'Finishing Labor', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 2.00, totalPrice: gfaSqft * 2.00, applyWaste: false },
    ],
    custom: [
      { id: '1', name: 'Custom Material', category: 'material', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 5, totalPrice: gfaSqft * 5, applyWaste: true },
      { id: '2', name: 'Custom Labor', category: 'labor', baseQuantity: gfaSqft, quantity: gfaSqft, unit: 'sq ft', unitPrice: 3, totalPrice: gfaSqft * 3, applyWaste: false },
    ],
  };
  return templates[trade] || templates.custom;
}

export function applyWasteToItems(items: TemplateItem[], wastePercent: number): TemplateItem[] {
  const wasteFactor = 1 + (wastePercent / 100);
  return items.map(item => {
    if (item.applyWaste && item.category === 'material') {
      const newQuantity = Math.ceil(item.baseQuantity * wasteFactor);
      return { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice };
    }
    return item;
  });
}
