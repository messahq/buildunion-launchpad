import { ReactNode } from "react";
import { ProjectPermissions, ProjectRole, ROLE_LABELS } from "@/hooks/useProjectPermissions";
import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PermissionGateProps {
  permissions: ProjectPermissions;
  required: keyof Omit<ProjectPermissions, "isOwner" | "role">;
  children: ReactNode;
  fallback?: ReactNode;
  showLockIcon?: boolean;
  tooltipText?: string;
}

/**
 * Gates content based on user permissions
 * Shows children if user has required permission, otherwise shows fallback or lock
 */
export function PermissionGate({
  permissions,
  required,
  children,
  fallback,
  showLockIcon = true,
  tooltipText,
}: PermissionGateProps) {
  const hasPermission = permissions[required];

  if (hasPermission) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showLockIcon) {
    const defaultTooltip = `This action requires ${formatPermissionName(required)} permission`;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-muted-foreground cursor-not-allowed opacity-50">
            <Lock className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText || defaultTooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return null;
}

interface PermissionButtonProps {
  permissions: ProjectPermissions;
  required: keyof Omit<ProjectPermissions, "isOwner" | "role">;
  children: ReactNode;
  className?: string;
  disabledClassName?: string;
}

/**
 * Wraps a button and disables it if user lacks permission
 */
export function PermissionButton({
  permissions,
  required,
  children,
  className,
  disabledClassName = "opacity-50 cursor-not-allowed",
}: PermissionButtonProps) {
  const hasPermission = permissions[required];

  if (!hasPermission) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(className, disabledClassName, "pointer-events-none")}>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Insufficient permissions
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <>{children}</>;
}

interface RoleBadgeProps {
  role: ProjectRole;
  size?: "sm" | "md";
  showIcon?: boolean;
}

/**
 * Displays a colored badge for the user's role
 */
export function RoleBadge({ role, size = "sm", showIcon = true }: RoleBadgeProps) {
  const roleInfo = ROLE_LABELS[role];
  
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        roleInfo.color,
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
        "bg-current/10"
      )}
    >
      {showIcon && <span>{roleInfo.icon}</span>}
      <span>{roleInfo.label}</span>
    </span>
  );
}

// Helper to format permission names for display
function formatPermissionName(permission: string): string {
  return permission
    .replace(/^can/, "")
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();
}
