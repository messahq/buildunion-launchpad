import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Printer,
  Mail,
  Download,
  Loader2,
  CheckCircle,
  FileSpreadsheet,
  FileSignature,
  Receipt,
  ClipboardList,
  Users,
  BarChart3,
  ChevronDown,
  Copy,
  Brain,
  Zap,
  Eye,
  Pencil,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateProjectReport, ProjectReportParams, ConflictData } from "@/lib/pdfGenerator";
import { OperationalTruth } from "@/types/operationalTruth";
import { ProBadge } from "@/components/ui/pro-badge";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import ReactMarkdown from "react-markdown";

// ============================================
// TYPES
// ============================================

interface DocumentAction {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "report" | "financial" | "legal" | "team";
  isPremium?: boolean;
  previewContent?: string;
  navigateTo?: string;
  action: () => Promise<void> | void;
}

interface ProjectCommandCenterProps {
  projectId: string;
  projectName: string;
  projectAddress?: string;
  projectTrade?: string;
  projectCreatedAt: string;
  operationalTruth: OperationalTruth;
  companyBranding?: {
    name?: string;
    logo?: string;
    license?: string;
    wsib?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  conflicts?: ConflictData[];
  isPremium?: boolean;
  onNavigateToTab?: (tabId: string) => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export const ProjectCommandCenter = ({
  projectId,
  projectName,
  projectAddress,
  projectTrade,
  projectCreatedAt,
  operationalTruth,
  companyBranding,
  conflicts = [],
  isPremium = false,
  onNavigateToTab,
}: ProjectCommandCenterProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [briefContent, setBriefContent] = useState<string | null>(null);
  const [briefMetadata, setBriefMetadata] = useState<any>(null);
  const [isBriefDialogOpen, setIsBriefDialogOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [activeDocumentCategory, setActiveDocumentCategory] = useState<string>("all");
  
  // Preview state
  const [previewDocument, setPreviewDocument] = useState<DocumentAction | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Selected state for visual feedback
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  
  // Double-tap detection for mobile
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);

  // Generate AI Brief
  const generateAIBrief = useCallback(async () => {
    setIsGeneratingBrief(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to generate briefs");
        return;
      }

      const response = await supabase.functions.invoke("generate-project-brief", {
        body: { projectId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.brief) {
        setBriefContent(response.data.brief);
        setBriefMetadata(response.data.metadata);
        setIsBriefDialogOpen(true);
        setIsPreviewMode(false); // Full view when generated
        toast.success("AI Brief generated successfully!");
      }
    } catch (error) {
      console.error("Brief generation error:", error);
      toast.error("Failed to generate brief. Please try again.");
    } finally {
      setIsGeneratingBrief(false);
    }
  }, [projectId]);

  // Generate Project Report PDF
  const generateFullReport = useCallback(async () => {
    toast.loading("Generating Project Report...", { id: "report" });
    try {
      const params: ProjectReportParams = {
        projectInfo: {
          name: projectName,
          address: projectAddress || "Address not specified",
          trade: projectTrade || "General",
          createdAt: new Date(projectCreatedAt).toLocaleDateString("en-CA"),
        },
        operationalTruth,
        conflicts,
        companyBranding,
      };

      await generateProjectReport(params, {
        download: true,
        filename: `${projectName.replace(/\s+/g, "_")}_Report_${Date.now()}.pdf`,
      });

      toast.success("Report downloaded!", { id: "report" });
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error("Failed to generate report", { id: "report" });
    }
  }, [projectName, projectAddress, projectTrade, projectCreatedAt, operationalTruth, conflicts, companyBranding]);

  // Copy Brief to Clipboard
  const copyBriefToClipboard = useCallback(async () => {
    if (!briefContent) return;
    try {
      await navigator.clipboard.writeText(briefContent);
      toast.success("Brief copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  }, [briefContent]);

  // Print Brief
  const printBrief = useCallback(() => {
    if (!briefContent) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${projectName} - AI Brief</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
            h1 { color: #1e293b; border-bottom: 3px solid #0d9488; padding-bottom: 8px; }
            h2 { color: #334155; margin-top: 24px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 8px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
            .meta { color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>🏗️ ${projectName}</h1>
              <p class="meta">${projectAddress || ""}</p>
            </div>
            <div class="meta" style="text-align: right;">
              Generated: ${new Date().toLocaleDateString()}<br/>
              Data Sources: 16
            </div>
          </div>
          ${briefContent.replace(/\n/g, "<br/>")}
          <hr style="margin-top: 40px; border: 1px solid #e2e8f0;" />
          <p class="meta" style="text-align: center;">Generated with BuildUnion AI • Professional Construction Intelligence</p>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }, [briefContent, projectName, projectAddress]);

  // Email Brief
  const emailBrief = useCallback(() => {
    if (!briefContent) return;
    const subject = encodeURIComponent(`Project Brief: ${projectName}`);
    const body = encodeURIComponent(`Project Brief for ${projectName}\n\n${briefContent}\n\n---\nGenerated with BuildUnion AI`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [briefContent, projectName]);

  // Handle single click - show preview
  const handleSingleClick = useCallback((action: DocumentAction) => {
    setSelectedDocumentId(action.id);
    setPreviewDocument(action);
    setIsPreviewOpen(true);
  }, []);

  // Handle double click - open full/editable view
  const handleDoubleClick = useCallback((action: DocumentAction) => {
    setSelectedDocumentId(action.id);
    
    if (action.id === "ai-brief") {
      if (briefContent) {
        setIsPreviewMode(false);
        setIsBriefDialogOpen(true);
      } else {
        generateAIBrief();
      }
    } else if (action.navigateTo && onNavigateToTab) {
      onNavigateToTab(action.navigateTo);
      toast.success(`Navigating to ${action.name}...`);
    } else {
      action.action();
    }
  }, [briefContent, generateAIBrief, onNavigateToTab]);

  // Handle mobile touch with double-tap detection
  const handleTouchEnd = useCallback((action: DocumentAction) => {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (lastTap && lastTap.id === action.id && now - lastTap.time < 300) {
      // Double tap detected
      lastTapRef.current = null;
      handleDoubleClick(action);
    } else {
      // Single tap - show preview
      lastTapRef.current = { id: action.id, time: now };
      handleSingleClick(action);
    }
  }, [handleSingleClick, handleDoubleClick]);

  // Open brief in preview mode
  const openBriefPreview = useCallback(() => {
    if (briefContent) {
      setIsPreviewMode(true);
      setIsBriefDialogOpen(true);
    } else {
      toast.info("Generate a brief first to preview it");
    }
  }, [briefContent]);

  // Open brief in full edit mode
  const openBriefFullView = useCallback(() => {
    if (briefContent) {
      setIsPreviewMode(false);
      setIsBriefDialogOpen(true);
    } else {
      generateAIBrief();
    }
  }, [briefContent, generateAIBrief]);

  // Document Actions with preview content
  const documentActions: DocumentAction[] = [
    {
      id: "ai-brief",
      name: "AI Project Brief",
      description: "Comprehensive AI analysis from 16 data sources",
      icon: Brain,
      category: "report",
      isPremium: true,
      previewContent: briefContent ? 
        `**AI Project Brief**\n\n${briefContent.substring(0, 500)}...` : 
        "Generate an AI-powered executive summary from all 16 project data sources including the 8 Pillars of Operational Truth, tasks, documents, contracts, and team information.",
      action: generateAIBrief,
    },
    {
      id: "full-report",
      name: "Full Project Report",
      description: "8 Pillars + OBC + Conflicts",
      icon: BarChart3,
      category: "report",
      isPremium: true,
      previewContent: `**Full Project Report**\n\n• Project: ${projectName}\n• Address: ${projectAddress || "Not specified"}\n• Trade: ${projectTrade || "General"}\n\n**8 Pillars Status:**\n• Verified: ${operationalTruth.verifiedPillars}/${operationalTruth.totalPillars}\n• Confidence: ${operationalTruth.confidenceLevel}\n• Area: ${operationalTruth.confirmedArea || "Pending"} ${operationalTruth.areaUnit}`,
      action: generateFullReport,
    },
    {
      id: "quote",
      name: "Quote / Estimate",
      description: "Material & labor cost breakdown",
      icon: FileSpreadsheet,
      category: "financial",
      previewContent: "**Cost Estimate Preview**\n\nNavigate to the Materials tab to:\n• View material costs\n• Add labor items\n• Calculate taxes\n• Generate PDF quote",
      navigateTo: "materials",
      action: async () => { onNavigateToTab?.("materials"); },
    },
    {
      id: "invoice",
      name: "Invoice",
      description: "Client billing document",
      icon: Receipt,
      category: "financial",
      previewContent: "**Invoice Preview**\n\nNavigate to the Materials tab to:\n• Create professional invoices\n• Add payment terms\n• Include deposit amounts\n• Export as PDF",
      navigateTo: "materials",
      action: async () => { onNavigateToTab?.("materials"); },
    },
    {
      id: "contract",
      name: "Contract",
      description: "Legal agreement with client",
      icon: FileSignature,
      category: "legal",
      previewContent: "**Contract Preview**\n\nNavigate to the Contracts tab to:\n• Choose from professional templates\n• Add client information\n• Define scope of work\n• Collect digital signatures",
      navigateTo: "contracts",
      action: async () => { onNavigateToTab?.("contracts"); },
    },
    {
      id: "task-list",
      name: "Task List",
      description: "Exportable task checklist",
      icon: ClipboardList,
      category: "team",
      previewContent: "**Task List Preview**\n\nNavigate to the Team & Tasks tab to:\n• View all project tasks\n• Track completion status\n• Assign to team members\n• Export checklist",
      navigateTo: "team",
      action: async () => { onNavigateToTab?.("team"); },
    },
    {
      id: "team-report",
      name: "Team Report",
      description: "Member activity & assignments",
      icon: Users,
      category: "team",
      isPremium: true,
      previewContent: "**Team Report Preview**\n\n• Team size and roles\n• Task assignments per member\n• Completion rates\n• Activity timeline\n\n*Coming soon*",
      action: async () => { toast.info("Team reports coming soon"); },
    },
  ];

  const categories = [
    { id: "all", label: "All Documents" },
    { id: "report", label: "Reports" },
    { id: "financial", label: "Financial" },
    { id: "legal", label: "Legal" },
    { id: "team", label: "Team" },
  ];

  const filteredActions = activeDocumentCategory === "all" 
    ? documentActions 
    : documentActions.filter(a => a.category === activeDocumentCategory);

  return (
    <>
      {/* Command Center Card */}
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-cyan-50 dark:from-amber-950/20 dark:via-background dark:to-cyan-950/20 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-cyan-500 text-white shadow-md">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Project Command Center
                  <ProBadge tier="pro" size="sm" />
                </CardTitle>
                <CardDescription>
                  Click to preview • Double-click to open full view
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Action: AI Brief */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={generateAIBrief}
              disabled={isGeneratingBrief}
              className="flex-1 h-auto py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-500 hover:from-amber-600 hover:via-amber-500 hover:to-cyan-600 text-white shadow-md"
            >
              {isGeneratingBrief ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analyzing 16 Data Sources...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold">Generate AI Brief</div>
                    <div className="text-xs opacity-90">Executive summary from all project data</div>
                  </div>
                </>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={generateFullReport}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Full Project Report (PDF)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigateToTab?.("materials")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Cost Breakdown (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigateToTab?.("contracts")}>
                  <FileSignature className="h-4 w-4 mr-2" />
                  Contract (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Document Grid */}
          <div className="space-y-3">
            {/* Category Tabs */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={activeDocumentCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveDocumentCategory(cat.id)}
                  className={cn(
                    "text-xs",
                    activeDocumentCategory === cat.id && "bg-gradient-to-r from-amber-500 to-cyan-500"
                  )}
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            {/* Document Cards with Click/Double-Click Logic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredActions.map((action) => {
                const Icon = action.icon;
                const isSelected = selectedDocumentId === action.id;
                
                const cardContent = (
                  <div
                    key={action.id}
                    onClick={() => !isMobile && handleSingleClick(action)}
                    onDoubleClick={() => !isMobile && handleDoubleClick(action)}
                    onTouchEnd={() => isMobile && handleTouchEnd(action)}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all cursor-pointer select-none",
                      "bg-white dark:bg-card hover:shadow-md",
                      isSelected && "border-amber-400 ring-2 ring-amber-200 bg-amber-50/50 dark:bg-amber-950/20",
                      !isSelected && "hover:border-amber-300",
                      action.id === "ai-brief" && !isSelected && "ring-1 ring-amber-200"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg transition-transform",
                        isSelected && "scale-110",
                        action.category === "report" && "bg-amber-100 text-amber-600",
                        action.category === "financial" && "bg-emerald-100 text-emerald-600",
                        action.category === "legal" && "bg-blue-100 text-blue-600",
                        action.category === "team" && "bg-purple-100 text-purple-600"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{action.name}</span>
                          {action.isPremium && <ProBadge tier="pro" size="sm" showTooltip={false} />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {action.description}
                        </p>
                      </div>
                    </div>

                    {/* Selection hint */}
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-amber-200 flex items-center gap-2 text-xs text-amber-600">
                        <Eye className="h-3 w-3" />
                        <span>Preview mode</span>
                        <span className="text-muted-foreground">• Double-click to edit</span>
                      </div>
                    )}

                    {/* Quick Actions - only show on hover/selection */}
                    <div className={cn(
                      "flex gap-1 mt-3 transition-opacity",
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          action.action();
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.print();
                        }}
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        Print
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          const subject = encodeURIComponent(`${action.name}: ${projectName}`);
                          window.location.href = `mailto:?subject=${subject}`;
                        }}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                    </div>
                  </div>
                );

                // Wrap in tooltip for desktop
                if (!isMobile) {
                  return (
                    <Tooltip key={action.id} delayDuration={700}>
                      <TooltipTrigger asChild>
                        <div className="group">{cardContent}</div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Click to preview • Double-click to open
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={action.id} className="group">{cardContent}</div>;
              })}
            </div>
          </div>

          {/* Data Source Badge */}
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            <span>Powered by 16 synchronized data sources</span>
            <Badge variant="secondary" className="text-[10px]">
              8 Pillars + 8 Tabs
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Document Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {previewDocument && (
                  <>
                    <div className={cn(
                      "p-2 rounded-lg",
                      previewDocument.category === "report" && "bg-amber-100 text-amber-600",
                      previewDocument.category === "financial" && "bg-emerald-100 text-emerald-600",
                      previewDocument.category === "legal" && "bg-blue-100 text-blue-600",
                      previewDocument.category === "team" && "bg-purple-100 text-purple-600"
                    )}>
                      <previewDocument.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogTitle className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        {previewDocument.name}
                      </DialogTitle>
                      <DialogDescription>
                        Preview Mode
                      </DialogDescription>
                    </div>
                  </>
                )}
              </div>
              <Badge variant="outline" className="gap-1">
                <Eye className="h-3 w-3" />
                Preview
              </Badge>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {previewDocument?.previewContent ? (
                <ReactMarkdown>{previewDocument.previewContent}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">No preview available</p>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {isMobile ? "Double-tap" : "Double-click"} document to open full view
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
              <Button 
                size="sm" 
                className="gap-1 bg-gradient-to-r from-amber-500 to-cyan-500"
                onClick={() => {
                  setIsPreviewOpen(false);
                  if (previewDocument) {
                    handleDoubleClick(previewDocument);
                  }
                }}
              >
                <Pencil className="h-3 w-3" />
                Open Full View
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Brief Dialog - Full/Edit Mode */}
      <Dialog open={isBriefDialogOpen} onOpenChange={setIsBriefDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-amber-500" />
                  AI Project Brief
                  {isPreviewMode ? (
                    <Badge variant="outline" className="gap-1 ml-2">
                      <Eye className="h-3 w-3" />
                      Preview
                    </Badge>
                  ) : (
                    <Badge className="gap-1 ml-2 bg-gradient-to-r from-amber-500 to-cyan-500">
                      <Pencil className="h-3 w-3" />
                      Full View
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {projectName} • Generated from 16 data sources
                </DialogDescription>
              </div>
              {!isPreviewMode && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyBriefToClipboard}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={printBrief}>
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={emailBrief}>
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className={cn("pr-4", isPreviewMode ? "max-h-[40vh]" : "max-h-[60vh]")}>
            {!isPreviewMode && briefMetadata && (
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
                <Badge variant="secondary">
                  📊 {briefMetadata.completionRate}% Complete
                </Badge>
                <Badge variant="secondary">
                  📝 {briefMetadata.taskCount} Tasks
                </Badge>
                <Badge variant="secondary">
                  💰 ${briefMetadata.totalBudget?.toLocaleString()} CAD
                </Badge>
                <Badge variant="secondary">
                  📄 {briefMetadata.documentCount} Docs
                </Badge>
                <Badge variant="secondary">
                  👥 {briefMetadata.teamSize} Team
                </Badge>
              </div>
            )}

            <div className="prose prose-sm dark:prose-invert max-w-none">
              {briefContent ? (
                <ReactMarkdown>
                  {isPreviewMode ? briefContent.substring(0, 800) + "..." : briefContent}
                </ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">No content available</p>
              )}
            </div>
          </ScrollArea>

          {isPreviewMode ? (
            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Showing preview • Click "Open Full View" for complete brief
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsBriefDialogOpen(false)}>
                  Close
                </Button>
                <Button 
                  size="sm" 
                  className="gap-1 bg-gradient-to-r from-amber-500 to-cyan-500"
                  onClick={() => setIsPreviewMode(false)}
                >
                  <Pencil className="h-3 w-3" />
                  Open Full View
                </Button>
              </div>
            </div>
          ) : (
            briefMetadata && (
              <div className="pt-4 border-t text-xs text-muted-foreground text-center">
                Generated {new Date(briefMetadata.generatedAt).toLocaleString()} • BuildUnion AI
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProjectCommandCenter;
