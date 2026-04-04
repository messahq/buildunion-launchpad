// ============================================
// DEFINITION FLOW STAGE - Stage 3 & 4 of Project Wizard
// ============================================
// REFACTORED: All sub-components and logic extracted to definition-flow/
// ============================================

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import CitationDrivenCanvas from "./CitationDrivenCanvas";
import { CITATION_TYPES } from "@/types/citation";
import { cn } from "@/lib/utils";
import { TRADE_OPTIONS } from "./definition-flow/types";
import { useDefinitionFlow } from "./definition-flow/useDefinitionFlow";
import ChatPanel from "./definition-flow/DefinitionChatPanel";
import CanvasPanel from "./definition-flow/DefinitionCanvasPanel";
import VisualUploadCanvasPanel from "./definition-flow/VisualUploadCanvasPanel";

// Re-export types for backward compatibility
export type { TemplateItem, TeamMember, UploadedFile } from "./definition-flow/types";

interface DefinitionFlowStageProps {
  projectId: string;
  userId: string;
  gfaValue: number;
  existingCitations?: import("@/types/citation").Citation[];
  onFlowComplete: (citations: import("@/types/citation").Citation[]) => void;
  onCitationClick?: (citationId: string) => void;
  className?: string;
}

const DefinitionFlowStage = forwardRef<HTMLDivElement, DefinitionFlowStageProps>(
  ({ projectId, userId, gfaValue, existingCitations = [], onFlowComplete, onCitationClick, className }, ref) => {
    const flow = useDefinitionFlow({
      projectId,
      userId,
      gfaValue,
      existingCitations,
      onFlowComplete,
    });

    return (
      <div
        ref={ref}
        className={cn(
          "h-full overflow-hidden flex",
          className
        )}
      >
        {/* LEFT PANEL - Chat (INPUT) */}
        <div className="w-full md:w-[400px] lg:w-[450px] border-r border-amber-200/50 dark:border-amber-800/30 flex flex-col h-full">
          {/* Mobile rotate hint */}
          <div className="md:hidden flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-300 shrink-0">
            <span className="text-base">📱</span>
            <span>Forgasd el a telefont fekvő állásba — a sablon előnézete jobbra jelenik meg!</span>
          </div>
          <ChatPanel
            customTradeName={flow.customTradeName}
            currentSubStep={flow.currentSubStep}
            gfaValue={gfaValue}
            selectedTrade={flow.selectedTrade}
            templateLocked={flow.templateLocked}
            teamSize={flow.teamSize}
            teamMembers={flow.teamMembers}
            siteCondition={flow.siteCondition}
            timeline={flow.timeline}
            scheduledDate={flow.scheduledDate}
            scheduledEndDate={flow.scheduledEndDate}
            demolitionCost={flow.demolitionCost}
            demolitionUnitPrice={flow.demolitionUnitPrice}
            isGeneratingTemplate={flow.isGeneratingTemplate}
            aiTemplateReady={flow.aiTemplateReady}
            stage5Active={flow.stage5Active}
            uploadedFiles={flow.uploadedFiles}
            isUploading={flow.isUploading}
            tradeCitationId={flow.flowCitations.find(c => c.cite_type === CITATION_TYPES.TRADE_SELECTION)?.id}
            teamCitationId={flow.flowCitations.find(c => c.cite_type === CITATION_TYPES.TEAM_SIZE)?.id}
            siteCitationId={flow.flowCitations.find(c => c.cite_type === CITATION_TYPES.SITE_CONDITION)?.id}
            timelineCitationId={flow.flowCitations.find(c => c.cite_type === CITATION_TYPES.TIMELINE)?.id}
            onCitationClick={onCitationClick}
            onTradeSelect={flow.handleTradeSelect}
            onLockTemplate={flow.handleLockTemplate}
            onTeamSizeSelect={flow.handleTeamSizeSelect}
            onTeamMembersChange={flow.handleTeamMembersChange}
            onSiteConditionChange={flow.handleSiteConditionChange}
            onDemolitionUnitPriceChange={flow.handleDemolitionUnitPriceChange}
            onConfirmDemolition={flow.handleConfirmDemolition}
            onTimelineChange={flow.setTimeline}
            onScheduledDateChange={flow.setScheduledDate}
            onScheduledEndDateChange={flow.setScheduledEndDate}
            onFilesDrop={flow.handleFilesDrop}
            onRemoveFile={flow.handleRemoveFile}
            onSkipUpload={flow.handleSkipUpload}
            onConfirmUploads={flow.handleConfirmUploads}
            isSaving={flow.isSaving}
          />
        </div>
        
        {/* RIGHT PANEL - Canvas (OUTPUT) */}
        <div className="hidden md:flex flex-1 flex-col h-full overflow-y-auto">
          {/* CitationDrivenCanvas */}
          <div className={cn(
            "shrink-0", 
            flow.stage5Active
              ? "max-h-[120px] overflow-y-auto border-b border-purple-200/50 dark:border-purple-800/30"
              : (flow.aiTemplateReady && flow.selectedTrade && !flow.templateLocked) 
                ? "max-h-[40%] overflow-y-auto border-b border-amber-200/50 dark:border-amber-800/30" 
                : "flex-1"
          )}>
            <CitationDrivenCanvas
              citations={[...(existingCitations || []), ...flow.flowCitations]}
              onCitationClick={onCitationClick}
              compact={flow.stage5Active || !!flow.scheduledEndDate}
              showObcNotice={flow.templateLocked && !flow.stage5Active && flow.currentSubStep < 5}
            />
          </div>
          
          {/* AI Generating spinner on right panel */}
          {flow.selectedTrade && flow.isGeneratingTemplate && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                >
                  <Sparkles className="h-6 w-6 text-amber-500" />
                </motion.div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">AI is generating your template...</p>
                <p className="text-xs text-muted-foreground">Analyzing {gfaValue.toLocaleString()} sq ft {TRADE_OPTIONS.find(t => t.key === flow.selectedTrade)?.label} project</p>
              </div>
            </div>
          )}
          
          {/* Template Card / Upload Panel */}
          {flow.stage5Active ? (
            <div className="flex-1 min-h-0">
              <VisualUploadCanvasPanel
                gfaValue={gfaValue}
                selectedTrade={flow.selectedTrade || ''}
                grandTotal={flow.grandTotal}
                uploadedFiles={flow.uploadedFiles}
                isUploading={flow.isUploading}
                flowCitations={flow.flowCitations}
                onFilesDrop={flow.handleFilesDrop}
                onRemoveFile={flow.handleRemoveFile}
                onSkipUpload={flow.handleSkipUpload}
                onConfirmUploads={flow.handleConfirmUploads}
              />
            </div>
          ) : (flow.selectedTrade && flow.aiTemplateReady && !flow.templateLocked) ? (
            <div className="flex-1 min-h-0">
              <CanvasPanel
                currentSubStep={flow.currentSubStep}
                selectedTrade={flow.selectedTrade}
                teamSize={flow.teamSize}
                siteCondition={flow.siteCondition}
                gfaValue={gfaValue}
                templateItems={flow.templateItems}
                materialTotal={flow.materialTotal}
                laborTotal={flow.laborTotal}
                demolitionCost={flow.demolitionCost}
                demolitionUnitPrice={flow.demolitionUnitPrice}
                subtotal={flow.subtotal}
                markupPercent={flow.markupPercent}
                markupAmount={flow.markupAmount}
                taxAmount={flow.taxAmount}
                grandTotal={flow.grandTotal}
                editingItem={flow.editingItem}
                wastePercent={flow.wastePercent}
                onWastePercentChange={flow.handleWastePercentChange}
                onMarkupPercentChange={flow.handleMarkupPercentChange}
                onDemolitionUnitPriceChange={flow.handleDemolitionUnitPriceChange}
                onUpdateItem={flow.handleUpdateItem}
                onDeleteItem={flow.handleDeleteItem}
                onAddItem={flow.handleAddItem}
                onSetEditingItem={flow.setEditingItem}
                onLockTemplate={flow.handleLockTemplate}
                isSaving={flow.isSaving}
                templateLocked={flow.templateLocked}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }
);

DefinitionFlowStage.displayName = 'DefinitionFlowStage';

export default DefinitionFlowStage;
