// ============================================
// PANEL HELP BUTTON - In-App Help Center
// ============================================
// '?' icon on each Stage 8 panel with role-specific
// contextual help via Popover
// ============================================

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type UserRole = 'owner' | 'foreman' | 'worker' | 'inspector' | 'subcontractor' | 'member';

interface PanelHelpContent {
  title: string;
  description: string;
  tips: string[];
}

type HelpData = Record<string, Record<string, PanelHelpContent>>;

// Role-specific help content for each panel
const HELP_DATA: HelpData = {
  'panel-1-basics': {
    owner: {
      title: 'Project Basics',
      description: 'Your project identity — name, address, and work type. These are locked once confirmed via chat.',
      tips: [
        'Edit mode must be enabled to modify values',
        'Changes here update the project DNA',
        'Address is verified via Google Maps',
      ],
    },
    foreman: {
      title: 'Project Basics',
      description: 'Overview of the project name, address, and work type set by the Owner.',
      tips: [
        'You can view but not modify these fields',
        'Contact the Owner if corrections are needed',
      ],
    },
    worker: {
      title: 'Project Basics',
      description: 'Key project details: name, location, and type of work.',
      tips: [
        'Use the address to navigate to the job site',
        'Check work type to understand scope',
      ],
    },
  },
  'panel-2-gfa': {
    owner: {
      title: 'Area & Dimensions',
      description: 'Gross Floor Area (GFA), blueprints, and site conditions. GFA drives all material calculations.',
      tips: [
        'GFA changes recalculate all material quantities',
        'Upload blueprints for AI-powered area analysis',
        'Site conditions affect scheduling recommendations',
      ],
    },
    foreman: {
      title: 'Area & Dimensions',
      description: 'Project area and site conditions. Material quantities are derived from these values.',
      tips: [
        'Review GFA to verify material orders',
        'Report site condition changes to Owner',
      ],
    },
    worker: {
      title: 'Area & Dimensions',
      description: 'The total project area and site conditions.',
      tips: [
        'Check site conditions before starting work',
      ],
    },
  },
  'panel-3-trade': {
    owner: {
      title: 'Trade & Materials',
      description: 'Selected trade, material template, and quantities. Material costs are calculated from GFA × waste factor × unit price.',
      tips: [
        'Owner Lock required to edit material quantities',
        'NET = base quantity, GROSS = with waste %',
        'Foreman can request modifications (you approve)',
      ],
    },
    foreman: {
      title: 'Trade & Materials',
      description: 'Material list with quantities. You can request modifications that go to the Owner for approval.',
      tips: [
        'Click "Request Modification" to propose changes',
        'You must provide a reason for each change',
        'Changes stay "Pending" until Owner approves',
        'Approved changes update quantities instantly',
      ],
    },
    worker: {
      title: 'Trade & Materials',
      description: 'Materials needed for the project. Check quantities before ordering.',
      tips: [
        'GROSS quantity includes waste — order this amount',
        'Report discrepancies to your Foreman',
      ],
    },
  },
  'panel-4-team': {
    owner: {
      title: 'Team Architecture',
      description: 'Manage team members, roles, and permissions. Invitations are sent via email.',
      tips: [
        'Foreman can manage tasks and request budget changes',
        'Workers see tasks but not financial data',
        'Subcontractors have limited access scope',
      ],
    },
    foreman: {
      title: 'Team Architecture',
      description: 'Your team members and their roles. You can assign and manage tasks.',
      tips: [
        'You can assign tasks to team members',
        'Workers report to you for daily operations',
      ],
    },
    worker: {
      title: 'Team Architecture',
      description: 'Your team and who to contact for different needs.',
      tips: [
        'Contact your Foreman for task questions',
        'Contact the Owner for project-level issues',
      ],
    },
  },
  'panel-5-timeline': {
    owner: {
      title: 'Execution Timeline',
      description: 'Tasks, phases, and deadlines. Task completion drives labor cost calculations.',
      tips: [
        'Toggle task status by clicking the checkbox',
        'Tasks are grouped by phase (Demolition → Finishing)',
        'Completed tasks auto-update the progress bar',
        'Labor costs recalculate when tasks change status',
      ],
    },
    foreman: {
      title: 'Execution Timeline',
      description: 'Manage daily tasks and track progress. You can create and assign tasks.',
      tips: [
        'Create tasks and assign to team members',
        'Track completion with checklist items',
        'Workers can upload verification photos',
      ],
    },
    worker: {
      title: 'Execution Timeline',
      description: 'Your assigned tasks and deadlines. Mark tasks complete when done.',
      tips: [
        'Check your assigned tasks daily',
        'Upload photos to verify completed work',
        'Mark checklist items as you go',
      ],
    },
  },
  'panel-6-documents': {
    owner: {
      title: 'Documents & Contracts',
      description: 'All project documents, blueprints, contracts, and verification photos in one place.',
      tips: [
        'Drag & drop files to upload',
        'Generate contracts with auto-filled project data',
        'Send contracts to clients for e-signature',
        'Team uploads appear as "Verification" documents',
      ],
    },
    foreman: {
      title: 'Documents & Contracts',
      description: 'Project documents and photos. You can upload site documentation.',
      tips: [
        'Upload site photos and progress reports',
        'View contracts (read-only)',
        'Your uploads are tagged as "Verification"',
      ],
    },
    worker: {
      title: 'Documents & Contracts',
      description: 'Project documents and work instructions.',
      tips: [
        'Upload task verification photos here',
        'View blueprints for work instructions',
      ],
    },
  },
  'panel-7-weather': {
    owner: {
      title: 'Site Log & Location',
      description: 'Weather forecasts, site check-ins, and delivery tracking for the project location.',
      tips: [
        'Weather alerts can affect scheduling',
        'Track team check-ins and hours',
        'Monitor material deliveries',
      ],
    },
    foreman: {
      title: 'Site Log & Location',
      description: 'Weather, check-ins, and deliveries. Log your site activities here.',
      tips: [
        'Check weather before scheduling outdoor work',
        'Log check-ins when arriving/leaving site',
        'Record material deliveries with photos',
      ],
    },
    worker: {
      title: 'Site Log & Location',
      description: 'Weather conditions and site information.',
      tips: [
        'Check weather alerts before heading to site',
        'Log your check-in when you arrive',
      ],
    },
  },
  'panel-8-financial': {
    owner: {
      title: 'Financial Summary',
      description: 'Complete financial overview — material costs, labor, profit margins. Owner-only access.',
      tips: [
        'Material costs = GROSS quantities × unit prices',
        'Labor costs auto-sync from active tasks',
        'Owner Lock protects financial data integrity',
        'Generate invoices and DNA reports from here',
        'Only you can see this panel — team cannot',
      ],
    },
    foreman: {
      title: 'Financial Summary',
      description: 'This panel is restricted to the Project Owner for financial security.',
      tips: [
        'Financial data is hidden from your view',
        'Request budget changes through the Trade panel',
      ],
    },
    worker: {
      title: 'Financial Summary',
      description: 'This panel contains sensitive financial data and is restricted to the Owner.',
      tips: [
        'Contact your Foreman for budget-related questions',
      ],
    },
  },
};

// Normalize role to help data key
function normalizeRole(role: UserRole): string {
  if (role === 'inspector' || role === 'subcontractor' || role === 'member') return 'worker';
  return role;
}

interface PanelHelpButtonProps {
  panelId: string;
  userRole: UserRole;
  className?: string;
}

export function PanelHelpButton({ panelId, userRole, className }: PanelHelpButtonProps) {
  const [open, setOpen] = useState(false);
  
  const normalizedRole = normalizeRole(userRole);
  const helpContent = HELP_DATA[panelId]?.[normalizedRole];
  
  if (!helpContent) return null;
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 w-6 p-0 rounded-full opacity-50 hover:opacity-100 transition-opacity",
            "hover:bg-accent",
            className
          )}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-72 p-0 z-[60]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b bg-accent/30">
          <h4 className="text-sm font-semibold">{helpContent.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{helpContent.description}</p>
        </div>
        <div className="p-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tips</p>
          <ul className="space-y-1">
            {helpContent.tips.map((tip, i) => (
              <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
