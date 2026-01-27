import { useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  FileText,
  Printer,
  Mail,
  Share2,
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
  ExternalLink,
  Brain,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateProjectReport, ProjectReportParams, ConflictData } from "@/lib/pdfGenerator";
import { OperationalTruth } from "@/types/operationalTruth";
import { ProBadge } from "@/components/ui/pro-badge";
import { useTranslation } from "react-i18next";
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
}: ProjectCommandCenterProps) => {
  const { t } = useTranslation();
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [briefContent, setBriefContent] = useState<string | null>(null);
  const [briefMetadata, setBriefMetadata] = useState<any>(null);
  const [isBriefDialogOpen, setIsBriefDialogOpen] = useState(false);
  const [activeDocumentCategory, setActiveDocumentCategory] = useState<string>("all");

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

  // Document Actions
  const documentActions: DocumentAction[] = [
    {
      id: "ai-brief",
      name: "AI Project Brief",
      description: "Comprehensive AI analysis from 16 data sources",
      icon: Brain,
      category: "report",
      isPremium: true,
      action: generateAIBrief,
    },
    {
      id: "full-report",
      name: "Full Project Report",
      description: "8 Pillars + OBC + Conflicts",
      icon: BarChart3,
      category: "report",
      isPremium: true,
      action: generateFullReport,
    },
    {
      id: "quote",
      name: "Quote / Estimate",
      description: "Material & labor cost breakdown",
      icon: FileSpreadsheet,
      category: "financial",
      action: async () => { toast.info("Navigate to Materials tab to generate quotes"); },
    },
    {
      id: "invoice",
      name: "Invoice",
      description: "Client billing document",
      icon: Receipt,
      category: "financial",
      action: async () => { toast.info("Navigate to Materials tab to generate invoices"); },
    },
    {
      id: "contract",
      name: "Contract",
      description: "Legal agreement with client",
      icon: FileSignature,
      category: "legal",
      action: async () => { toast.info("Navigate to Contracts tab to manage contracts"); },
    },
    {
      id: "task-list",
      name: "Task List",
      description: "Exportable task checklist",
      icon: ClipboardList,
      category: "team",
      action: async () => { toast.info("Navigate to Team & Tasks tab to export tasks"); },
    },
    {
      id: "team-report",
      name: "Team Report",
      description: "Member activity & assignments",
      icon: Users,
      category: "team",
      isPremium: true,
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
                  Generate, print, email & share all project documents
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
                <DropdownMenuItem onClick={() => toast.info("Navigate to Materials tab")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Cost Breakdown (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("Navigate to Contracts tab")}>
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

            {/* Document Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => action.action()}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all hover:shadow-md",
                      "bg-white dark:bg-card hover:border-amber-300",
                      action.id === "ai-brief" && "ring-2 ring-amber-300 bg-amber-50/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
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

                    {/* Quick Actions */}
                    <div className="flex gap-1 mt-3">
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
                          toast.info("Email functionality");
                        }}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                    </div>
                  </button>
                );
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

      {/* AI Brief Dialog */}
      <Dialog open={isBriefDialogOpen} onOpenChange={setIsBriefDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-amber-500" />
                  AI Project Brief
                </DialogTitle>
                <DialogDescription>
                  {projectName} • Generated from 16 data sources
                </DialogDescription>
              </div>
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
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {briefMetadata && (
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
                <ReactMarkdown>{briefContent}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">No content available</p>
              )}
            </div>
          </ScrollArea>

          {briefMetadata && (
            <div className="pt-4 border-t text-xs text-muted-foreground text-center">
              Generated {new Date(briefMetadata.generatedAt).toLocaleString()} • BuildUnion AI
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProjectCommandCenter;
