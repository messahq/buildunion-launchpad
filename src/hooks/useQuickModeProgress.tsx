import { useMemo } from "react";

// Progress step definitions
export interface ProgressStep {
  id: string;
  name: string;
  weight: number; // Percentage weight
  subSteps?: ProgressSubStep[];
  isComplete: boolean;
  isSkipped: boolean;
  tier?: "FREE" | "PRO" | "PREMIUM"; // Required tier for this step
  isLocked?: boolean; // Whether the step is locked due to tier
}

export interface ProgressSubStep {
  id: string;
  name: string;
  weight: number; // Percentage of parent step
  isComplete: boolean;
  dueDate?: string; // Optional due date for time-based tracking
  isEditable?: boolean; // Whether this substep can be edited
}

export interface QuickModeProgressData {
  // Main steps completion status
  photo: {
    hasData: boolean;
    area?: number;
    areaUnit?: string;
  };
  templates: {
    hasData: boolean;
    count: number;
  };
  calculator: {
    hasData: boolean;
    count: number;
  };
  quote: {
    yourInfo: {
      companyName: boolean;
      phone: boolean;
      address: boolean;
      email: boolean;
    };
    client: {
      name: boolean;
      email: boolean;
      address: boolean;
      phone: boolean;
    };
    lineItems: {
      hasItems: boolean;
      count: number;
    };
  };
  contract: {
    contractor: {
      name: boolean;
      address: boolean;
      license: boolean;
    };
    client: {
      name: boolean;
      address: boolean;
    };
    terms: {
      scopeOfWork: boolean;
      totalAmount: boolean;
    };
    timeline: {
      startDate: boolean;
      estimatedEndDate: boolean;
    };
    signatures: {
      contractor: boolean;
      client: boolean;
    };
  };
  // Team features (PRO tier)
  documents?: {
    hasDocuments: boolean;
    count: number;
    blueprintsUploaded?: boolean;
    photosUploaded?: boolean;
  };
  team?: {
    hasMembers: boolean;
    count: number;
    rolesAssigned?: boolean;
    invitesSent?: boolean;
  };
  tasks?: {
    hasTasks: boolean;
    count: number;
    completedCount: number;
    overdueCount: number;
  };
  // Premium features
  messaging?: {
    hasConversations: boolean;
    count: number;
  };
  // Subscription tier
  tier?: "free" | "pro" | "premium" | "enterprise";
}

// Weight distribution: 8 main steps
// Solo Mode (FREE): Photo, Templates, Calculator, Quote, Contract = 80%
// Team Mode (PRO): Documents, Team, Tasks = 20% additional
// Total can reach 100% with all features unlocked
const STEP_WEIGHTS = {
  photo: 12.5,
  templates: 12.5,
  calculator: 12.5,
  quote: 12.5,
  contract: 12.5,
  documents: 12.5,
  team: 12.5,
  tasks: 12.5,
};

// Sub-step weights within Quote (totaling 100% of parent)
const QUOTE_SUBSTEP_WEIGHTS = {
  yourInfo: 33.33,
  client: 33.33,
  lineItems: 33.34,
};

// Sub-step weights within Contract (totaling 100% of parent)
const CONTRACT_SUBSTEP_WEIGHTS = {
  contractor: 20,
  client: 20,
  terms: 20,
  timeline: 20,
  signatures: 20,
};

// Sub-step weights within Documents
const DOCUMENTS_SUBSTEP_WEIGHTS = {
  blueprints: 50,
  sitePhotos: 50,
};

// Sub-step weights within Team
const TEAM_SUBSTEP_WEIGHTS = {
  inviteMembers: 50,
  assignRoles: 50,
};

// Sub-step weights within Tasks
const TASKS_SUBSTEP_WEIGHTS = {
  createTasks: 33.33,
  assignTasks: 33.33,
  trackProgress: 33.34,
};

