import { useState, useEffect } from "react";
import { Search, Filter, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MemberCard } from "./MemberCard";
import { MemberDetailDialog } from "./MemberDetailDialog";
import { toast } from "sonner";

// Public member data - excludes sensitive fields like phone, location, hourly_rate
interface PublicMember {
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
  bio?: string;
  certifications?: string[];
  experience_level?: string;
  created_at?: string;
}

const trades = [
  { value: "all", label: "All Trades" },
  { value: "general_contractor", label: "General Contractor" },
  { value: "electrician", label: "Electrician" },
  { value: "plumber", label: "Plumber" },
  { value: "carpenter", label: "Carpenter" },
  { value: "mason", label: "Mason" },
  { value: "roofer", label: "Roofer" },
  { value: "hvac_technician", label: "HVAC Technician" },
  { value: "painter", label: "Painter" },
  { value: "welder", label: "Welder" },
  { value: "heavy_equipment_operator", label: "Heavy Equipment Operator" },
  { value: "concrete_worker", label: "Concrete Worker" },
  { value: "drywall_installer", label: "Drywall Installer" },
  { value: "flooring_specialist", label: "Flooring Specialist" },
  { value: "landscaper", label: "Landscaper" },
  { value: "project_manager", label: "Project Manager" },
];

const availabilityOptions = [
  { value: "all", label: "Any Availability" },
  { value: "available", label: "Available" },
  { value: "busy", label: "Busy" },
];

export const MemberDirectory = () => {
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrade, setSelectedTrade] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [showContractorsOnly, setShowContractorsOnly] = useState(false);
  const [isPublicProfile, setIsPublicProfile] = useState(false);
  const [selectedMember, setSelectedMember] = useState<PublicMember | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      // Use secure RPC function that only returns safe public profile data
      const { data, error } = await supabase.rpc("get_public_profiles", {
        trade_filter: selectedTrade !== "all" ? selectedTrade : null,
        availability_filter: selectedAvailability !== "all" ? selectedAvailability : null,
        contractors_only: showContractorsOnly,
        search_query: searchQuery.trim() || null,
        result_limit: 50,
      });

      if (error) throw error;

      // Cast data to PublicMember array
      const membersData = (data as unknown as PublicMember[]) || [];

      // Fetch names from profiles table
      const userIds = membersData.map(m => m.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        const namesMap: Record<string, string> = {};
        profiles?.forEach(p => {
          if (p.full_name) {
            namesMap[p.user_id] = p.full_name;
          }
        });
        setProfileNames(namesMap);
      } else {
        setProfileNames({});
      }

      setMembers(membersData);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkUserPublicStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("bu_profiles")
      .select("is_public_profile")
      .eq("user_id", user.id)
      .maybeSingle();

    setIsPublicProfile(data?.is_public_profile || false);
  };

  const togglePublicProfile = async () => {
    if (!user) {
      toast.error("Please log in to update your profile visibility");
      return;
    }

    try {
      const { error } = await supabase
        .from("bu_profiles")
        .update({ is_public_profile: !isPublicProfile })
        .eq("user_id", user.id);

      if (error) throw error;

      setIsPublicProfile(!isPublicProfile);
      toast.success(isPublicProfile ? "Profile hidden from directory" : "Profile now visible in directory");
      fetchMembers();
    } catch (error) {
      console.error("Error updating profile visibility:", error);
      toast.error("Failed to update profile visibility");
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [selectedTrade, selectedAvailability, showContractorsOnly]);

  useEffect(() => {
    checkUserPublicStatus();
  }, [user]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchMembers();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Member Directory</h2>
          <p className="text-sm text-muted-foreground">
            Find and connect with construction professionals
          </p>
        </div>
        {user && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Switch
              id="public-profile"
              checked={isPublicProfile}
              onCheckedChange={togglePublicProfile}
            />
            <Label htmlFor="public-profile" className="text-sm cursor-pointer">
              Show me in directory
            </Label>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedTrade} onValueChange={setSelectedTrade}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {trades.map((trade) => (
              <SelectItem key={trade.value} value={trade.value}>
                {trade.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedAvailability} onValueChange={setSelectedAvailability}>
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availabilityOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showContractorsOnly ? "default" : "outline"}
          onClick={() => setShowContractorsOnly(!showContractorsOnly)}
          className="whitespace-nowrap"
        >
          Contractors Only
        </Button>
      </div>

      {/* Members Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No members found</p>
          <p className="text-sm">
            {user 
              ? "Try adjusting your filters or toggle your profile to be visible"
              : "Log in and complete your profile to appear in the directory"
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              profileName={profileNames[member.user_id]}
              onClick={() => {
                setSelectedMember(member);
                setDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <MemberDetailDialog
        member={selectedMember}
        profileName={selectedMember ? profileNames[selectedMember.user_id] : undefined}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};
