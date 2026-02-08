import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  FileText, 
  Settings, 
  BarChart3, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  SkipForward,
  CheckCircle2,
  CalendarIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { CollectedCitation, CITATION_IDS } from "@/types/collectedCitation";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface FilterAnswers {
  inputFilter: {
    dataAvailability: "both" | "blueprints_only" | "photos_only" | "none";
    siteModifications: "significant" | "minor" | "none" | "unknown";
  };
  technicalFilter: {
    affectsStructure: boolean;
    affectsMechanical: boolean;
    affectsFacade: boolean;
    hasProjectManager: "yes_pm" | "yes_technical" | "no" | "self";
    projectStartDate: Date | null;
    projectEndDate: Date | null;
  };
  workflowFilter: {
    subcontractorCount: "1-2" | "3-5" | "6+" | "not_applicable";
    deadline: "strict_fixed" | "flexible_fixed" | "strict_flexible" | "both_flexible";
  };
  // NEW: Collected citations from Pages 2-3
  collectedCitations?: CollectedCitation[];
}

export interface AITriggers {
  ragEnabled: boolean;
  conflictDetection: boolean;
  obcSearch: boolean;
  teamMapDepth: "basic" | "standard" | "deep";
  reportGeneration: boolean;
  recommendTeamMode: boolean;
}

export interface FilterQuestionsProps {
  projectData: {
    name: string;
    workType: string | null;
    hasImages: boolean;
    hasDocuments: boolean;
  };
  previousCitations?: CollectedCitation[]; // Citations from Page 1
  onComplete: (answers: FilterAnswers, triggers: AITriggers) => void;
  onBack: () => void;
  onSkipAI?: () => void; // NEW: Skip AI analysis entirely and create manual project
}

// Default answers
const DEFAULT_ANSWERS: FilterAnswers = {
  inputFilter: {
    dataAvailability: "none",
    siteModifications: "unknown",
  },
  technicalFilter: {
    affectsStructure: false,
    affectsMechanical: false,
    affectsFacade: false,
    hasProjectManager: "no",
    projectStartDate: null,
    projectEndDate: null,
  },
  workflowFilter: {
    subcontractorCount: "1-2",
    deadline: "both_flexible",
  },
};

// Calculate AI triggers from filter answers
function calculateAITriggers(answers: FilterAnswers): AITriggers {
  const { inputFilter, technicalFilter, workflowFilter } = answers;
  
  return {
    // RAG enabled if we have both blueprints and photos
    ragEnabled: inputFilter.dataAvailability === "both",
    
    // Conflict detection if there are site modifications
    conflictDetection: inputFilter.siteModifications !== "none" && inputFilter.siteModifications !== "unknown",
    
    // OBC search if structural/mechanical/facade work
    obcSearch: technicalFilter.affectsStructure || technicalFilter.affectsMechanical || technicalFilter.affectsFacade,
    
    // Team map depth based on subcontractor count
    teamMapDepth: workflowFilter.subcontractorCount === "6+" 
      ? "deep" 
      : workflowFilter.subcontractorCount === "3-5" 
        ? "standard" 
        : "basic",
    
    // Report generation if strict deadline or fixed budget
    reportGeneration: workflowFilter.deadline.includes("strict"),
    
    // Recommend team mode if PM present or 3+ subcontractors
    recommendTeamMode: 
      technicalFilter.hasProjectManager !== "no" || 
      workflowFilter.subcontractorCount !== "1-2" ||
      technicalFilter.affectsStructure ||
      technicalFilter.affectsMechanical,
  };
}

