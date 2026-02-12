// ============================================
// CITATION-DRIVEN CANVAS
// ============================================
// Compact panels showing previously entered data
// ============================================

import { forwardRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MapPin, Home, Ruler, Wrench, FileText, Lock, DollarSign, Hammer, Image, FileUp, Calendar, CalendarCheck, Users, UserPlus, Mail, Shield, CloudSun, Receipt, Zap, CheckCircle } from "lucide-react";
import { Citation, CITATION_TYPES } from "@/types/citation";
import { cn } from "@/lib/utils";

interface CitationDrivenCanvasProps {
  citations: Citation[];
  onCitationClick?: (citationId: string) => void;
  highlightedCitationId?: string | null;
  isLoading?: boolean;
  compact?: boolean;
  className?: string;
  onGfaLocked?: boolean;
}

const MiniCitationCard = ({ 
  citation, 
  icon: Icon, 
  label, 
  value, 
  color,
  isHighlighted, 
  onCitationClick 
}: { 
  citation: Citation;
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  isHighlighted?: boolean;
  onCitationClick?: (id: string) => void;
}) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.02 }}
    onClick={() => onCitationClick?.(citation.id)}
    className={cn(
      "w-full text-left p-3 rounded-lg border transition-all",
      "bg-card hover:shadow-md",
      isHighlighted 
        ? "ring-2 ring-amber-500 border-amber-400" 
        : "border-border hover:border-amber-300 dark:hover:border-amber-700"
    )}
  >
    <div className="flex items-center gap-2">
      <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", color)}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
      <span className="text-[9px] font-mono text-muted-foreground/60 shrink-0">
        {citation.id.slice(0, 6)}
      </span>
    </div>
  </motion.button>
);

