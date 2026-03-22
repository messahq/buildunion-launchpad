// ============================================
// Site Check-In / Check-Out Hook
// ============================================
// Manages site presence tracking with weather snapshots,
// realtime team check-in visibility, and SITE_PRESENCE citations.
// ============================================

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createCitation, Citation } from "@/types/citation";

interface ActiveTeamCheckin {
  user_id: string;
  full_name: string;
  checked_in_at: string;
  avatar_url?: string | null;
}

interface UseSiteCheckinOptions {
  projectId: string;
  userId: string;
  citations: Citation[];
  setCitations: React.Dispatch<React.SetStateAction<Citation[]>>;
}

interface SiteCheckinState {
  isCheckedIn: boolean;
  isCheckingIn: boolean;
  activeTeamCheckins: ActiveTeamCheckin[];
  handleSiteCheckin: () => Promise<void>;
}

export function useSiteCheckin({ projectId, userId, citations, setCitations }: UseSiteCheckinOptions): SiteCheckinState {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [activeCheckinId, setActiveCheckinId] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [activeTeamCheckins, setActiveTeamCheckins] = useState<ActiveTeamCheckin[]>([]);

  const loadAllCheckins = useCallback(async () => {
    // Own status
    const { data: ownData } = await supabase
      .from('site_checkins')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .is('checked_out_at', null)
      .order('checked_in_at', { ascending: false })
      .limit(1);

    if (ownData && ownData.length > 0) {
      setIsCheckedIn(true);
      setActiveCheckinId(ownData[0].id);
    } else {
      setIsCheckedIn(false);
      setActiveCheckinId(null);
    }

    // All active team check-ins
    const { data: teamData } = await supabase
      .from('site_checkins')
      .select('user_id, checked_in_at')
      .eq('project_id', projectId)
      .is('checked_out_at', null)
      .order('checked_in_at', { ascending: false });

    if (teamData && teamData.length > 0) {
      const userIds = [...new Set(teamData.map(c => c.user_id))];
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);
      const nameMap = new Map(profs?.map(p => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []);
      setActiveTeamCheckins(teamData.map(c => ({
        user_id: c.user_id,
        full_name: nameMap.get(c.user_id)?.full_name || 'Unknown',
        avatar_url: nameMap.get(c.user_id)?.avatar_url || null,
        checked_in_at: c.checked_in_at,
      })));
    } else {
      setActiveTeamCheckins([]);
    }
  }, [projectId, userId]);

  useEffect(() => {
    loadAllCheckins();
    const ch = supabase
      .channel(`team-checkins-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_checkins', filter: `project_id=eq.${projectId}` }, () => {
        loadAllCheckins();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [projectId, userId, loadAllCheckins]);

  const handleSiteCheckin = useCallback(async () => {
    setIsCheckingIn(true);
    try {
      if (isCheckedIn && activeCheckinId) {
        // Check out
        const { error: checkoutError } = await supabase
          .from('site_checkins')
          .update({ checked_out_at: new Date().toISOString() })
          .eq('id', activeCheckinId)
          .eq('user_id', userId);
        if (checkoutError) {
          console.error('Checkout error:', checkoutError);
          toast.error('Failed to check out: ' + checkoutError.message);
          return;
        }
        setIsCheckedIn(false);
        setActiveCheckinId(null);
        toast.success('Checked out from site');
        await loadAllCheckins();
      } else {
        // Check in — fetch weather snapshot
        let weatherSnapshot: Record<string, unknown> = {};
        const locationCit = citations.find(c => c.cite_type === 'LOCATION');
        if (locationCit?.answer) {
          try {
            const { data: weatherRes } = await supabase.functions.invoke('get-weather', {
              body: { location: locationCit.answer, days: 1 },
            });
            if (weatherRes?.current) {
              weatherSnapshot = {
                temp: weatherRes.current.temp,
                description: weatherRes.current.description,
                humidity: weatherRes.current.humidity,
                wind_speed: weatherRes.current.wind_speed,
                timestamp: new Date().toISOString(),
              };
            }
          } catch (e) { console.warn('Weather snapshot failed:', e); }
        }

        const { data: newCheckin, error } = await supabase
          .from('site_checkins')
          .insert([{
            project_id: projectId,
            user_id: userId,
            weather_snapshot: weatherSnapshot as any,
          }])
          .select('id')
          .single();

        if (error) throw error;
        setIsCheckedIn(true);
        setActiveCheckinId(newCheckin.id);

        // Create SITE_PRESENCE citation
        const presenceCitation = createCitation({
          cite_type: 'SITE_PRESENCE',
          question_key: 'site_checkin',
          answer: new Date().toLocaleString(),
          value: newCheckin.id,
          metadata: {
            userId,
            weather: weatherSnapshot,
            action: 'check_in',
          },
        });

        // Read current verified_facts from DB to avoid stale state
        const { data: currentSummary } = await supabase
          .from('project_summaries')
          .select('verified_facts')
          .eq('project_id', projectId)
          .single();

        const currentFacts = Array.isArray(currentSummary?.verified_facts) ? currentSummary.verified_facts : [];
        const updatedFacts = [...currentFacts, presenceCitation];

        await supabase
          .from('project_summaries')
          .update({ verified_facts: updatedFacts as unknown as any })
          .eq('project_id', projectId);

        setCitations(updatedFacts as unknown as Citation[]);

        toast.success('Checked in to site', {
          description: weatherSnapshot.temp ? `${Math.round(weatherSnapshot.temp as number)}° — ${weatherSnapshot.description}` : undefined,
        });
      }
    } catch (err) {
      console.error('Check-in error:', err);
      toast.error('Failed to check in/out');
    } finally {
      setIsCheckingIn(false);
    }
  }, [isCheckedIn, activeCheckinId, projectId, userId, citations, setCitations, loadAllCheckins]);

  return {
    isCheckedIn,
    isCheckingIn,
    activeTeamCheckins,
    handleSiteCheckin,
  };
}
