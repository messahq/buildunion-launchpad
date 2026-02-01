// ============================================
// TORONTO WORK TYPE TEMPLATES
// Smart mapping from Page 1 selection to Page 2 materials
// All materials tagged with template_preset citation
// ============================================

import { MaterialItem, CitationSource } from "@/contexts/ProjectContext.types";

// ============================================
// WORK TYPE DEFINITIONS
// ============================================

export type WorkTypeId = 
  | "framing"
  | "insulation" 
  | "taping"
  | "painting"
  | "flooring"
  | "plumbing"
  | "electrical"
  | "hvac"
  | "demolition"
  | "other";

export interface WorkTypeDefinition {
  id: WorkTypeId;
  name: string;
  nameHu: string;
  description: string;
  icon: string;
  color: string;
  avgDuration: string;
  keywords: string[];
}

export interface TemplateMaterial {
  item: string;
  itemHu: string;
  defaultQuantity: number;
  unit: string;
  unitPrice: number; // CAD
  isEssential: boolean;
  wastePercentage: number;
}

export interface WorkTypeTemplate {
  workType: WorkTypeId;
  materials: TemplateMaterial[];
  laborRate: number; // per hour CAD
  estimatedHours: number;
}

// ============================================
// ALL TORONTO WORK TYPES
// ============================================

export const TORONTO_WORK_TYPES: WorkTypeDefinition[] = [
  {
    id: "framing",
    name: "Framing",
    nameHu: "Vázkészítés",
    description: "Wood or metal stud framing for walls, ceilings, and structures",
    icon: "Construction",
    color: "bg-amber-600",
    avgDuration: "3-7 days",
    keywords: ["frame", "stud", "váz", "lumber", "wall structure", "header"],
  },
  {
    id: "insulation",
    name: "Insulation",
    nameHu: "Szigetelés",
    description: "Thermal and sound insulation installation",
    icon: "Thermometer",
    color: "bg-blue-500",
    avgDuration: "1-3 days",
    keywords: ["insulation", "szigetelés", "batt", "spray foam", "thermal", "r-value"],
  },
  {
    id: "taping",
    name: "Taping & Mudding",
    nameHu: "Glettelés és Ragasztás",
    description: "Drywall taping, mudding, and finishing",
    icon: "Layers",
    color: "bg-gray-500",
    avgDuration: "2-5 days",
    keywords: ["tape", "mud", "glett", "drywall finish", "joint compound", "sanding"],
  },
  {
    id: "painting",
    name: "Painting",
    nameHu: "Festés",
    description: "Interior and exterior painting services",
    icon: "Paintbrush",
    color: "bg-cyan-500",
    avgDuration: "2-5 days",
    keywords: ["paint", "festés", "primer", "wall color", "trim paint", "ceiling"],
  },
  {
    id: "flooring",
    name: "Flooring",
    nameHu: "Padlóburkolás",
    description: "Hardwood, laminate, tile, or vinyl flooring installation",
    icon: "LayoutGrid",
    color: "bg-amber-700",
    avgDuration: "2-5 days",
    keywords: ["floor", "padló", "laminate", "hardwood", "tile", "vinyl", "carpet"],
  },
  {
    id: "plumbing",
    name: "Plumbing",
    nameHu: "Vízvezeték-szerelés",
    description: "Pipe installation, fixture hookups, and drain work",
    icon: "Droplets",
    color: "bg-blue-600",
    avgDuration: "1-4 days",
    keywords: ["plumb", "vízvezeték", "pipe", "drain", "faucet", "toilet", "sink"],
  },
  {
    id: "electrical",
    name: "Electrical",
    nameHu: "Villanyszerelés",
    description: "Wiring, outlets, panels, and lighting installation",
    icon: "Zap",
    color: "bg-yellow-500",
    avgDuration: "1-3 days",
    keywords: ["electric", "villany", "wire", "outlet", "panel", "lighting", "breaker"],
  },
  {
    id: "hvac",
    name: "HVAC",
    nameHu: "Fűtés-Hűtés",
    description: "Heating, ventilation, and air conditioning",
    icon: "Wind",
    color: "bg-emerald-500",
    avgDuration: "2-5 days",
    keywords: ["hvac", "fűtés", "hűtés", "furnace", "ac", "duct", "ventilation"],
  },
  {
    id: "demolition",
    name: "Demolition",
    nameHu: "Bontás",
    description: "Tear-down, removal, and disposal of existing materials",
    icon: "Hammer",
    color: "bg-red-600",
    avgDuration: "1-3 days",
    keywords: ["demo", "bontás", "tear down", "removal", "dispose", "gut"],
  },
  {
    id: "other",
    name: "Other / Custom",
    nameHu: "Egyéb / Egyedi",
    description: "Custom project type with manual material entry",
    icon: "Plus",
    color: "bg-violet-500",
    avgDuration: "Varies",
    keywords: [],
  },
];