const CitationDrivenCanvas = forwardRef<HTMLDivElement, CitationDrivenCanvasProps>(
  ({ citations, onCitationClick, highlightedCitationId, isLoading, compact, className }, ref) => {
    
    const organizedCitations = useMemo(() => {
      const knownTypes = [
        CITATION_TYPES.PROJECT_NAME, CITATION_TYPES.LOCATION, 
        CITATION_TYPES.WORK_TYPE, CITATION_TYPES.GFA_LOCK,
        CITATION_TYPES.TRADE_SELECTION, CITATION_TYPES.TEMPLATE_LOCK,
        CITATION_TYPES.TIMELINE, CITATION_TYPES.END_DATE,
        CITATION_TYPES.TEAM_STRUCTURE, CITATION_TYPES.TEAM_MEMBER_INVITE,
        CITATION_TYPES.TEAM_PERMISSION_SET, CITATION_TYPES.EXECUTION_MODE,
        CITATION_TYPES.SITE_CONDITION, CITATION_TYPES.DEMOLITION_PRICE,
        CITATION_TYPES.DNA_FINALIZED, CITATION_TYPES.WEATHER_ALERT,
        CITATION_TYPES.CONTRACT, CITATION_TYPES.BUDGET, CITATION_TYPES.BUDGET_APPROVAL,
        CITATION_TYPES.BLUEPRINT_UPLOAD, CITATION_TYPES.SITE_PHOTO,
        CITATION_TYPES.VISUAL_VERIFICATION, CITATION_TYPES.TEAM_SIZE,
      ] as string[];
      return {
        projectName: citations.find(c => c.cite_type === CITATION_TYPES.PROJECT_NAME),
        location: citations.find(c => c.cite_type === CITATION_TYPES.LOCATION),
        workType: citations.find(c => c.cite_type === CITATION_TYPES.WORK_TYPE),
        gfa: citations.find(c => c.cite_type === CITATION_TYPES.GFA_LOCK),
        trade: citations.find(c => c.cite_type === CITATION_TYPES.TRADE_SELECTION),
        template: citations.find(c => c.cite_type === CITATION_TYPES.TEMPLATE_LOCK),
        timeline: citations.find(c => c.cite_type === CITATION_TYPES.TIMELINE),
        endDate: citations.find(c => c.cite_type === CITATION_TYPES.END_DATE),
        teamMembers: citations.filter(c => c.cite_type === CITATION_TYPES.TEAM_MEMBER_INVITE),
        teamStructure: citations.find(c => c.cite_type === CITATION_TYPES.TEAM_STRUCTURE),
        teamPermissions: citations.find(c => c.cite_type === CITATION_TYPES.TEAM_PERMISSION_SET),
        teamSize: citations.find(c => c.cite_type === CITATION_TYPES.TEAM_SIZE),
        executionMode: citations.find(c => c.cite_type === CITATION_TYPES.EXECUTION_MODE),
        siteCondition: citations.find(c => c.cite_type === CITATION_TYPES.SITE_CONDITION),
        demolitionPrice: citations.find(c => c.cite_type === CITATION_TYPES.DEMOLITION_PRICE),
        dnaFinalized: citations.find(c => c.cite_type === CITATION_TYPES.DNA_FINALIZED),
        weatherAlert: citations.find(c => c.cite_type === CITATION_TYPES.WEATHER_ALERT),
        contract: citations.filter(c => c.cite_type === CITATION_TYPES.CONTRACT),
        budget: citations.find(c => c.cite_type === CITATION_TYPES.BUDGET),
        budgetApproval: citations.find(c => c.cite_type === CITATION_TYPES.BUDGET_APPROVAL),
        blueprints: citations.filter(c => c.cite_type === CITATION_TYPES.BLUEPRINT_UPLOAD),
        sitePhotos: citations.filter(c => c.cite_type === CITATION_TYPES.SITE_PHOTO),
        visualVerification: citations.find(c => c.cite_type === CITATION_TYPES.VISUAL_VERIFICATION),
        others: citations.filter(c => !knownTypes.includes(c.cite_type)),
      };
    }, [citations]);

    const isEmpty = citations.length === 0;

    return (
      <div 
        ref={ref} 
        className={cn(
          "bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/20 overflow-y-auto",
          compact ? "p-2" : "p-4",
          className
        )}
      >
        <AnimatePresence>
          {isEmpty && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center min-h-[200px]"
            >
              <div className="text-center space-y-3">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                >
                  <Sparkles className="h-7 w-7 text-amber-500" />
                </motion.div>
                <p className="text-sm text-muted-foreground">
                  Answer questions to build your project DNA
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && (
          <div className="flex items-center justify-center min-h-[200px]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full"
            />
          </div>
        )}

        {!isEmpty && !isLoading && (
          <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-2")}>
            {organizedCitations.projectName && (
              <MiniCitationCard
                citation={organizedCitations.projectName}
                icon={Home}
                label="Project"
                value={String(organizedCitations.projectName.answer || '—')}
                color="bg-amber-500"
                isHighlighted={highlightedCitationId === organizedCitations.projectName.id}
                onCitationClick={onCitationClick}
              />
            )}

            {organizedCitations.location && (
              <MiniCitationCard
                citation={organizedCitations.location}
                icon={MapPin}
                label="Location"
                value={String(organizedCitations.location.answer || '—')}
                color="bg-red-500"
                isHighlighted={highlightedCitationId === organizedCitations.location.id}
                onCitationClick={onCitationClick}
              />
            )}

            {organizedCitations.workType && (
              <MiniCitationCard
                citation={organizedCitations.workType}
                icon={Wrench}
                label="Work Type"
                value={String(organizedCitations.workType.answer || '—')}
                color="bg-blue-500"
                isHighlighted={highlightedCitationId === organizedCitations.workType.id}
                onCitationClick={onCitationClick}
              />
            )}

            {organizedCitations.gfa && (
              <MiniCitationCard
                citation={organizedCitations.gfa}
                icon={Ruler}
                label="GFA (Locked)"
                value={`${Number(organizedCitations.gfa.metadata?.gfa_value || organizedCitations.gfa.answer || 0).toLocaleString()} sq ft`}
                color="bg-emerald-500"
                isHighlighted={highlightedCitationId === organizedCitations.gfa.id}
                onCitationClick={onCitationClick}
              />
            )}

            {organizedCitations.trade && (
              <MiniCitationCard
                citation={organizedCitations.trade}
                icon={Wrench}
                label="Trade"
                value={String(organizedCitations.trade.answer || '—')}
                color="bg-orange-500"
                isHighlighted={highlightedCitationId === organizedCitations.trade.id}
                onCitationClick={onCitationClick}
              />
            )}

            {organizedCitations.template && (
              <MiniCitationCard
                citation={organizedCitations.template}
                icon={Lock}
                label="Template (Locked)"
                value={organizedCitations.template.value 
                  ? `$${Number(organizedCitations.template.value).toLocaleString()}`
                  : String(organizedCitations.template.answer || '—')}
                color="bg-green-600"
                isHighlighted={highlightedCitationId === organizedCitations.template.id}
                onCitationClick={onCitationClick}
              />
            )}

            {/* Timeline */}
            {organizedCitations.timeline && (
              <MiniCitationCard
                citation={organizedCitations.timeline}
                icon={Calendar}
                label="Start Date"
                value={String(organizedCitations.timeline.answer || '—')}
                color="bg-amber-600"
                isHighlighted={highlightedCitationId === organizedCitations.timeline.id}
                onCitationClick={onCitationClick}
              />
            )}

            {organizedCitations.endDate && (
              <MiniCitationCard
                citation={organizedCitations.endDate}
                icon={CalendarCheck}
                label="End Date"
                value={String(organizedCitations.endDate.answer || '—')}
                color="bg-amber-700"
                isHighlighted={highlightedCitationId === organizedCitations.endDate.id}
                onCitationClick={onCitationClick}
              />
            )}

            {/* Execution Mode */}
            {organizedCitations.executionMode && (
              <MiniCitationCard
                citation={organizedCitations.executionMode}
                icon={Zap}
                label="Execution Mode"
                value={String(organizedCitations.executionMode.answer || '—')}
                color="bg-indigo-500"
                isHighlighted={highlightedCitationId === organizedCitations.executionMode.id}
                onCitationClick={onCitationClick}
              />
            )}

            {/* Site Condition */}
            {organizedCitations.siteCondition && (
              <MiniCitationCard
                citation={organizedCitations.siteCondition}
                icon={Hammer}
                label="Site Condition"
                value={String(organizedCitations.siteCondition.answer || '—')}
                color="bg-orange-500"
                isHighlighted={highlightedCitationId === organizedCitations.siteCondition.id}
                onCitationClick={onCitationClick}
              />
            )}

            {/* Demolition Price */}
            {organizedCitations.demolitionPrice && (
              <MiniCitationCard
                citation={organizedCitations.demolitionPrice}
                icon={DollarSign}
                label="Demolition"
                value={String(organizedCitations.demolitionPrice.answer || '—')}
                color="bg-red-600"
                isHighlighted={highlightedCitationId === organizedCitations.demolitionPrice.id}
                onCitationClick={onCitationClick}
              />
            )}

            {/* Team Size */}
            {organizedCitations.teamSize && (
              <MiniCitationCard
                citation={organizedCitations.teamSize}
                icon={Users}
                label="Team Size"
                value={String(organizedCitations.teamSize.answer || '—')}
                color="bg-sky-500"
                isHighlighted={highlightedCitationId === organizedCitations.teamSize.id}
                onCitationClick={onCitationClick}
              />
            )}

            {/* Team Structure */}
            {organizedCitations.teamStructure && (
              <MiniCitationCard
                citation={organizedCitations.teamStructure}
                icon={Users}
                label="Team Structure"
                value={String(organizedCitations.teamStructure.answer || '—')}
                color="bg-sky-600"
                isHighlighted={highlightedCitationId === organizedCitations.teamStructure.id}
                onCitationClick={onCitationClick}
              />
            )}

            {/* Team Members - each gets individual card */}
            {organizedCitations.teamMembers.map((member) => (
              <MiniCitationCard
                key={member.id}
                citation={member}
                icon={member.answer?.includes('@') ? Mail : UserPlus}
                label={member.answer?.includes('@') ? 'Email Invite' : 'BU Member'}
                value={String(member.answer || '—')}
                color={member.answer?.includes('@') ? 'bg-violet-500' : 'bg-sky-500'}
                isHighlighted={highlightedCitationId === member.id}
                onCitationClick={onCitationClick}
              />
            ))}

            {/* Team Permissions */}
            {organizedCitations.teamPermissions && (
              <MiniCitationCard
                citation={organizedCitations.teamPermissions}
                icon={Shield}
                label="Permissions"
                value={String(organizedCitations.teamPermissions.answer || '—')}
                color="bg-purple-500"
                isHighlighted={highlightedCitationId === organizedCitations.teamPermissions.id}
                onCitationClick={onCitationClick}
              />
            )}

            {/* Blueprints */}
            {organizedCitations.blueprints.map((bp) => (
              <MiniCitationCard
                key={bp.id}
                citation={bp}
                icon={FileUp}
                label="Blueprint"
                value={String(bp.answer || '—')}
                color="bg-cyan-600"
                isHighlighted={highlightedCitationId === bp.id}
                onCitationClick={onCitationClick}
              />
            ))}

            {/* Site Photos */}
            {organizedCitations.sitePhotos.map((sp) => (
              <MiniCitationCard
                key={sp.id}
                citation={sp}
                icon={Image}
                label="Site Photo"
                value={String(sp.answer || '—')}
                color="bg-teal-500"
                isHighlighted={highlightedCitationId === sp.id}
                onCitationClick={onCitationClick}
              />
            ))}

            {/* Visual Verification */}
            {organizedCitations.visualVerification && (
              <MiniCitationCard
                citation={organizedCitations.visualVerification}
                icon={CheckCircle}
                label="Visual Verified"
                value={String(organizedCitations.visualVerification.answer || '—')}
                color="bg-emerald-600"
                isHighlighted={highlightedCitationId === organizedCitations.visualVerification.id}
                onCitationClick={onCitationClick}
              />
            )}

            {/* Weather Alert */}
            {organizedCitations.weatherAlert && (
              <MiniCitationCard
                citation={organizedCitations.weatherAlert}
                icon={CloudSun}
                label="Weather Alert"
                value={String(organizedCitations.weatherAlert.answer || '—')}
                color="bg-yellow-500"
                isHighlighted={highlightedCitationId === organizedCitations.weatherAlert.id}
                onCitationClick={onCitationClick}
              />
            )}

            {/* Contracts */}
            {organizedCitations.contract.map((c) => (
              <MiniCitationCard
                key={c.id}
                citation={c}
                icon={Receipt}
                label="Contract"
                value={String(c.answer || '—')}
                color="bg-slate-600"
                isHighlighted={highlightedCitationId === c.id}
                onCitationClick={onCitationClick}
              />
            ))}

            {/* Budget */}
            {organizedCitations.budget && (
              <MiniCitationCard
                citation={organizedCitations.budget}
                icon={DollarSign}
                label="Budget"
                value={String(organizedCitations.budget.answer || '—')}
                color="bg-green-500"
                isHighlighted={highlightedCitationId === organizedCitations.budget.id}
                onCitationClick={onCitationClick}
              />
            )}

            {/* Budget Approval */}
            {organizedCitations.budgetApproval && (
              <MiniCitationCard
                citation={organizedCitations.budgetApproval}
                icon={CheckCircle}
                label="Budget Approved"
                value={String(organizedCitations.budgetApproval.answer || '—')}
                color="bg-green-700"
                isHighlighted={highlightedCitationId === organizedCitations.budgetApproval.id}
                onCitationClick={onCitationClick}
              />
            )}

            {/* DNA Finalized */}
            {organizedCitations.dnaFinalized && (
              <MiniCitationCard
                citation={organizedCitations.dnaFinalized}
                icon={Lock}
                label="DNA Finalized"
                value={String(organizedCitations.dnaFinalized.answer || '—')}
                color="bg-amber-500"
                isHighlighted={highlightedCitationId === organizedCitations.dnaFinalized.id}
                onCitationClick={onCitationClick}
              />
            )}

            {/* Any remaining unknown types */}
            {organizedCitations.others.map((citation) => (
              <MiniCitationCard
                key={citation.id}
                citation={citation}
                icon={FileText}
                label={citation.cite_type.replace(/_/g, ' ')}
                value={String(citation.answer || '—')}
                color="bg-violet-500"
                isHighlighted={highlightedCitationId === citation.id}
                onCitationClick={onCitationClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

CitationDrivenCanvas.displayName = "CitationDrivenCanvas";

export default CitationDrivenCanvas;