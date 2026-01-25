import { useMemo } from "react";

// Progress step definitions
export interface ProgressStep {
  id: string;
  name: string;
  weight: number; // Percentage weight
  subSteps?: ProgressSubStep[];
  isComplete: boolean;
  isSkipped: boolean;
}

export interface ProgressSubStep {
  id: string;
  name: string;
  weight: number; // Percentage of parent step
  isComplete: boolean;
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
      startDate: boolean;
    };
    signatures: {
      contractor: boolean;
      client: boolean;
    };
  };
}

// Weight distribution: 5 main steps = 20% each
const STEP_WEIGHTS = {
  photo: 20,
  templates: 20,
  calculator: 20,
  quote: 20,
  contract: 20,
};

// Sub-step weights within Quote (totaling 100% of parent)
const QUOTE_SUBSTEP_WEIGHTS = {
  yourInfo: 33.33,
  client: 33.33,
  lineItems: 33.34,
};

// Sub-step weights within Contract (totaling 100% of parent)
const CONTRACT_SUBSTEP_WEIGHTS = {
  contractor: 25,
  client: 25,
  terms: 25,
  signatures: 25,
};

export const useQuickModeProgress = (data: QuickModeProgressData) => {
  const progress = useMemo(() => {
    let totalPercentage = 0;
    const steps: ProgressStep[] = [];
    const warnings: string[] = [];

    // 1. Photo Step (20%)
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
    });

    // 2. Templates Step (20%)
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
    });

    // 3. Calculator Step (20%)
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
    });

    // 4. Quote Step (20%) - with sub-steps
    const quoteSubSteps: ProgressSubStep[] = [];
    let quoteSubTotal = 0;

    // Your Info sub-step (33.33% of quote = 6.67% total)
    const yourInfoFields = [
      data.quote.yourInfo.companyName,
      data.quote.yourInfo.phone,
      data.quote.yourInfo.email,
    ];
    const yourInfoComplete = yourInfoFields.filter(Boolean).length >= 2; // At least 2 of 3
    if (yourInfoComplete) {
      quoteSubTotal += QUOTE_SUBSTEP_WEIGHTS.yourInfo;
    }
    quoteSubSteps.push({
      id: "yourInfo",
      name: "Your Info",
      weight: QUOTE_SUBSTEP_WEIGHTS.yourInfo,
      isComplete: yourInfoComplete,
    });

    // Client sub-step (33.33% of quote = 6.67% total)
    const clientComplete = data.quote.client.name && data.quote.client.email;
    if (clientComplete) {
      quoteSubTotal += QUOTE_SUBSTEP_WEIGHTS.client;
    }
    quoteSubSteps.push({
      id: "client",
      name: "Client Info",
      weight: QUOTE_SUBSTEP_WEIGHTS.client,
      isComplete: clientComplete,
    });

    // Line Items sub-step (33.34% of quote = 6.67% total)
    const lineItemsComplete = data.quote.lineItems.hasItems && data.quote.lineItems.count > 0;
    if (lineItemsComplete) {
      quoteSubTotal += QUOTE_SUBSTEP_WEIGHTS.lineItems;
    }
    quoteSubSteps.push({
      id: "lineItems",
      name: "Line Items",
      weight: QUOTE_SUBSTEP_WEIGHTS.lineItems,
      isComplete: lineItemsComplete,
    });

    // Calculate quote percentage (sub-steps / 100 * step weight)
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
    });

    // 5. Contract Step (20%) - with sub-steps
    const contractSubSteps: ProgressSubStep[] = [];
    let contractSubTotal = 0;

    // Contractor info (25% of contract = 5% total)
    const contractorComplete = data.contract.contractor.name;
    if (contractorComplete) {
      contractSubTotal += CONTRACT_SUBSTEP_WEIGHTS.contractor;
    }
    contractSubSteps.push({
      id: "contractor",
      name: "Contractor Info",
      weight: CONTRACT_SUBSTEP_WEIGHTS.contractor,
      isComplete: contractorComplete,
    });

    // Client info (25% of contract = 5% total)
    const contractClientComplete = data.contract.client.name;
    if (contractClientComplete) {
      contractSubTotal += CONTRACT_SUBSTEP_WEIGHTS.client;
    }
    contractSubSteps.push({
      id: "contractClient",
      name: "Client Info",
      weight: CONTRACT_SUBSTEP_WEIGHTS.client,
      isComplete: contractClientComplete,
    });

    // Terms (25% of contract = 5% total)
    const termsComplete = data.contract.terms.scopeOfWork && data.contract.terms.totalAmount;
    if (termsComplete) {
      contractSubTotal += CONTRACT_SUBSTEP_WEIGHTS.terms;
    }
    contractSubSteps.push({
      id: "terms",
      name: "Terms & Scope",
      weight: CONTRACT_SUBSTEP_WEIGHTS.terms,
      isComplete: termsComplete,
    });

    // Signatures (25% of contract = 5% total)
    const signaturesComplete = data.contract.signatures.contractor;
    if (signaturesComplete) {
      contractSubTotal += CONTRACT_SUBSTEP_WEIGHTS.signatures;
    }
    contractSubSteps.push({
      id: "signatures",
      name: "Signatures",
      weight: CONTRACT_SUBSTEP_WEIGHTS.signatures,
      isComplete: signaturesComplete,
    });

    // Calculate contract percentage
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

    // Determine overall status
    let status: "not_started" | "in_progress" | "ready_for_quote" | "complete" = "not_started";
    if (totalPercentage === 0) {
      status = "not_started";
    } else if (totalPercentage >= 100) {
      status = "complete";
    } else if (totalPercentage >= 60) {
      status = "ready_for_quote";
    } else {
      status = "in_progress";
    }

    return {
      percentage: Math.round(totalPercentage),
      steps,
      warnings,
      status,
      statusLabel: getStatusLabel(status),
      statusColor: getStatusColor(status),
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
    case "complete":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default useQuickModeProgress;
