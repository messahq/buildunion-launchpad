// ============================================
// DASHBOARD BUDGET SECTION
// Financial overview with citation badges
// Synced from Page 2 via ProjectContext
// ============================================

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign,
  Package,
  Hammer,
  MoreHorizontal,
  Sparkles,
  FileText,
  Calculator,
  LayoutTemplate,
  Pencil,
  AlertTriangle,
  Check,
  Lock,
  FileCheck,
  Plus,
  Percent,
  Users,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useDashboardFinancialSync, MaterialWithCitation } from "@/hooks/useDashboardFinancialSync";
import { MaterialQuickEditDialog } from "./MaterialQuickEditDialog";
import { CitationSource } from "@/contexts/ProjectContext.types";
import BudgetSyncIndicator from "./BudgetSyncIndicator";

interface Task {
  id: string;
  total_cost?: number;
  unit_price?: number;
  quantity?: number;
}

interface DashboardBudgetSectionProps {
  currency?: string;
  onFinalizeProject?: () => Promise<void>;
  projectMode?: "solo" | "team";
  markupPercent?: number;
  onMarkupChange?: (percent: number) => void;
  tasks?: Task[];
  onAllocateBudget?: () => void;
}

// Icon map for citation sources
const CITATION_ICONS: Record<CitationSource, React.ReactNode> = {
  ai_photo: <Sparkles className="w-3 h-3" />,
  ai_blueprint: <FileText className="w-3 h-3" />,
  template_preset: <LayoutTemplate className="w-3 h-3" />,
  manual_override: <Pencil className="w-3 h-3" />,
  calculator: <Calculator className="w-3 h-3" />,
  imported: <FileText className="w-3 h-3" />,
};