// ============================================
// TEMPLATE MATERIALS BY WORK TYPE
// Toronto pricing (CAD) as of 2024
// ============================================

export const WORK_TYPE_TEMPLATES: Record<WorkTypeId, WorkTypeTemplate> = {
  framing: {
    workType: "framing",
    laborRate: 45,
    estimatedHours: 40,
    materials: [
      { item: "2x4 Studs (8ft)", itemHu: "2x4 Gerendák (8ft)", defaultQuantity: 100, unit: "pcs", unitPrice: 4.50, isEssential: true, wastePercentage: 10 },
      { item: "2x6 Studs (8ft)", itemHu: "2x6 Gerendák (8ft)", defaultQuantity: 40, unit: "pcs", unitPrice: 6.75, isEssential: true, wastePercentage: 10 },
      { item: "Plywood Sheathing (4x8)", itemHu: "Rétegelt Lemez (4x8)", defaultQuantity: 20, unit: "sheets", unitPrice: 45.00, isEssential: true, wastePercentage: 10 },
      { item: "Framing Nails (3.5\")", itemHu: "Keretszegecsek (3.5\")", defaultQuantity: 10, unit: "lbs", unitPrice: 8.50, isEssential: true, wastePercentage: 15 },
      { item: "Construction Adhesive", itemHu: "Építési Ragasztó", defaultQuantity: 12, unit: "tubes", unitPrice: 6.00, isEssential: false, wastePercentage: 5 },
      { item: "Joist Hangers", itemHu: "Gerenda Tartók", defaultQuantity: 24, unit: "pcs", unitPrice: 3.50, isEssential: true, wastePercentage: 5 },
      { item: "Metal Strapping", itemHu: "Fém Szalag", defaultQuantity: 100, unit: "ft", unitPrice: 0.45, isEssential: false, wastePercentage: 10 },
    ],
  },
  
  insulation: {
    workType: "insulation",
    laborRate: 40,
    estimatedHours: 16,
    materials: [
      { item: "R-20 Batt Insulation", itemHu: "R-20 Paplan Szigetelés", defaultQuantity: 10, unit: "bags", unitPrice: 65.00, isEssential: true, wastePercentage: 10 },
      { item: "R-12 Batt Insulation", itemHu: "R-12 Paplan Szigetelés", defaultQuantity: 8, unit: "bags", unitPrice: 48.00, isEssential: true, wastePercentage: 10 },
      { item: "Vapor Barrier (6mil)", itemHu: "Párazáró Fólia (6mil)", defaultQuantity: 500, unit: "sq ft", unitPrice: 0.15, isEssential: true, wastePercentage: 15 },
      { item: "Acoustic Sealant", itemHu: "Akusztikus Tömítő", defaultQuantity: 6, unit: "tubes", unitPrice: 12.00, isEssential: true, wastePercentage: 5 },
      { item: "Insulation Supports", itemHu: "Szigetelés Tartók", defaultQuantity: 50, unit: "pcs", unitPrice: 1.25, isEssential: false, wastePercentage: 5 },
      { item: "Spray Foam Can", itemHu: "Hab Spray", defaultQuantity: 8, unit: "cans", unitPrice: 9.50, isEssential: true, wastePercentage: 10 },
    ],
  },
  
  taping: {
    workType: "taping",
    laborRate: 42,
    estimatedHours: 24,
    materials: [
      { item: "Joint Compound (Box)", itemHu: "Glettanyag (Doboz)", defaultQuantity: 4, unit: "boxes", unitPrice: 22.00, isEssential: true, wastePercentage: 15 },
      { item: "Paper Drywall Tape", itemHu: "Papír Gipszkarton Szalag", defaultQuantity: 10, unit: "rolls", unitPrice: 5.50, isEssential: true, wastePercentage: 10 },
      { item: "Mesh Drywall Tape", itemHu: "Háló Gipszkarton Szalag", defaultQuantity: 4, unit: "rolls", unitPrice: 8.00, isEssential: true, wastePercentage: 10 },
      { item: "Corner Bead (Metal)", itemHu: "Sarokvédő (Fém)", defaultQuantity: 20, unit: "pcs", unitPrice: 3.75, isEssential: true, wastePercentage: 5 },
      { item: "Sandpaper (150 grit)", itemHu: "Csiszolópapír (150-as)", defaultQuantity: 20, unit: "sheets", unitPrice: 1.50, isEssential: true, wastePercentage: 20 },
      { item: "Drywall Primer", itemHu: "Gipszkarton Alapozó", defaultQuantity: 2, unit: "gal", unitPrice: 35.00, isEssential: true, wastePercentage: 10 },
    ],
  },
  
  painting: {
    workType: "painting",
    laborRate: 38,
    estimatedHours: 20,
    materials: [
      { item: "Primer (Interior)", itemHu: "Alapozó (Beltéri)", defaultQuantity: 4, unit: "gal", unitPrice: 38.00, isEssential: true, wastePercentage: 10 },
      { item: "Finish Paint (Interior)", itemHu: "Fedőfesték (Beltéri)", defaultQuantity: 6, unit: "gal", unitPrice: 55.00, isEssential: true, wastePercentage: 10 },
      { item: "Paint Rollers (9\")", itemHu: "Festőhengerek (9\")", defaultQuantity: 12, unit: "pcs", unitPrice: 4.50, isEssential: true, wastePercentage: 0 },
      { item: "Painter's Tape (Blue)", itemHu: "Festőszalag (Kék)", defaultQuantity: 10, unit: "rolls", unitPrice: 7.50, isEssential: true, wastePercentage: 5 },
      { item: "Drop Cloths", itemHu: "Takaró Ponyvák", defaultQuantity: 6, unit: "pcs", unitPrice: 12.00, isEssential: true, wastePercentage: 0 },
      { item: "Paint Brushes (Assorted)", itemHu: "Ecsetek (Vegyes)", defaultQuantity: 8, unit: "pcs", unitPrice: 8.00, isEssential: true, wastePercentage: 0 },
      { item: "Caulking (Paintable)", itemHu: "Akril Tömítő", defaultQuantity: 6, unit: "tubes", unitPrice: 5.50, isEssential: false, wastePercentage: 10 },
    ],
  },
  
  flooring: {
    workType: "flooring",
    laborRate: 45,
    estimatedHours: 24,
    materials: [
      { item: "Laminate Flooring", itemHu: "Laminált Padló", defaultQuantity: 500, unit: "sq ft", unitPrice: 2.85, isEssential: true, wastePercentage: 10 },
      { item: "Underlayment (Foam)", itemHu: "Alátétlemez (Hab)", defaultQuantity: 500, unit: "sq ft", unitPrice: 0.35, isEssential: true, wastePercentage: 10 },
      { item: "Baseboard Trim", itemHu: "Szegőléc", defaultQuantity: 200, unit: "ft", unitPrice: 1.25, isEssential: true, wastePercentage: 10 },
      { item: "Transition Strips", itemHu: "Átvezető Profilok", defaultQuantity: 10, unit: "pcs", unitPrice: 12.00, isEssential: true, wastePercentage: 5 },
      { item: "Flooring Adhesive", itemHu: "Padló Ragasztó", defaultQuantity: 4, unit: "gal", unitPrice: 28.00, isEssential: false, wastePercentage: 10 },
      { item: "Finishing Nails", itemHu: "Díszszegecsek", defaultQuantity: 2, unit: "lbs", unitPrice: 12.00, isEssential: true, wastePercentage: 15 },
    ],
  },
  
  plumbing: {
    workType: "plumbing",
    laborRate: 85,
    estimatedHours: 12,
    materials: [
      { item: "PEX Pipe (1/2\")", itemHu: "PEX Cső (1/2\")", defaultQuantity: 100, unit: "ft", unitPrice: 0.85, isEssential: true, wastePercentage: 10 },
      { item: "PEX Fittings (Assorted)", itemHu: "PEX Idomok (Vegyes)", defaultQuantity: 30, unit: "pcs", unitPrice: 3.50, isEssential: true, wastePercentage: 10 },
      { item: "Copper Pipe (3/4\")", itemHu: "Rézcső (3/4\")", defaultQuantity: 40, unit: "ft", unitPrice: 4.25, isEssential: true, wastePercentage: 10 },
      { item: "Pipe Hangers", itemHu: "Csőbilincsek", defaultQuantity: 25, unit: "pcs", unitPrice: 2.00, isEssential: true, wastePercentage: 5 },
      { item: "Teflon Tape", itemHu: "Teflon Szalag", defaultQuantity: 10, unit: "rolls", unitPrice: 2.50, isEssential: true, wastePercentage: 5 },
      { item: "PVC Cement & Primer", itemHu: "PVC Ragasztó és Tisztító", defaultQuantity: 2, unit: "sets", unitPrice: 18.00, isEssential: true, wastePercentage: 10 },
      { item: "Shut-off Valves", itemHu: "Elzáró Szelepek", defaultQuantity: 6, unit: "pcs", unitPrice: 15.00, isEssential: true, wastePercentage: 0 },
    ],
  },
  
  electrical: {
    workType: "electrical",
    laborRate: 90,
    estimatedHours: 16,
    materials: [
      { item: "Romex Wire 14/2", itemHu: "Romex Kábel 14/2", defaultQuantity: 250, unit: "ft", unitPrice: 0.65, isEssential: true, wastePercentage: 10 },
      { item: "Romex Wire 12/2", itemHu: "Romex Kábel 12/2", defaultQuantity: 150, unit: "ft", unitPrice: 0.85, isEssential: true, wastePercentage: 10 },
      { item: "Electrical Boxes", itemHu: "Villanydobozok", defaultQuantity: 20, unit: "pcs", unitPrice: 2.50, isEssential: true, wastePercentage: 5 },
      { item: "Outlets (15A)", itemHu: "Konnektorok (15A)", defaultQuantity: 15, unit: "pcs", unitPrice: 3.00, isEssential: true, wastePercentage: 5 },
      { item: "Light Switches", itemHu: "Villanykapcsolók", defaultQuantity: 8, unit: "pcs", unitPrice: 4.00, isEssential: true, wastePercentage: 5 },
      { item: "Wire Nuts (Assorted)", itemHu: "Csatlakozók (Vegyes)", defaultQuantity: 100, unit: "pcs", unitPrice: 0.15, isEssential: true, wastePercentage: 10 },
      { item: "Cover Plates", itemHu: "Fedőlapok", defaultQuantity: 25, unit: "pcs", unitPrice: 1.50, isEssential: true, wastePercentage: 5 },
    ],
  },
  
  hvac: {
    workType: "hvac",
    laborRate: 95,
    estimatedHours: 20,
    materials: [
      { item: "Flex Duct (6\")", itemHu: "Flexibilis Cső (6\")", defaultQuantity: 50, unit: "ft", unitPrice: 3.50, isEssential: true, wastePercentage: 10 },
      { item: "Sheet Metal Duct", itemHu: "Fémlemez Csatorna", defaultQuantity: 30, unit: "ft", unitPrice: 8.00, isEssential: true, wastePercentage: 10 },
      { item: "Duct Tape (HVAC)", itemHu: "Csatorna Szalag (HVAC)", defaultQuantity: 6, unit: "rolls", unitPrice: 12.00, isEssential: true, wastePercentage: 10 },
      { item: "Register Vents", itemHu: "Szellőző Rácsok", defaultQuantity: 10, unit: "pcs", unitPrice: 15.00, isEssential: true, wastePercentage: 0 },
      { item: "Duct Insulation Wrap", itemHu: "Csatorna Szigetelés", defaultQuantity: 100, unit: "sq ft", unitPrice: 0.85, isEssential: true, wastePercentage: 10 },
      { item: "HVAC Screws", itemHu: "HVAC Csavarok", defaultQuantity: 200, unit: "pcs", unitPrice: 0.08, isEssential: true, wastePercentage: 15 },
      { item: "Furnace Filters", itemHu: "Kazán Szűrők", defaultQuantity: 4, unit: "pcs", unitPrice: 18.00, isEssential: false, wastePercentage: 0 },
    ],
  },
  
  demolition: {
    workType: "demolition",
    laborRate: 35,
    estimatedHours: 16,
    materials: [
      { item: "Dumpster Rental (10yd)", itemHu: "Konténer Bérlés (10yd)", defaultQuantity: 1, unit: "days", unitPrice: 450.00, isEssential: true, wastePercentage: 0 },
      { item: "Heavy Duty Bags", itemHu: "Nagy Teherbírású Zsákok", defaultQuantity: 50, unit: "pcs", unitPrice: 1.50, isEssential: true, wastePercentage: 10 },
      { item: "Plastic Sheeting", itemHu: "Műanyag Fólia", defaultQuantity: 500, unit: "sq ft", unitPrice: 0.12, isEssential: true, wastePercentage: 15 },
      { item: "Dust Masks (N95)", itemHu: "Porvédő Maszk (N95)", defaultQuantity: 20, unit: "pcs", unitPrice: 2.50, isEssential: true, wastePercentage: 0 },
      { item: "Safety Glasses", itemHu: "Védőszemüveg", defaultQuantity: 4, unit: "pcs", unitPrice: 8.00, isEssential: true, wastePercentage: 0 },
      { item: "Work Gloves", itemHu: "Munkakesztyű", defaultQuantity: 6, unit: "pairs", unitPrice: 12.00, isEssential: true, wastePercentage: 0 },
    ],
  },
  
  other: {
    workType: "other",
    laborRate: 45,
    estimatedHours: 8,
    materials: [], // Empty - user adds manually
  },
};

