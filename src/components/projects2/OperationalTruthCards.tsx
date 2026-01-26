import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Ruler, 
  Package, 
  FileText, 
  Shield, 
  AlertTriangle, 
  Users, 
  Gauge, 
  Brain,
  CheckCircle2,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OperationalTruth } from "@/types/operationalTruth";
import { useTranslation } from "react-i18next";

interface OperationalTruthCardsProps {
  operationalTruth: OperationalTruth;
}

interface PillarCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: "verified" | "pending" | "warning";
  iconColor?: string;
}

const PillarCard = ({ icon, label, value, status, iconColor }: PillarCardProps) => (
  <Card className={cn(
    "transition-colors",
    status === "verified" && "border-green-500/50 bg-green-500/5",
    status === "warning" && "border-amber-500/50 bg-amber-500/5",
    status === "pending" && "border-muted"
  )}>
    <CardContent className="p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={cn(
          "transition-colors",
          iconColor || (
            status === "verified" ? "text-green-600 dark:text-green-400" : 
            status === "warning" ? "text-amber-600 dark:text-amber-400" :
            "text-muted-foreground"
          )
        )}>
          {icon}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {status === "verified" ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
        ) : status === "warning" ? (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
        )}
        <span className={cn(
          "text-sm font-medium truncate",
          status !== "pending" ? "text-foreground" : "text-muted-foreground"
        )}>
          {value}
        </span>
      </div>
    </CardContent>
  </Card>
);

export default function OperationalTruthCards({ operationalTruth }: OperationalTruthCardsProps) {
  const { t } = useTranslation();
  
  const {
    confirmedArea,
    areaUnit,
    materialsCount,
    blueprintStatus,
    obcCompliance,
    conflictStatus,
    projectMode,
    projectSize,
    confidenceLevel,
    verificationRate,
  } = operationalTruth;

  return (
    <div className="space-y-4">
      {/* Verification Progress */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
        <Brain className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{t("operationalTruth.title")}</span>
            <span className="text-sm text-muted-foreground">{verificationRate}%</span>
          </div>
          <Progress value={verificationRate} className="h-2" />
        </div>
      </div>

      {/* 8 Pillars Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Pillar 1: Confirmed Area */}
        <PillarCard
          icon={<Ruler className="h-4 w-4" />}
          label={t("operationalTruth.confirmedArea")}
          value={confirmedArea ? `${confirmedArea.toLocaleString()} ${areaUnit}` : t("operationalTruth.pending")}
          status={confirmedArea ? "verified" : "pending"}
        />

        {/* Pillar 2: Materials Count */}
        <PillarCard
          icon={<Package className="h-4 w-4" />}
          label={t("operationalTruth.materials")}
          value={materialsCount > 0 ? `${materialsCount} ${t("operationalTruth.items")}` : t("operationalTruth.noneDetected")}
          status={materialsCount > 0 ? "verified" : "pending"}
        />

        {/* Pillar 3: Blueprint Status */}
        <PillarCard
          icon={<FileText className="h-4 w-4" />}
          label={t("operationalTruth.blueprint")}
          value={blueprintStatus === "analyzed" ? t("operationalTruth.analyzed") : blueprintStatus === "none" ? t("operationalTruth.notProvided") : t("operationalTruth.pending")}
          status={blueprintStatus === "analyzed" ? "verified" : blueprintStatus === "none" ? "warning" : "pending"}
        />

        {/* Pillar 4: OBC Compliance */}
        <PillarCard
          icon={<Shield className="h-4 w-4" />}
          label={t("operationalTruth.obcStatus")}
          value={obcCompliance === "clear" ? t("operationalTruth.clear") : obcCompliance === "permit_required" ? t("operationalTruth.permitRequired") : t("operationalTruth.pending")}
          status={obcCompliance === "clear" ? "verified" : obcCompliance === "permit_required" ? "warning" : "pending"}
        />

        {/* Pillar 5: Conflict Status */}
        <PillarCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label={t("operationalTruth.conflictCheck")}
          value={conflictStatus === "aligned" ? t("operationalTruth.aligned") : conflictStatus === "conflict_detected" ? t("operationalTruth.conflicts") : t("operationalTruth.pending")}
          status={conflictStatus === "aligned" ? "verified" : conflictStatus === "conflict_detected" ? "warning" : "pending"}
        />

        {/* Pillar 6: Project Mode */}
        <PillarCard
          icon={<Users className="h-4 w-4" />}
          label={t("operationalTruth.projectMode")}
          value={projectMode === "team" ? t("projects.teamMode") : t("projects.soloMode")}
          status="verified"
          iconColor={projectMode === "team" ? "text-cyan-500" : "text-amber-500"}
        />

        {/* Pillar 7: Project Size */}
        <PillarCard
          icon={<Gauge className="h-4 w-4" />}
          label={t("operationalTruth.projectSize")}
          value={t(`operationalTruth.${projectSize}`)}
          status="verified"
        />

        {/* Pillar 8: Confidence Level */}
        <PillarCard
          icon={<Brain className="h-4 w-4" />}
          label={t("operationalTruth.aiConfidence")}
          value={t(`operationalTruth.${confidenceLevel}`)}
          status={confidenceLevel === "high" ? "verified" : confidenceLevel === "medium" ? "verified" : "warning"}
        />
      </div>
    </div>
  );
}