export function DashboardBudgetSection({
  currency = "CAD",
  onFinalizeProject,
  projectMode = "solo",
  markupPercent = 0,
  onMarkupChange,
  tasks = [],
  onAllocateBudget,
}: DashboardBudgetSectionProps) {
  const { t } = useTranslation();
  const {
    financialSummary,
    materialsWithCitations,
    materialCount,
    updateMaterialFromDashboard,
    removeMaterialFromDashboard,
    finalizeProject,
    citationStats,
    isDraft,
    hasManualOverrides,
    getCitationBadge,
  } = useDashboardFinancialSync();

  const [selectedMaterial, setSelectedMaterial] = useState<MaterialWithCitation | null>(null);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [localMarkup, setLocalMarkup] = useState(markupPercent);

  const isTeamMode = projectMode === "team";

  // Calculate markup amount (Team mode only)
  const markupAmount = isTeamMode ? financialSummary.subtotal * (localMarkup / 100) : 0;
  
  // PRIORITY: Use approvedGrandTotal from ai_workflow_config if available (after owner approval)
  // Otherwise use calculated grandTotal
  const effectiveGrandTotal = financialSummary.approvedGrandTotal || financialSummary.grandTotal;
  const grandTotalWithMarkup = effectiveGrandTotal + markupAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleCitationClick = (material: MaterialWithCitation) => {
    setSelectedMaterial(material);
    setIsQuickEditOpen(true);
  };

  const handleQuickEditSave = (
    materialId: string,
    field: "quantity" | "unitPrice" | "item",
    newValue: string | number
  ) => {
    updateMaterialFromDashboard(materialId, field, newValue);
  };

  const handleMarkupChange = (value: number[]) => {
    setLocalMarkup(value[0]);
    onMarkupChange?.(value[0]);
  };

  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      await finalizeProject();
      if (onFinalizeProject) {
        await onFinalizeProject();
      }
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <>
      <Card className="border-amber-200/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-amber-500" />
              {t("dashboard.budget.title", "Budget Overview")}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Mode Indicator Badge */}
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  isTeamMode 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}
              >
                {isTeamMode ? <Users className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                {isTeamMode ? t("dashboard.budget.teamMode", "TEAM") : t("dashboard.budget.soloMode", "SOLO")}
              </Badge>
              {/* Draft Status Badge */}
              {isDraft ? (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 animate-pulse">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t("dashboard.budget.draft", "DRAFT")}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Lock className="w-3 h-3 mr-1" />
                  {t("dashboard.budget.finalized", "FINALIZED")}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Citation Stats Summary */}
          {citationStats.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-3 border-b">
              <span className="text-xs text-muted-foreground mr-2">
                {t("dashboard.budget.sources", "Data Sources")}:
              </span>
              {citationStats.map(({ source, count, label, className }) => (
                <Badge
                  key={source}
                  variant="outline"
                  className={cn("text-xs gap-1", className)}
                >
                  {CITATION_ICONS[source]}
                  {label}: {count}
                </Badge>
              ))}
            </div>
          )}

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-xs font-medium">{t("dashboard.budget.materials", "Materials")}</span>
              </div>
              <p className="text-lg font-bold text-blue-700">
                {formatCurrency(financialSummary.materialCost)}
              </p>
              <p className="text-xs text-blue-500">{materialCount} {t("dashboard.budget.items", "items")}</p>
            </div>

            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Hammer className="w-4 h-4" />
                <span className="text-xs font-medium">{t("dashboard.budget.labor", "Labor")}</span>
              </div>
              <p className="text-lg font-bold text-green-700">
                {formatCurrency(financialSummary.laborCost)}
              </p>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <MoreHorizontal className="w-4 h-4" />
                <span className="text-xs font-medium">{t("dashboard.budget.other", "Other")}</span>
              </div>
              <p className="text-lg font-bold text-purple-700">
                {formatCurrency(financialSummary.otherCost)}
              </p>
            </div>
          </div>

          {/* Grand Total */}
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-amber-700">{t("dashboard.budget.grandTotal", "Grand Total")} (incl. {(financialSummary.taxRate * 100).toFixed(0)}% tax)</p>
                <p className="text-xs text-amber-500 mt-1">
                  {t("dashboard.budget.subtotal", "Subtotal")}: {formatCurrency(financialSummary.subtotal)} + {t("dashboard.budget.tax", "Tax")}: {formatCurrency(financialSummary.taxAmount)}
                  {isTeamMode && localMarkup > 0 && (
                    <> + {t("dashboard.budget.markup", "Markup")}: {formatCurrency(markupAmount)}</>
                  )}
                  {financialSummary.approvedGrandTotal && (
                    <span className="ml-2 text-emerald-600 font-medium">
                      [Approved]
                    </span>
                  )}
                </p>
              </div>
              <p className="text-2xl font-bold text-amber-700">
                {formatCurrency(isTeamMode ? grandTotalWithMarkup : effectiveGrandTotal)}
              </p>
            </div>
          </div>

          {/* Budget Sync Indicator - Show in Team Mode when there are tasks */}
          {isTeamMode && tasks.length > 0 && effectiveGrandTotal > 0 && (
            <BudgetSyncIndicator
              approvedBudget={effectiveGrandTotal}
              tasks={tasks}
              onAllocateClick={onAllocateBudget}
              compact={false}
            />
          )}

          {/* Team Markup Engine - Only visible in Team Mode */}
          {isTeamMode && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-emerald-600" />
                <Label className="text-sm font-medium text-emerald-700">
                  {t("dashboard.budget.teamMarkup", "Team Profit Markup")}
                </Label>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                  <Percent className="w-3 h-3 mr-1" />
                  {localMarkup}%
                </Badge>
              </div>
              <Slider
                value={[localMarkup]}
                onValueChange={handleMarkupChange}
                max={50}
                step={1}
                className="[&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:border-emerald-600"
              />
              <div className="flex justify-between text-xs text-emerald-600 mt-2">
                <span>{t("dashboard.budget.noMarkup", "0% (Net)")}</span>
                <span className="font-medium">
                  +{formatCurrency(markupAmount)} {t("dashboard.budget.profit", "profit")}
                </span>
                <span>50% max</span>
              </div>
            </div>
          )}

          <Separator />

          {/* Materials List with Citation Badges */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                {t("dashboard.budget.materialsList", "Materials")} ({materialCount})
              </h4>
              {hasManualOverrides && (
                <Badge className="bg-amber-500 text-white text-xs animate-pulse">
                  [MANUAL-OVERRIDE]
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-2">
                {materialsWithCitations.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between p-2 bg-background rounded-lg border border-border hover:border-amber-200 transition-colors group"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm truncate flex-1">{material.item}</span>
                      
                      {/* Clickable Citation Badge */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs gap-1 cursor-pointer hover:opacity-80 transition-opacity",
                                material.citationBadge.className
                              )}
                              onClick={() => handleCitationClick(material)}
                            >
                              {CITATION_ICONS[material.citationSource]}
                              {material.citationBadge.shortLabel}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("dashboard.budget.clickToEdit", "Click to edit")} • {material.citationBadge.label}</p>
                            {material.citationId && <p className="text-xs opacity-70">{material.citationId}</p>}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {material.quantity} {material.unit}
                      </Badge>
                      <span className="text-sm font-medium w-20 text-right">
                        {formatCurrency(material.totalPrice || 0)}
                      </span>
                    </div>
                  </div>
                ))}

                {materialsWithCitations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{t("dashboard.budget.noMaterials", "No materials yet")}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Finalize Button */}
          {isDraft && (
            <Button
              onClick={handleFinalize}
              disabled={isFinalizing}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {isFinalizing ? (
                <>
                  <Check className="w-4 h-4 mr-2 animate-spin" />
                  {t("dashboard.budget.finalizing", "Finalizing...")}
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4 mr-2" />
                  {t("dashboard.budget.finalizeProject", "Finalize Project")}
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quick Edit Dialog */}
      <MaterialQuickEditDialog
        isOpen={isQuickEditOpen}
        onClose={() => {
          setIsQuickEditOpen(false);
          setSelectedMaterial(null);
        }}
        material={selectedMaterial}
        onSave={handleQuickEditSave}
        onDelete={removeMaterialFromDashboard}
        isDraft={isDraft}
      />
    </>
  );
}

export default DashboardBudgetSection;