// Filter step configuration
const FILTER_STEPS = [
  {
    id: "input",
    title: "Data Source & Authenticity",
    subtitle: "What documentation do you have available?",
    icon: FileText,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  {
    id: "technical",
    title: "Complexity & Regulations",
    subtitle: "What type of work is involved?",
    icon: Settings,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  {
    id: "workflow",
    title: "Resources & Timeline",
    subtitle: "How will the project be managed?",
    icon: BarChart3,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function FilterQuestions({ 
  projectData,
  previousCitations = [],
  onComplete, 
  onBack,
  onSkipAI 
}: FilterQuestionsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<FilterAnswers>(() => {
    // Pre-fill based on project data
    const initial = { ...DEFAULT_ANSWERS };
    if (projectData.hasImages && projectData.hasDocuments) {
      initial.inputFilter.dataAvailability = "both";
    } else if (projectData.hasDocuments) {
      initial.inputFilter.dataAvailability = "blueprints_only";
    } else if (projectData.hasImages) {
      initial.inputFilter.dataAvailability = "photos_only";
    }
    return initial;
  });

  const updateInputFilter = (updates: Partial<FilterAnswers["inputFilter"]>) => {
    setAnswers(prev => ({
      ...prev,
      inputFilter: { ...prev.inputFilter, ...updates },
    }));
  };

  const updateTechnicalFilter = (updates: Partial<FilterAnswers["technicalFilter"]>) => {
    setAnswers(prev => ({
      ...prev,
      technicalFilter: { ...prev.technicalFilter, ...updates },
    }));
  };

  const updateWorkflowFilter = (updates: Partial<FilterAnswers["workflowFilter"]>) => {
    setAnswers(prev => ({
      ...prev,
      workflowFilter: { ...prev.workflowFilter, ...updates },
    }));
  };

  // Collect citations from FilterQuestions data
  const collectCitations = useCallback((): CollectedCitation[] => {
    const citations: CollectedCitation[] = [];
    const now = new Date().toISOString();

    // [C-003] Data Source citation
    const dataLabels: Record<string, string> = {
      both: 'Both blueprints and photos available',
      blueprints_only: 'Only blueprints available',
      photos_only: 'Only photos available',
      none: 'No documentation available',
    };
    citations.push({
      sourceId: CITATION_IDS.DATA_SOURCE,
      documentName: 'Data Source Selection',
      documentType: 'log',
      contextSnippet: dataLabels[answers.inputFilter.dataAvailability],
      linkedPillar: 'confidence',
      timestamp: now,
      sourceType: 'USER',
    });

    // [TL-001] Timeline citation (only if dates set) - linked to Tasks pillar
    if (answers.technicalFilter.projectStartDate || answers.technicalFilter.projectEndDate) {
      const startStr = answers.technicalFilter.projectStartDate 
        ? format(answers.technicalFilter.projectStartDate, 'MMM d, yyyy') 
        : 'Not set';
      const endStr = answers.technicalFilter.projectEndDate 
        ? format(answers.technicalFilter.projectEndDate, 'MMM d, yyyy') 
        : 'Not set';
      citations.push({
        sourceId: CITATION_IDS.TIMELINE,
        documentName: 'Project Timeline',
        documentType: 'log',
        contextSnippet: `Start: ${startStr} | End: ${endStr}`,
        linkedPillar: 'tasks', // Link to Tasks pillar for Gantt validation
        timestamp: now,
        sourceType: 'USER',
      });
    }

    // [T-001] Trades citation (for Team Mode) - linked to Mode pillar
    if (answers.workflowFilter.subcontractorCount !== 'not_applicable') {
      const tradeLabels: Record<string, string> = {
        '1-2': '1-2 trades (simple coordination)',
        '3-5': '3-5 trades (standard project)',
        '6+': '6+ trades (complex coordination)',
      };
      citations.push({
        sourceId: CITATION_IDS.TRADES,
        documentName: 'Trades Configuration',
        documentType: 'log',
        contextSnippet: tradeLabels[answers.workflowFilter.subcontractorCount] || answers.workflowFilter.subcontractorCount,
        linkedPillar: 'mode', // Link to Mode pillar for project mode validation
        timestamp: now,
        sourceType: 'USER',
      });
    }

    return citations;
  }, [answers]);

  const handleNext = () => {
    if (currentStep < FILTER_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete - calculate triggers and submit with citations
      const triggers = calculateAITriggers(answers);
      const newCitations = collectCitations();
      const allCitations = [...previousCitations, ...newCitations];
      onComplete({ ...answers, collectedCitations: allCitations }, triggers);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      onBack();
    }
  };

  const handleSkipAll = () => {
    // Use defaults with pre-filled data availability + collect citations
    const triggers = calculateAITriggers(answers);
    const newCitations = collectCitations();
    const allCitations = [...previousCitations, ...newCitations];
    onComplete({ ...answers, collectedCitations: allCitations }, triggers);
  };

  const step = FILTER_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === FILTER_STEPS.length - 1;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Project Analysis</h2>
          <p className="text-sm text-muted-foreground">"{projectData.name}"</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleSkipAll}
          className="text-muted-foreground hover:text-foreground"
        >
          <SkipForward className="h-4 w-4 mr-1" />
          Skip All
        </Button>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-2">
        {FILTER_STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
              i < currentStep && "bg-primary text-primary-foreground",
              i === currentStep && cn(s.bgColor, s.color),
              i > currentStep && "bg-muted text-muted-foreground"
            )}>
              {i < currentStep ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < FILTER_STEPS.length - 1 && (
              <div className={cn(
                "w-8 h-0.5 mx-1",
                i < currentStep ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Card */}
      <Card className={cn("border-2 transition-all", step.borderColor)}>
        <CardContent className="p-6 space-y-6">
          {/* Step Header */}
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", step.bgColor)}>
              <StepIcon className={cn("h-5 w-5", step.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.subtitle}</p>
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 0 && (
            <InputFilterStep 
              answers={answers.inputFilter}
              projectData={projectData}
              onChange={updateInputFilter}
            />
          )}
          {currentStep === 1 && (
            <TechnicalFilterStep 
              answers={answers.technicalFilter}
              onChange={updateTechnicalFilter}
            />
          )}
          {currentStep === 2 && (
            <WorkflowFilterStep 
              answers={answers.workflowFilter}
              onChange={updateWorkflowFilter}
            />
          )}
        </CardContent>
      </Card>

      {/* AI Trigger Preview */}
      <AITriggerPreview answers={answers} />

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {currentStep === 0 ? "Back to Project" : "Previous"}
        </Button>
        <Button 
          onClick={handleNext} 
          className={cn(
            "flex-1",
            isLastStep 
              ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" 
              : ""
          )}
        >
          {isLastStep ? (
            <>
              <Sparkles className="h-4 w-4 mr-1" />
              Start AI Analysis
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>

      {/* Skip AI Option - Create Manual Project */}
      {onSkipAI && (
        <Button 
          variant="ghost" 
          onClick={onSkipAI}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <SkipForward className="h-4 w-4 mr-1" />
          Skip AI Analysis → Create Manual Project
        </Button>
      )}
    </div>
  );
}

// ============================================
// FILTER STEP COMPONENTS
// ============================================

interface InputFilterStepProps {
  answers: FilterAnswers["inputFilter"];
  projectData: { hasImages: boolean; hasDocuments: boolean };
  onChange: (updates: Partial<FilterAnswers["inputFilter"]>) => void;
}

function InputFilterStep({ answers, projectData, onChange }: InputFilterStepProps) {
  const dataOptions = [
    { value: "both", label: "Yes, both available", description: "Sealed blueprints + current site photos" },
    { value: "blueprints_only", label: "Only blueprints", description: "Plans available, no recent photos" },
    { value: "photos_only", label: "Only photos", description: "Site photos available, no formal plans" },
    { value: "none", label: "Neither available", description: "Will work from descriptions only" },
  ] as const;

  const modificationOptions = [
    { value: "significant", label: "Yes, significant changes", description: "Major deviations from plans" },
    { value: "minor", label: "Minor modifications", description: "Small changes were made" },
    { value: "none", label: "No modifications", description: "Site matches the plans" },
    { value: "unknown", label: "I don't know", description: "Uncertain about changes" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Question 1: Data Availability */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">
          Do you have sealed PDF blueprints and current site photos?
        </Label>
        {projectData.hasImages || projectData.hasDocuments ? (
          <div className="text-xs text-primary mb-2 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {projectData.hasImages && projectData.hasDocuments 
              ? "You uploaded both photos and documents" 
              : projectData.hasDocuments 
                ? "You uploaded documents" 
                : "You uploaded photos"}
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {dataOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ dataAvailability: option.value })}
              className={cn(
                "p-3 rounded-lg border-2 text-left transition-all",
                answers.dataAvailability === option.value
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-border hover:border-blue-300"
              )}
            >
              <div className="text-sm font-medium text-foreground">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Question 2: Site Modifications */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">
          Have there been any modifications on site since the plans were issued?
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {modificationOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ siteModifications: option.value })}
              className={cn(
                "p-3 rounded-lg border-2 text-left transition-all",
                answers.siteModifications === option.value
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-border hover:border-blue-300"
              )}
            >
              <div className="text-sm font-medium text-foreground">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TechnicalFilterStepProps {
  answers: FilterAnswers["technicalFilter"];
  onChange: (updates: Partial<FilterAnswers["technicalFilter"]>) => void;
}

function TechnicalFilterStep({ answers, onChange }: TechnicalFilterStepProps) {
  const { t } = useTranslation();
  
  const pmOptions = [
    { value: "yes_pm", label: "Yes, Project Manager", description: "Dedicated PM assigned" },
    { value: "yes_technical", label: "Yes, Technical Lead", description: "Site supervisor or foreman" },
    { value: "self", label: "I am the lead", description: "Managing the project myself" },
    { value: "no", label: "Not assigned yet", description: "No designated lead" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Question 3: Work Type (Multi-select) */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">
          Does this work affect any of the following? (Select all that apply)
        </Label>
        <div className="space-y-2">
          <label className={cn(
            "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
            answers.affectsStructure ? "border-amber-500 bg-amber-500/10" : "border-border hover:border-amber-300"
          )}>
            <Checkbox 
              checked={answers.affectsStructure}
              onCheckedChange={(checked) => onChange({ affectsStructure: !!checked })}
            />
            <div>
              <div className="text-sm font-medium text-foreground">Structural Components</div>
              <div className="text-xs text-muted-foreground">Load-bearing walls, foundations, beams</div>
            </div>
            {answers.affectsStructure && (
              <Badge className="ml-auto text-[10px] bg-amber-500/20 text-amber-600">OBC Required</Badge>
            )}
          </label>

          <label className={cn(
            "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
            answers.affectsMechanical ? "border-amber-500 bg-amber-500/10" : "border-border hover:border-amber-300"
          )}>
            <Checkbox 
              checked={answers.affectsMechanical}
              onCheckedChange={(checked) => onChange({ affectsMechanical: !!checked })}
            />
            <div>
              <div className="text-sm font-medium text-foreground">Mechanical Main Lines</div>
              <div className="text-xs text-muted-foreground">HVAC mains, plumbing stacks, electrical panels</div>
            </div>
            {answers.affectsMechanical && (
              <Badge className="ml-auto text-[10px] bg-amber-500/20 text-amber-600">Permits</Badge>
            )}
          </label>

          <label className={cn(
            "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
            answers.affectsFacade ? "border-amber-500 bg-amber-500/10" : "border-border hover:border-amber-300"
          )}>
            <Checkbox 
              checked={answers.affectsFacade}
              onCheckedChange={(checked) => onChange({ affectsFacade: !!checked })}
            />
            <div>
              <div className="text-sm font-medium text-foreground">Exterior Facade</div>
              <div className="text-xs text-muted-foreground">Cladding, windows, exterior modifications</div>
            </div>
          </label>
        </div>
      </div>

      {/* Question 4: Project Manager */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">
          Is there a designated Project Manager or Technical Lead on site?
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {pmOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ hasProjectManager: option.value })}
              className={cn(
                "p-3 rounded-lg border-2 text-left transition-all",
                answers.hasProjectManager === option.value
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-border hover:border-amber-300"
              )}
            >
              <div className="text-sm font-medium text-foreground">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Project Timeline - Date Pickers */}
      <div className="space-y-3 p-4 rounded-lg border-2 border-amber-500/30 bg-amber-500/5">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-amber-500" />
          <Label className="text-sm font-medium text-foreground">
            {t("filterQuestions.projectTimeline", "Project Timeline")}
          </Label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Project Start Date */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("filterQuestions.projectStart", "Project Start")}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !answers.projectStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {answers.projectStartDate ? (
                    format(answers.projectStartDate, "PPP")
                  ) : (
                    <span>{t("filterQuestions.pickDate", "Pick a date")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <Calendar
                  mode="single"
                  selected={answers.projectStartDate || undefined}
                  onSelect={(date) => onChange({ projectStartDate: date || null })}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Target End Date */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("filterQuestions.targetEnd", "Target End")}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !answers.projectEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {answers.projectEndDate ? (
                    format(answers.projectEndDate, "PPP")
                  ) : (
                    <span>{t("filterQuestions.pickDate", "Pick a date")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <Calendar
                  mode="single"
                  selected={answers.projectEndDate || undefined}
                  onSelect={(date) => onChange({ projectEndDate: date || null })}
                  disabled={(date) => 
                    answers.projectStartDate ? date < answers.projectStartDate : false
                  }
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}

interface WorkflowFilterStepProps {
  answers: FilterAnswers["workflowFilter"];
  onChange: (updates: Partial<FilterAnswers["workflowFilter"]>) => void;
}

function WorkflowFilterStep({ answers, onChange }: WorkflowFilterStepProps) {
  const subcontractorOptions = [
    { value: "1-2", label: "1-2 trades", description: "Simple coordination" },
    { value: "3-5", label: "3-5 trades", description: "Standard project" },
    { value: "6+", label: "6+ trades", description: "Complex coordination" },
    { value: "not_applicable", label: "Not applicable", description: "Solo or general work" },
  ] as const;

  const deadlineOptions = [
    { value: "strict_fixed", label: "Strict deadline + Fixed budget", description: "Tight constraints on both" },
    { value: "flexible_fixed", label: "Flexible deadline + Fixed budget", description: "Time flexible, cost constrained" },
    { value: "strict_flexible", label: "Strict deadline + Flexible budget", description: "Must finish on time" },
    { value: "both_flexible", label: "Both flexible", description: "No hard constraints" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Question 5: Subcontractor Count */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">
          How many different trades need to be coordinated?
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {subcontractorOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ subcontractorCount: option.value })}
              className={cn(
                "p-3 rounded-lg border-2 text-left transition-all",
                answers.subcontractorCount === option.value
                  ? "border-green-500 bg-green-500/10"
                  : "border-border hover:border-green-300"
              )}
            >
              <div className="text-sm font-medium text-foreground">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Question 6: Deadline & Budget */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">
          What are the deadline and budget constraints?
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {deadlineOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ deadline: option.value })}
              className={cn(
                "p-3 rounded-lg border-2 text-left transition-all",
                answers.deadline === option.value
                  ? "border-green-500 bg-green-500/10"
                  : "border-border hover:border-green-300"
              )}
            >
              <div className="text-sm font-medium text-foreground">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// AI TRIGGER PREVIEW
// ============================================

interface AITriggerPreviewProps {
  answers: FilterAnswers;
}

function AITriggerPreview({ answers }: AITriggerPreviewProps) {
  const triggers = calculateAITriggers(answers);
  const activeCount = Object.values(triggers).filter(Boolean).length;

  if (activeCount === 0) return null;

  return (
    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-foreground">
          AI Capabilities Activated ({activeCount})
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {triggers.ragEnabled && (
          <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-600">
            Visual Comparison
          </Badge>
        )}
        {triggers.conflictDetection && (
          <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">
            Conflict Detection
          </Badge>
        )}
        {triggers.obcSearch && (
          <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
            OBC Regulations
          </Badge>
        )}
        {triggers.recommendTeamMode && (
          <Badge variant="outline" className="text-[10px] border-cyan-500 text-cyan-600">
            Team Mode
          </Badge>
        )}
        {triggers.reportGeneration && (
          <Badge variant="outline" className="text-[10px] border-green-500 text-green-600">
            Reports
          </Badge>
        )}
        {triggers.teamMapDepth !== "basic" && (
          <Badge variant="outline" className="text-[10px] border-purple-500 text-purple-600">
            {triggers.teamMapDepth === "deep" ? "Deep" : "Standard"} Analysis
          </Badge>
        )}
      </div>
    </div>
  );
}
