import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action") || "view"; // view, sign

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing contract token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch contract by share_token
    const { data: contract, error: fetchError } = await supabase
      .from("contracts")
      .select("*")
      .eq("share_token", token)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching contract:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch contract" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!contract) {
      return new Response(
        JSON.stringify({ error: "Contract not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Log the view/action event
    await supabase.from("contract_events").insert({
      contract_id: contract.id,
      event_type: action === "sign" ? "signed" : "viewed",
      event_data: { action },
      ip_address: clientIp.split(",")[0].trim(),
      user_agent: userAgent.substring(0, 500),
    });

    // Update contract with first view timestamp if not already set
    if (!contract.client_viewed_at) {
      await supabase
        .from("contracts")
        .update({ client_viewed_at: new Date().toISOString() })
        .eq("id", contract.id);
    }

    // Handle signature action
    if (action === "sign" && req.method === "POST") {
      const body = await req.json();
      const { signature } = body;

      if (!signature) {
        return new Response(
          JSON.stringify({ error: "Signature data required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update contract with client signature
      const { error: signError } = await supabase
        .from("contracts")
        .update({
          client_signature: signature,
          client_signed_at: new Date().toISOString(),
          status: contract.contractor_signature ? "signed" : "pending_contractor",
        })
        .eq("id", contract.id);

      if (signError) {
        console.error("Error saving signature:", signError);
        return new Response(
          JSON.stringify({ error: "Failed to save signature" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log signature event
      await supabase.from("contract_events").insert({
        contract_id: contract.id,
        event_type: "signed",
        event_data: { signedBy: "client", timestamp: new Date().toISOString() },
        ip_address: clientIp.split(",")[0].trim(),
        user_agent: userAgent.substring(0, 500),
      });

      return new Response(
        JSON.stringify({ success: true, message: "Contract signed successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return contract data for viewing (exclude sensitive owner info)
    return new Response(
      JSON.stringify({
        contract: {
          id: contract.id,
          contract_number: contract.contract_number,
          contract_date: contract.contract_date,
          contractor_name: contract.contractor_name,
          contractor_address: contract.contractor_address,
          contractor_phone: contract.contractor_phone,
          contractor_email: contract.contractor_email,
          contractor_license: contract.contractor_license,
          client_name: contract.client_name,
          client_address: contract.client_address,
          client_phone: contract.client_phone,
          client_email: contract.client_email,
          project_name: contract.project_name,
          project_address: contract.project_address,
          scope_of_work: contract.scope_of_work,
          total_amount: contract.total_amount,
          deposit_percentage: contract.deposit_percentage,
          deposit_amount: contract.deposit_amount,
          payment_schedule: contract.payment_schedule,
          start_date: contract.start_date,
          estimated_end_date: contract.estimated_end_date,
          working_days: contract.working_days,
          warranty_period: contract.warranty_period,
          change_order_policy: contract.change_order_policy,
          cancellation_policy: contract.cancellation_policy,
          dispute_resolution: contract.dispute_resolution,
          additional_terms: contract.additional_terms,
          materials_included: contract.materials_included,
          has_liability_insurance: contract.has_liability_insurance,
          has_wsib: contract.has_wsib,
          contractor_signature: contract.contractor_signature,
          client_signature: contract.client_signature,
          status: contract.status,
        },
        alreadySigned: !!contract.client_signature,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in view-contract:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
