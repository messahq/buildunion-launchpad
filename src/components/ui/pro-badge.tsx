import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Crown } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProBadgeProps {
  tier?: "pro" | "premium" | "enterprise";
  size?: "sm" | "md";
  className?: string;
  showTooltip?: boolean;
}

export function ProBadge({ 
  tier = "pro", 
  size = "sm", 
  className,
  showTooltip = true 
}: ProBadgeProps) {
  const { t } = useTranslation();
  
  const tierConfig = {
    pro: {
      label: "PRO",
      gradient: "from-emerald-500 to-teal-500",
      description: t("tiers.proDescription", "Unlock advanced AI analysis & team features"),
    },
    premium: {
      label: "PREMIUM",
      gradient: "from-amber-500 to-orange-500",
      description: t("tiers.premiumDescription", "Full access with conflict visualization & priority support"),
    },
    enterprise: {
      label: "ENTERPRISE",
      gradient: "from-purple-500 to-indigo-500",
      description: t("tiers.enterpriseDescription", "Custom solutions for large organizations"),
    },
  };

  const config = tierConfig[tier];
  
  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold text-white rounded-full",
        `bg-gradient-to-r ${config.gradient}`,
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        className
      )}
    >
      <Crown className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {config.label}
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-[200px] text-center"
        >
          <p className="text-sm">{config.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("tiers.clickToUpgrade", "Click to upgrade")}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
