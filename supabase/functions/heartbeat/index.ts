import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // 1. Heartbeat: insert a notification log entry
    const { error: insertError } = await supabase
      .from('notification_logs')
      .insert({
        user_id: 'c1638795-efab-4a23-a8c8-612acdcf7822',
        title: '💓 BuildUnion Heartbeat',
        body: `Keep-alive ping at ${new Date().toISOString()}`,
        status: 'heartbeat',
      });

    if (insertError) {
      console.error('Heartbeat insert error:', insertError);
    }

    // 2. Cleanup old heartbeat entries (keep last 10)
    const { data: heartbeats } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('status', 'heartbeat')
      .order('sent_at', { ascending: false });

    if (heartbeats && heartbeats.length > 10) {
      const idsToDelete = heartbeats.slice(10).map((h: any) => h.id);
      await supabase
        .from('notification_logs')
        .delete()
        .in('id', idsToDelete);
    }

    // 3. Simple read to touch key tables
    const { count: projectCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true });

    const { count: profileCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    const result = {
      status: 'alive',
      timestamp: new Date().toISOString(),
      stats: {
        projects: projectCount ?? 0,
        profiles: profileCount ?? 0,
      },
    };

    console.log('[HEARTBEAT]', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[HEARTBEAT] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
