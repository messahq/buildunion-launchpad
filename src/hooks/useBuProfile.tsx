import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export type ConstructionTrade = 
  | 'general_contractor'
  | 'electrician'
  | 'plumber'
  | 'carpenter'
  | 'mason'
  | 'roofer'
  | 'hvac_technician'
  | 'painter'
  | 'welder'
  | 'heavy_equipment_operator'
  | 'concrete_worker'
  | 'drywall_installer'
  | 'flooring_specialist'
  | 'landscaper'
  | 'project_manager'
  | 'architect'
  | 'engineer'
  | 'inspector'
  | 'other';

export type ExperienceLevel = 
  | 'apprentice'
  | 'journeyman'
  | 'master'
  | 'supervisor'
  | 'manager';

export interface BuProfile {
  id: string;
  user_id: string;
  primary_trade: ConstructionTrade | null;
  secondary_trades: ConstructionTrade[];
  experience_level: ExperienceLevel | null;
  experience_years: number;
  certifications: string[];
  phone: string | null;
  company_name: string | null;
  company_website: string | null;
  bio: string | null;
  hourly_rate: number | null;
  availability: string;
  service_area: string | null;
  is_contractor: boolean;
  is_verified: boolean;
  profile_completed: boolean;
  is_union_member: boolean;
  union_name: string | null;
  created_at: string;
  updated_at: string;
}

export const TRADE_LABELS: Record<ConstructionTrade, string> = {
  general_contractor: 'General Contractor',
  electrician: 'Electrician',
  plumber: 'Plumber',
  carpenter: 'Carpenter',
  mason: 'Mason',
  roofer: 'Roofer',
  hvac_technician: 'HVAC Technician',
  painter: 'Painter',
  welder: 'Welder',
  heavy_equipment_operator: 'Heavy Equipment Operator',
  concrete_worker: 'Concrete Worker',
  drywall_installer: 'Drywall Installer',
  flooring_specialist: 'Flooring Specialist',
  landscaper: 'Landscaper',
  project_manager: 'Project Manager',
  architect: 'Architect',
  engineer: 'Engineer',
  inspector: 'Inspector',
  other: 'Other'
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  apprentice: 'Apprentice (0-2 years)',
  journeyman: 'Journeyman (2-5 years)',
  master: 'Master (5-10 years)',
  supervisor: 'Supervisor (10+ years)',
  manager: 'Manager'
};

export const useBuProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<BuProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bu_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data as BuProfile | null);
    } catch (err) {
      console.error('Error fetching BU profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    if (!user) return null;

    try {
      setSaving(true);
      // Use upsert to handle case where profile already exists
      const { data, error } = await supabase
        .from('bu_profiles')
        .upsert({ user_id: user.id }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      setProfile(data as BuProfile);
      return data as BuProfile;
    } catch (err) {
      console.error('Error creating BU profile:', err);
      toast({
        title: "Error",
        description: "Failed to create BuildUnion profile",
        variant: "destructive"
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = async (updates: Partial<BuProfile>) => {
    if (!user || !profile) return false;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('bu_profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setProfile({ ...profile, ...updates });
      toast({
        title: "Saved",
        description: "Your BuildUnion profile has been updated"
      });
      return true;
    } catch (err) {
      console.error('Error updating BU profile:', err);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const ensureProfile = async () => {
    if (profile) return profile;
    return await createProfile();
  };

  return {
    profile,
    loading,
    saving,
    fetchProfile,
    createProfile,
    updateProfile,
    ensureProfile
  };
};
