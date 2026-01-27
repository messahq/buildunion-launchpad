import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Map, 
  MapPin, 
  ExternalLink,
  AlertTriangle,
  User,
  Navigation
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { ProjectConflict } from "@/hooks/useSingleProjectConflicts";
import { ConflictMarkerLegend } from "./ConflictMarkerLegend";
import { ProBadge } from "@/components/ui/pro-badge";

interface TeamMemberLocation {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  role: string;
  latitude?: number;
  longitude?: number;
  status?: "on_site" | "en_route" | "away";
}

interface TeamMapWidgetProps {
  projectAddress: string;
  projectName: string;
  className?: string;
  conflicts?: ProjectConflict[];
  isPremium?: boolean;
  teamMembers?: TeamMemberLocation[];
}

// Get status color for team member
const getStatusColor = (status?: string) => {
  switch (status) {
    case "on_site":
      return "bg-green-500";
    case "en_route":
      return "bg-blue-500";
    case "away":
      return "bg-slate-400";
    default:
      return "bg-amber-500";
  }
};

const getStatusLabel = (status?: string) => {
  switch (status) {
    case "on_site":
      return "On Site";
    case "en_route":
      return "En Route";
    case "away":
      return "Away";
    default:
      return "Unknown";
  }
};

export default function TeamMapWidget({ 
  projectAddress, 
  projectName,
  className,
  conflicts = [],
  isPremium = false,
  teamMembers = [],
}: TeamMapWidgetProps) {
  const { t } = useTranslation();

  // Create Google Maps URL for the address
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(projectAddress)}`;

  // Count conflicts by severity
  const highCount = conflicts.filter(c => c.severity === "high").length;
  const mediumCount = conflicts.filter(c => c.severity === "medium").length;
  const lowCount = conflicts.filter(c => c.severity === "low").length;
  const hasConflicts = conflicts.length > 0;

  return (
    <Card className={cn("bg-card border-cyan-200 dark:border-cyan-800 overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 border-b border-cyan-100 dark:border-cyan-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <CardTitle className="text-lg font-semibold">
              {t("projects.siteMap", "Project Site")}
            </CardTitle>
            {isPremium && hasConflicts && (
              <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {conflicts.length}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Static map preview - clickable link to Google Maps */}
        <div 
          onClick={() => window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')}
          className="relative rounded-lg overflow-hidden border border-cyan-200 dark:border-cyan-800 h-48 bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 dark:from-cyan-950/30 dark:via-teal-950/30 dark:to-emerald-950/30 hover:border-cyan-400 dark:hover:border-cyan-600 transition-colors cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
            }
          }}
        >
          {/* Decorative map pattern */}
          <div className="absolute inset-0 opacity-20 dark:opacity-10">
            <svg className="w-full h-full" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Grid lines */}
              <path d="M0 50 H400 M0 100 H400 M0 150 H400" stroke="currentColor" strokeWidth="1" className="text-cyan-600"/>
              <path d="M100 0 V200 M200 0 V200 M300 0 V200" stroke="currentColor" strokeWidth="1" className="text-cyan-600"/>
              {/* Curved roads */}
              <path d="M50 180 Q150 100 250 120 T380 80" stroke="currentColor" strokeWidth="3" className="text-teal-500" fill="none"/>
              <path d="M20 60 Q100 120 180 80 T320 140" stroke="currentColor" strokeWidth="2" className="text-cyan-500" fill="none"/>
            </svg>
          </div>

          {/* Center pin with pulse animation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Pulse rings */}
              <div className="absolute inset-0 -m-4">
                <div className="w-16 h-16 rounded-full bg-cyan-500/20 animate-ping" />
              </div>
              <div className="absolute inset-0 -m-2">
                <div className="w-12 h-12 rounded-full bg-cyan-500/30" />
              </div>
              {/* Pin icon */}
              <div className="relative w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <MapPin className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Open in Google Maps overlay */}
          <div className="absolute bottom-3 left-3 right-3 bg-background/95 backdrop-blur-sm border border-cyan-200 dark:border-cyan-800 rounded-lg p-2 group-hover:bg-cyan-50 dark:group-hover:bg-cyan-950/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Navigation className="h-4 w-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                <span className="text-sm text-foreground truncate">{projectAddress}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">{t("common.openMaps", "Open Maps")}</span>
              </div>
            </div>
          </div>

          {/* Locked overlay for non-premium users with conflicts */}
          {!isPremium && hasConflicts && (
            <div className="absolute top-3 left-3 right-3 bg-background/95 backdrop-blur-sm border border-amber-200 dark:border-amber-800 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground flex-1">
                  {conflicts.length} {t("conflicts.detectedUpgrade", "conflicts detected")}
                </span>
                <ProBadge tier="premium" size="sm" />
              </div>
            </div>
          )}
        </div>

        {/* Conflict legend for premium users */}
        {isPremium && hasConflicts && (
          <div className="mt-3">
            <ConflictMarkerLegend
              highCount={highCount}
              mediumCount={mediumCount}
              lowCount={lowCount}
            />
          </div>
        )}

        {/* Team members list */}
        {teamMembers.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{t("projects.teamMembers", "Team Members")}</span>
              <Badge variant="secondary" className="text-xs">{teamMembers.length}</Badge>
            </div>
            <div className="grid gap-2">
              {teamMembers.slice(0, 4).map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
                    <AvatarFallback className="bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs">
                      {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{member.full_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{member.role}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", getStatusColor(member.status))} />
                    <span className="text-xs text-muted-foreground">{getStatusLabel(member.status)}</span>
                  </div>
                </div>
              ))}
              {teamMembers.length > 4 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  +{teamMembers.length - 4} {t("common.more", "more")}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
