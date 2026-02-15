// ============================================
// PANEL HELP SECTION - In-App Help Center
// ============================================
// Collapsible help section inside each panel
// with role-specific contextual tips
// ============================================

import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type UserRole = 'owner' | 'foreman' | 'worker' | 'inspector' | 'subcontractor' | 'member';

interface PanelHelpContent {
  title: string;
  description: string;
  tips: string[];
}

type HelpData = Record<string, Record<string, PanelHelpContent>>;

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
      tips: ['Check site conditions before starting work'],
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
      ],
    },
  },
  'panel-6-documents': {
    owner: {
      title: 'Documents & Contracts',
      description: 'All project documents, blueprints, contracts, and verification photos.',
      tips: [
        'Drag & drop files to upload',
        'Generate contracts with auto-filled data',
        'Send contracts to clients for e-signature',
      ],
    },
    foreman: {
      title: 'Documents & Contracts',
      description: 'Project documents and photos. You can upload site documentation.',
      tips: [
        'Upload site photos and progress reports',
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
      description: 'Weather forecasts, site check-ins, and delivery tracking.',
      tips: [
        'Weather alerts can affect scheduling',
        'Track team check-ins and hours',
        'Monitor material deliveries',
      ],
    },
    foreman: {
      title: 'Site Log & Location',
      description: 'Weather, check-ins, and deliveries.',
      tips: [
        'Check weather before scheduling outdoor work',
        'Log check-ins when arriving/leaving site',
        'Record material deliveries with photos',
      ],
    },
    worker: {
      title: 'Site Log & Location',
      description: 'Weather conditions and site info.',
      tips: [
        'Check weather alerts before heading to site',
        'Log your check-in when you arrive',
      ],
    },
  },
  'panel-8-financial': {
    owner: {
      title: 'Financial Summary',
      description: 'Complete financial overview — material costs, labor, profit margins. Owner-only.',
      tips: [
        'Material costs = GROSS quantities × unit prices',
        'Labor costs auto-sync from active tasks',
        'Owner Lock protects financial data integrity',
        'Only you can see this panel — team cannot',
      ],
    },
    foreman: {
      title: 'Financial Summary',
      description: 'This panel is restricted to the Project Owner.',
      tips: ['Request budget changes through the Trade panel'],
    },
    worker: {
      title: 'Financial Summary',
      description: 'Restricted to the Owner.',
      tips: ['Contact your Foreman for budget questions'],
    },
  },
};

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
  const [expanded, setExpanded] = useState(false);

  const normalizedRole = normalizeRole(userRole);
  const helpContent = HELP_DATA[panelId]?.[normalizedRole];

  if (!helpContent) return null;

  return (
    <div className={cn("w-full", className)}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-left transition-all shadow-sm",
          "bg-gradient-to-r from-sky-400/30 via-cyan-300/25 to-yellow-300/35",
          "hover:from-sky-400/40 hover:via-cyan-300/35 hover:to-yellow-300/45",
          "border border-sky-400/50 hover:border-sky-300/70",
          "hover:shadow-[0_0_14px_rgba(56,189,248,0.2)]",
          expanded && "from-sky-400/40 via-cyan-300/35 to-yellow-300/45 border-sky-300/70 shadow-[0_0_14px_rgba(56,189,248,0.2)]"
        )}
      >
        <div className="h-5 w-5 rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(253,224,71,0.5)]">
          <HelpCircle className="h-3 w-3 text-amber-900" />
        </div>
        <span className="text-xs font-semibold flex-1" style={{ color: '#fbbf24' }}>
          How does this panel work?
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-yellow-300" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-yellow-300/70" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 mt-1.5 rounded-xl bg-gradient-to-br from-sky-400/15 via-cyan-400/10 to-yellow-300/10 border border-sky-400/25 space-y-2.5">
              <p className="text-xs font-medium leading-relaxed !text-white" style={{ color: 'white' }}>{helpContent.description}</p>
              <div className="space-y-1.5">
                {helpContent.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-yellow-300 text-xs mt-0.5 shrink-0">✦</span>
                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.9)' }}>{tip}</span>
                  </div>
                ))}
              </div>
              <div className="pt-1 mt-0.5 border-t border-sky-400/15 flex flex-col gap-0.5">
                {normalizedRole === 'owner' && (
                  <p className="text-[10px] leading-tight" style={{ color: '#fbbf24' }}>
                    🔓 Switch <strong>👁 View → ✏️ Editing</strong> in the header to unlock editable fields. Protected fields (materials, finances) require your Owner Lock password.
                  </p>
                )}
                <p className="text-[10px] italic leading-tight" style={{ color: 'rgba(253,224,71,0.6)' }}>
                  💡 Click the panel card on the left to explore all features in full view.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
