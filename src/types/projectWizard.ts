// Project 3.0 Wizard Types - Citation System & Flow

export interface WizardCitation {
  id: string;
  questionKey: string;
  answer: string;
  timestamp: string;
  elementType: 'project_label' | 'map_location' | 'wireframe' | 'template' | 'custom';
  metadata?: Record<string, unknown>;
}

export interface WizardStep {
  key: string;
  question: string;
  type: 'text' | 'address' | 'select' | 'multiselect';
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export interface WizardState {
  currentStep: number;
  answers: Record<string, WizardCitation>;
  projectName: string;
  projectAddress: string;
  workType: string;
  coordinates: { lat: number; lng: number } | null;
}

export interface CanvasElement {
  id: string;
  type: 'project_label' | 'map' | 'wireframe';
  citationId: string;
  position: { x: number; y: number };
  visible: boolean;
}

export const WORK_TYPES = [
  'new_construction',
  'renovation',
  'addition',
  'repair',
  'demolition',
  'interior_finishing',
  'exterior_finishing',
  'landscaping',
  'electrical',
  'plumbing',
  'hvac',
  'roofing',
  'foundation',
  'other'
] as const;

export type WorkType = typeof WORK_TYPES[number];

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  new_construction: 'New Construction',
  renovation: 'Renovation',
  addition: 'Addition',
  repair: 'Repair',
  demolition: 'Demolition',
  interior_finishing: 'Interior Finishing',
  exterior_finishing: 'Exterior Finishing',
  landscaping: 'Landscaping',
  electrical: 'Electrical Work',
  plumbing: 'Plumbing',
  hvac: 'HVAC',
  roofing: 'Roofing',
  foundation: 'Foundation Work',
  other: 'Other'
};
