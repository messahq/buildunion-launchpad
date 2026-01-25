import { MapPin, Briefcase, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MemberCardProps {
  member: {
    id: string;
    user_id: string;
    avatar_url?: string;
    company_name?: string;
    primary_trade?: string;
    secondary_trades?: string[];
    availability?: string;
    service_area?: string;
    experience_years?: number;
    is_verified?: boolean;
    is_contractor?: boolean;
  };
  profileName?: string;
}

const tradeLabels: Record<string, string> = {
  general_contractor: "General Contractor",
  electrician: "Electrician",
  plumber: "Plumber",
  carpenter: "Carpenter",
  mason: "Mason",
  roofer: "Roofer",
  hvac_technician: "HVAC Technician",
  painter: "Painter",
  welder: "Welder",
  heavy_equipment_operator: "Heavy Equipment Operator",
  concrete_worker: "Concrete Worker",
  drywall_installer: "Drywall Installer",
  flooring_specialist: "Flooring Specialist",
  landscaper: "Landscaper",
  project_manager: "Project Manager",
  architect: "Architect",
  engineer: "Engineer",
  inspector: "Inspector",
  other: "Other",
};

const availabilityColors: Record<string, string> = {
  available: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  busy: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  unavailable: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export const MemberCard = ({ member, profileName }: MemberCardProps) => {
  const displayName = member.company_name || profileName || "BuildUnion Member";
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const tradeName = member.primary_trade ? tradeLabels[member.primary_trade] || member.primary_trade : "Trade Professional";

  return (
    <Card className="hover:border-amber-200 dark:hover:border-amber-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={member.avatar_url || undefined} />
            <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{displayName}</h3>
              {member.is_verified && (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{tradeName}</p>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {member.availability && (
                <Badge 
                  variant="secondary" 
                  className={availabilityColors[member.availability] || availabilityColors.available}
                >
                  {member.availability}
                </Badge>
              )}
              {member.is_contractor && (
                <Badge variant="outline" className="text-xs">
                  <Briefcase className="h-3 w-3 mr-1" />
                  Contractor
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {member.service_area && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-24">{member.service_area}</span>
                </div>
              )}
              {member.experience_years && member.experience_years > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{member.experience_years}y exp</span>
                </div>
              )}
            </div>

            {member.secondary_trades && member.secondary_trades.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {member.secondary_trades.slice(0, 3).map((trade) => (
                  <Badge key={trade} variant="outline" className="text-[10px] px-1.5 py-0">
                    {tradeLabels[trade] || trade}
                  </Badge>
                ))}
                {member.secondary_trades.length > 3 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    +{member.secondary_trades.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