// ============================================
// SMART MAPPING FUNCTIONS
// ============================================

/**
 * Get recommended work type based on keywords in project name/description
 */
export function detectWorkType(input: string): WorkTypeId | null {
  const lowerInput = input.toLowerCase();
  
  for (const workType of TORONTO_WORK_TYPES) {
    for (const keyword of workType.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        return workType.id;
      }
    }
  }
  
  return null;
}

/**
 * Convert template materials to MaterialItem format with citations
 */
export function templateToMaterialItems(
  template: WorkTypeTemplate,
  confirmedArea?: number,
  locale: "en" | "hu" = "en"
): MaterialItem[] {
  if (!template.materials.length) {
    // Return empty array for "other" type with manual citation
    return [];
  }
  
  const citationPrefix = `TMPL-${template.workType.toUpperCase().slice(0, 3)}`;
  
  return template.materials.map((mat, index) => {
    // Scale quantity based on confirmed area if applicable
    let quantity = mat.defaultQuantity;
    if (confirmedArea && mat.unit === "sq ft") {
      quantity = Math.ceil(confirmedArea);
    }
    
    // Apply waste percentage for essential items
    const baseQuantity = quantity;
    if (mat.isEssential && mat.wastePercentage > 0) {
      quantity = Math.ceil(quantity * (1 + mat.wastePercentage / 100));
    }
    
    const totalPrice = quantity * mat.unitPrice;
    const citationId = `[${citationPrefix}-${String(index + 1).padStart(3, '0')}]`;
    
    return {
      id: `${template.workType}-${index}-${Date.now()}`,
      item: locale === "hu" ? mat.itemHu : mat.item,
      quantity,
      unit: mat.unit,
      unitPrice: mat.unitPrice,
      totalPrice,
      source: "template" as const,
      citationSource: "template_preset" as CitationSource,
      citationId,
      isEssential: mat.isEssential,
      wastePercentage: mat.isEssential ? mat.wastePercentage : 0,
      originalValue: baseQuantity,
    };
  });
}

