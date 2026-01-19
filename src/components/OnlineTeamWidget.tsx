import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  Wifi, 
  WifiOff,
  Crown,
  Loader2,
  UserCheck,
  Building2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface TeamMemberOnline {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  companyName: string | null;
  primaryTrade: string | null;
  projectName?: string;
}

const OnlineTeamWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const { onlineUsers, onlineCount, isConnected } = useOnlinePresence();
  const [teamMembers, setTeamMembers] = useState<TeamMemberOnline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has premium access (Pro, Premium, or Enterprise)
  const hasPremiumAccess = subscription.tier !== "free";

  useEffect(() => {
    if (user && hasPremiumAccess) {
      fetchTeamMembers();
    } else {
      setIsLoading(false);
    }
  }, [user, hasPremiumAccess]);

  const fetchTeamMembers = async () => {
    if (!user) return;

    try {
      // Get projects where user is owner
      const { data: ownedProjects } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user.id);

      if (!ownedProjects || ownedProjects.length === 0) {
        setTeamMembers([]);
        setIsLoading(false);
        return;
      }

      const projectIds = ownedProjects.map(p => p.id);
      const projectMap = Object.fromEntries(ownedProjects.map(p => [p.id, p.name]));

      // Get team members from those projects
      const { data: members } = await supabase
        .from("project_members")
        .select("user_id, project_id")
        .in("project_id", projectIds);

      if (!members || members.length === 0) {
        setTeamMembers([]);
        setIsLoading(false);
        return;
      }

      // Get unique user IDs
      const memberUserIds = [...new Set(members.map(m => m.user_id))];

      // Fetch their profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", memberUserIds);

      const { data: buProfiles } = await supabase
        .from("bu_profiles")
        .select("user_id, company_name, primary_trade, avatar_url")
        .in("user_id", memberUserIds);

      // Combine data
      const teamData: TeamMemberOnline[] = memberUserIds.map(userId => {
        const profile = profiles?.find(p => p.user_id === userId);
        const buProfile = buProfiles?.find(bp => bp.user_id === userId);
        const memberProject = members.find(m => m.user_id === userId);

        return {
          id: userId,
          fullName: profile?.full_name || "Team Member",
          avatarUrl: buProfile?.avatar_url || profile?.avatar_url || null,
          companyName: buProfile?.company_name || null,
          primaryTrade: buProfile?.primary_trade?.replace(/_/g, " ") || null,
          projectName: memberProject ? projectMap[memberProject.project_id] : undefined,
        };
      });

      setTeamMembers(teamData);
    } catch (err) {
      console.error("Error fetching team members:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter online team members
  const onlineTeamMembers = teamMembers.filter(member =>
    onlineUsers.some(online => online.id === member.id)
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTrade = (trade: string | null) => {
    if (!trade) return null;
    return trade
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Locked state for free users
  if (!hasPremiumAccess) {
    return (
      <Card className="bg-white border-slate-200 overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-slate-100 to-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-400" />
              <CardTitle className="text-lg font-semibold text-slate-400">
                Online Team
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              <Crown className="h-3 w-3 mr-1" />
              Pro+
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
              <Crown className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-2">Premium Feature</h3>
            <p className="text-sm text-slate-500 mb-4">
              See which team members are online in real-time
            </p>
            <Button 
              onClick={() => navigate("/buildunion/pricing")}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              Upgrade to Pro
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Users className="h-5 w-5 text-green-600" />
              {isConnected && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <CardTitle className="text-lg font-semibold text-slate-800">
              Online Team
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                <Wifi className="h-3 w-3" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500 gap-1">
                <WifiOff className="h-3 w-3" />
                Connecting...
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Online Count Banner */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {onlineTeamMembers.slice(0, 3).map((member, idx) => (
                  <Avatar key={member.id} className="w-6 h-6 border-2 border-white">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                      {getInitials(member.fullName)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {onlineTeamMembers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center">
                    <span className="text-xs text-slate-600">+{onlineTeamMembers.length - 3}</span>
                  </div>
                )}
              </div>
              <span className="text-sm text-slate-600">
                <span className="font-semibold text-green-600">{onlineTeamMembers.length}</span>
                {" "}of {teamMembers.length} online
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {onlineCount} total users
            </Badge>
          </div>
        </div>

        {/* Online Members List */}
        {teamMembers.length === 0 ? (
          <div className="text-center py-8 px-4">
            <UserCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No team members yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Invite team members to your projects
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="divide-y divide-slate-100">
              {teamMembers.map(member => {
                const isOnline = onlineUsers.some(u => u.id === member.id);
                
                return (
                  <div 
                    key={member.id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.avatarUrl || undefined} />
                        <AvatarFallback className={isOnline ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>
                          {getInitials(member.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span 
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          isOnline ? "bg-green-500" : "bg-slate-300"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {member.fullName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {member.companyName && (
                          <span className="flex items-center gap-1 truncate">
                            <Building2 className="h-3 w-3" />
                            {member.companyName}
                          </span>
                        )}
                        {member.primaryTrade && !member.companyName && (
                          <span className="truncate">{formatTrade(member.primaryTrade)}</span>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs shrink-0 ${
                        isOnline 
                          ? "bg-green-50 text-green-700 border-green-200" 
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      {isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default OnlineTeamWidget;