export const useQuickModeProgress = (data: QuickModeProgressData) => {
  const progress = useMemo(() => {
    let totalPercentage = 0;
    const steps: ProgressStep[] = [];
    const warnings: string[] = [];
    
    const isPro = data.tier === "pro" || data.tier === "premium" || data.tier === "enterprise";
    const isPremium = data.tier === "premium" || data.tier === "enterprise";

    // 1. Photo Step (12.5%)
    const photoComplete = data.photo.hasData;
    if (photoComplete) {
      totalPercentage += STEP_WEIGHTS.photo;
    }
    steps.push({
      id: "photo",
      name: "Photo Estimate",
      weight: STEP_WEIGHTS.photo,
      isComplete: photoComplete,
      isSkipped: false,
      tier: "FREE",
    });

    // 2. Templates Step (12.5%)
    const templatesComplete = data.templates.hasData;
    if (templatesComplete) {
      totalPercentage += STEP_WEIGHTS.templates;
    }
    steps.push({
      id: "templates",
      name: "Templates",
      weight: STEP_WEIGHTS.templates,
      isComplete: templatesComplete,
      isSkipped: false,
      tier: "FREE",
    });

    // 3. Calculator Step (12.5%)
    const calculatorComplete = data.calculator.hasData;
    if (calculatorComplete) {
      totalPercentage += STEP_WEIGHTS.calculator;
    }
    steps.push({
      id: "calculator",
      name: "Calculator",
      weight: STEP_WEIGHTS.calculator,
      isComplete: calculatorComplete,
      isSkipped: false,
      tier: "FREE",
    });

    // 4. Quote Step (12.5%) - with sub-steps
    const quoteSubSteps: ProgressSubStep[] = [];
    let quoteSubTotal = 0;

    // Your Info sub-step
    const yourInfoFields = [
      data.quote.yourInfo.companyName,
      data.quote.yourInfo.phone,
      data.quote.yourInfo.email,
    ];
    const yourInfoComplete = yourInfoFields.filter(Boolean).length >= 2;
    if (yourInfoComplete) {
      quoteSubTotal += QUOTE_SUBSTEP_WEIGHTS.yourInfo;
    }
    quoteSubSteps.push({
      id: "yourInfo",
      name: "Your Info",
      weight: QUOTE_SUBSTEP_WEIGHTS.yourInfo,
      isComplete: yourInfoComplete,
      isEditable: true,
    });

    // Client sub-step
    const clientComplete = data.quote.client.name && data.quote.client.email;
    if (clientComplete) {
      quoteSubTotal += QUOTE_SUBSTEP_WEIGHTS.client;
    }
    quoteSubSteps.push({
      id: "client",
      name: "Client Info",
      weight: QUOTE_SUBSTEP_WEIGHTS.client,
      isComplete: clientComplete,
      isEditable: true,
    });

    // Line Items sub-step
    const lineItemsComplete = data.quote.lineItems.hasItems && data.quote.lineItems.count > 0;
    if (lineItemsComplete) {
      quoteSubTotal += QUOTE_SUBSTEP_WEIGHTS.lineItems;
    }
    quoteSubSteps.push({
      id: "lineItems",
      name: "Line Items",
      weight: QUOTE_SUBSTEP_WEIGHTS.lineItems,
      isComplete: lineItemsComplete,
      isEditable: true,
    });

    const quotePercentage = (quoteSubTotal / 100) * STEP_WEIGHTS.quote;
    totalPercentage += quotePercentage;

    const quoteComplete = quoteSubSteps.every(s => s.isComplete);
    steps.push({
      id: "quote",
      name: "Quote",
      weight: STEP_WEIGHTS.quote,
      subSteps: quoteSubSteps,
      isComplete: quoteComplete,
      isSkipped: false,
      tier: "FREE",
    });

    // 5. Contract Step (12.5%) - with sub-steps
    const contractSubSteps: ProgressSubStep[] = [];
    let contractSubTotal = 0;

    const contractorComplete = data.contract.contractor.name;
    if (contractorComplete) {
      contractSubTotal += CONTRACT_SUBSTEP_WEIGHTS.contractor;
    }
    contractSubSteps.push({
      id: "contractor",
      name: "Contractor Info",
      weight: CONTRACT_SUBSTEP_WEIGHTS.contractor,
      isComplete: contractorComplete,
      isEditable: true,
    });

    const contractClientComplete = data.contract.client.name;
    if (contractClientComplete) {
      contractSubTotal += CONTRACT_SUBSTEP_WEIGHTS.client;
    }
    contractSubSteps.push({
      id: "contractClient",
      name: "Client Info",
      weight: CONTRACT_SUBSTEP_WEIGHTS.client,
      isComplete: contractClientComplete,
      isEditable: true,
    });

    const termsComplete = data.contract.terms.scopeOfWork && data.contract.terms.totalAmount;
    if (termsComplete) {
      contractSubTotal += CONTRACT_SUBSTEP_WEIGHTS.terms;
    }
    contractSubSteps.push({
      id: "terms",
      name: "Terms & Scope",
      weight: CONTRACT_SUBSTEP_WEIGHTS.terms,
      isComplete: termsComplete,
      isEditable: true,
    });

    const timelineComplete = data.contract.timeline.startDate || data.contract.timeline.estimatedEndDate;
    if (timelineComplete) {
      contractSubTotal += CONTRACT_SUBSTEP_WEIGHTS.timeline;
    }
    contractSubSteps.push({
      id: "timeline",
      name: "Timeline",
      weight: CONTRACT_SUBSTEP_WEIGHTS.timeline,
      isComplete: timelineComplete,
      isEditable: true,
    });

    const signaturesComplete = data.contract.signatures.contractor;
    if (signaturesComplete) {
      contractSubTotal += CONTRACT_SUBSTEP_WEIGHTS.signatures;
    }
    contractSubSteps.push({
      id: "signatures",
      name: "Signatures",
      weight: CONTRACT_SUBSTEP_WEIGHTS.signatures,
      isComplete: signaturesComplete,
      isEditable: true,
    });

    const contractPercentage = (contractSubTotal / 100) * STEP_WEIGHTS.contract;
    totalPercentage += contractPercentage;

    const contractComplete = contractSubSteps.every(s => s.isComplete);
    steps.push({
      id: "contract",
      name: "Contract",
      weight: STEP_WEIGHTS.contract,
      subSteps: contractSubSteps,
      isComplete: contractComplete,
      isSkipped: false,
      tier: "FREE",
    });

    // 6. Documents Step (12.5%) - PRO TIER
    const documentsSubSteps: ProgressSubStep[] = [];
    let documentsSubTotal = 0;

    const blueprintsComplete = data.documents?.blueprintsUploaded ?? false;
    if (blueprintsComplete) {
      documentsSubTotal += DOCUMENTS_SUBSTEP_WEIGHTS.blueprints;
    }
    documentsSubSteps.push({
      id: "blueprints",
      name: "Upload Blueprints",
      weight: DOCUMENTS_SUBSTEP_WEIGHTS.blueprints,
      isComplete: blueprintsComplete,
      isEditable: true,
    });

    const sitePhotosComplete = data.documents?.photosUploaded ?? false;
    if (sitePhotosComplete) {
      documentsSubTotal += DOCUMENTS_SUBSTEP_WEIGHTS.sitePhotos;
    }
    documentsSubSteps.push({
      id: "sitePhotos",
      name: "Site Photos",
      weight: DOCUMENTS_SUBSTEP_WEIGHTS.sitePhotos,
      isComplete: sitePhotosComplete,
      isEditable: true,
    });

    const documentsComplete = data.documents?.hasDocuments ?? false;
    if (isPro) {
      const documentsPercentage = (documentsSubTotal / 100) * STEP_WEIGHTS.documents;
      totalPercentage += documentsPercentage;
    }
    steps.push({
      id: "documents",
      name: "Documents",
      weight: STEP_WEIGHTS.documents,
      subSteps: documentsSubSteps,
      isComplete: documentsComplete,
      isSkipped: false,
      tier: "PRO",
      isLocked: !isPro,
    });

    // 7. Team Step (12.5%) - PRO TIER
    const teamSubSteps: ProgressSubStep[] = [];
    let teamSubTotal = 0;

    const inviteMembersComplete = data.team?.invitesSent ?? false;
    if (inviteMembersComplete) {
      teamSubTotal += TEAM_SUBSTEP_WEIGHTS.inviteMembers;
    }
    teamSubSteps.push({
      id: "inviteMembers",
      name: "Invite Members",
      weight: TEAM_SUBSTEP_WEIGHTS.inviteMembers,
      isComplete: inviteMembersComplete,
      isEditable: true,
    });

    const assignRolesComplete = data.team?.rolesAssigned ?? false;
    if (assignRolesComplete) {
      teamSubTotal += TEAM_SUBSTEP_WEIGHTS.assignRoles;
    }
    teamSubSteps.push({
      id: "assignRoles",
      name: "Assign Roles",
      weight: TEAM_SUBSTEP_WEIGHTS.assignRoles,
      isComplete: assignRolesComplete,
      isEditable: true,
    });

    const teamComplete = data.team?.hasMembers ?? false;
    if (isPro) {
      const teamPercentage = (teamSubTotal / 100) * STEP_WEIGHTS.team;
      totalPercentage += teamPercentage;
    }
    steps.push({
      id: "team",
      name: "Team",
      weight: STEP_WEIGHTS.team,
      subSteps: teamSubSteps,
      isComplete: teamComplete,
      isSkipped: false,
      tier: "PRO",
      isLocked: !isPro,
    });

    // 8. Tasks Step (12.5%) - PRO TIER
    const tasksSubSteps: ProgressSubStep[] = [];
    let tasksSubTotal = 0;

    const createTasksComplete = (data.tasks?.count ?? 0) > 0;
    if (createTasksComplete) {
      tasksSubTotal += TASKS_SUBSTEP_WEIGHTS.createTasks;
    }
    tasksSubSteps.push({
      id: "createTasks",
      name: "Create Tasks",
      weight: TASKS_SUBSTEP_WEIGHTS.createTasks,
      isComplete: createTasksComplete,
      isEditable: true,
    });

    const assignTasksComplete = (data.tasks?.count ?? 0) > 0 && createTasksComplete;
    if (assignTasksComplete) {
      tasksSubTotal += TASKS_SUBSTEP_WEIGHTS.assignTasks;
    }
    tasksSubSteps.push({
      id: "assignTasks",
      name: "Assign Tasks",
      weight: TASKS_SUBSTEP_WEIGHTS.assignTasks,
      isComplete: assignTasksComplete,
      isEditable: true,
    });

    const trackProgressComplete = (data.tasks?.completedCount ?? 0) > 0;
    if (trackProgressComplete) {
      tasksSubTotal += TASKS_SUBSTEP_WEIGHTS.trackProgress;
    }
    tasksSubSteps.push({
      id: "trackProgress",
      name: "Track Progress",
      weight: TASKS_SUBSTEP_WEIGHTS.trackProgress,
      isComplete: trackProgressComplete,
      isEditable: true,
    });

    const tasksComplete = data.tasks?.hasTasks ?? false;
    if (isPro) {
      const tasksPercentage = (tasksSubTotal / 100) * STEP_WEIGHTS.tasks;
      totalPercentage += tasksPercentage;
    }
    steps.push({
      id: "tasks",
      name: "Tasks",
      weight: STEP_WEIGHTS.tasks,
      subSteps: tasksSubSteps,
      isComplete: tasksComplete,
      isSkipped: false,
      tier: "PRO",
      isLocked: !isPro,
    });

    // Generate warnings for incomplete required items
    if (!data.photo.hasData && !data.calculator.hasData) {
      warnings.push("No area data - add Photo or Calculator");
    }
    if (!data.quote.client.name || !data.quote.client.email) {
      warnings.push("Client info incomplete");
    }
    if (!data.quote.lineItems.hasItems) {
      warnings.push("No line items added");
    }
    if (isPro && data.tasks?.overdueCount && data.tasks.overdueCount > 0) {
      warnings.push(`${data.tasks.overdueCount} overdue task${data.tasks.overdueCount > 1 ? "s" : ""}`);
    }

    // Calculate percentage relative to available features
    // For free users: max is 62.5% (5 steps * 12.5%)
    // For pro users: max is 100% (8 steps * 12.5%)
    const maxPercentage = isPro ? 100 : 62.5;
    const normalizedPercentage = Math.min(100, Math.round((totalPercentage / maxPercentage) * 100));

    // Determine overall status
    let status: "not_started" | "in_progress" | "ready_for_quote" | "ready_for_team" | "complete" = "not_started";
    if (totalPercentage === 0) {
      status = "not_started";
    } else if (normalizedPercentage >= 100) {
      status = "complete";
    } else if (normalizedPercentage >= 80 && isPro) {
      status = "ready_for_team";
    } else if (normalizedPercentage >= 60) {
      status = "ready_for_quote";
    } else {
      status = "in_progress";
    }

    return {
      percentage: normalizedPercentage,
      rawPercentage: Math.round(totalPercentage),
      steps,
      warnings,
      status,
      statusLabel: getStatusLabel(status),
      statusColor: getStatusColor(status),
      isPro,
      isPremium,
      soloComplete: steps.slice(0, 5).every(s => s.isComplete),
      teamComplete: isPro && steps.slice(5).every(s => s.isComplete),
    };
  }, [data]);

  return progress;
};

function getStatusLabel(status: string): string {
  switch (status) {
    case "not_started":
      return "Not Started";
    case "in_progress":
      return "In Progress";
    case "ready_for_quote":
      return "Ready for Quote";
    case "ready_for_team":
      return "Team Ready";
    case "complete":
      return "Complete";
    default:
      return "Unknown";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "not_started":
      return "bg-gray-100 text-gray-600";
    case "in_progress":
      return "bg-amber-100 text-amber-700";
    case "ready_for_quote":
      return "bg-blue-100 text-blue-700";
    case "ready_for_team":
      return "bg-cyan-100 text-cyan-700";
    case "complete":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default useQuickModeProgress;