/**
 * Get empty materials list for "Other" work type
 */
export function getEmptyMaterialsForOther(): MaterialItem[] {
  return [{
    id: `manual-placeholder-${Date.now()}`,
    item: "Add your first material...",
    quantity: 0,
    unit: "units",
    unitPrice: 0,
    totalPrice: 0,
    source: "manual" as const,
    citationSource: "manual_override" as CitationSource,
    citationId: "[MANUAL-001]",
    isEssential: false,
    wastePercentage: 0,
  }];
}

/**
 * Get work type definition by ID
 */
export function getWorkTypeById(id: WorkTypeId): WorkTypeDefinition | undefined {
  return TORONTO_WORK_TYPES.find(wt => wt.id === id);
}

/**
 * Get template by work type ID
 */
export function getTemplateByWorkType(workTypeId: WorkTypeId): WorkTypeTemplate | undefined {
  return WORK_TYPE_TEMPLATES[workTypeId];
}

/**
 * Calculate estimated total from template
 */
export function calculateTemplateEstimate(template: WorkTypeTemplate): {
  materialCost: number;
  laborCost: number;
  totalCost: number;
} {
  const materialCost = template.materials.reduce((sum, mat) => {
    const qty = mat.isEssential 
      ? Math.ceil(mat.defaultQuantity * (1 + mat.wastePercentage / 100))
      : mat.defaultQuantity;
    return sum + (qty * mat.unitPrice);
  }, 0);
  
  const laborCost = template.laborRate * template.estimatedHours;
  
  return {
    materialCost,
    laborCost,
    totalCost: materialCost + laborCost,
  };
}

/**
 * Smart mapping: Get materials for Page 2 based on Page 1 selection
 */
export function mapWorkTypeToMaterials(
  workTypeId: WorkTypeId | string | null,
  confirmedArea?: number,
  locale: "en" | "hu" = "en"
): MaterialItem[] {
  if (!workTypeId) {
    return [];
  }
  
  // Handle as WorkTypeId
  const normalizedId = workTypeId.toLowerCase() as WorkTypeId;
  
  // Check if it's "other" or unknown
  if (normalizedId === "other" || !WORK_TYPE_TEMPLATES[normalizedId]) {
    return getEmptyMaterialsForOther();
  }
  
  const template = WORK_TYPE_TEMPLATES[normalizedId];
  return templateToMaterialItems(template, confirmedArea, locale);
}
