import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product IDs mapping (CAD products - monthly and yearly)
const PRODUCT_TIERS: Record<string, { tier: string; interval: string }> = {
  // Monthly
  "prod_Tog02cwkocBGA0": { tier: "pro", interval: "monthly" },
  "prod_Tog0mYcKDEXUfl": { tier: "premium", interval: "monthly" },
  // Annual
  "prod_Tog7TlfoWskDXG": { tier: "pro", interval: "yearly" },
  "prod_Tog8IdlcfqOduT": { tier: "premium", interval: "yearly" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header - returning unauthenticated state");
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: null,
        interval: null,
        subscription_end: null,
        error: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    // Handle expired/invalid tokens gracefully - return unsubscribed instead of error
    if (userError) {
      logStep("Token validation failed - returning unauthenticated state", { error: userError.message });
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: null,
        interval: null,
        subscription_end: null,
        token_expired: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const user = userData.user;
    if (!user?.email) {
      logStep("No user email - returning unauthenticated state");
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: null,
        interval: null,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found, returning unsubscribed state");
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: null,
        interval: null,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active or trialing subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    // Filter for active or trialing subscriptions
    const validSubscription = subscriptions.data.find((sub: Stripe.Subscription) => 
      sub.status === "active" || sub.status === "trialing"
    );

    const hasValidSub = !!validSubscription;
    let tier: string | null = null;
    let interval: string | null = null;
    let subscriptionEnd: string | null = null;
    let productId: string | null = null;
    let isTrialing = false;
    let trialEnd: string | null = null;
    let trialDaysRemaining: number | null = null;

    if (hasValidSub && validSubscription) {
      const subscription = validSubscription;
      isTrialing = subscription.status === "trialing";
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      productId = subscription.items.data[0].price.product as string;
      const productInfo = PRODUCT_TIERS[productId];
      tier = productInfo?.tier || null;
      interval = productInfo?.interval || null;
      
      // Calculate trial info
      if (isTrialing && subscription.trial_end) {
        trialEnd = new Date(subscription.trial_end * 1000).toISOString();
        const now = Date.now();
        const trialEndMs = subscription.trial_end * 1000;
        trialDaysRemaining = Math.max(0, Math.ceil((trialEndMs - now) / (1000 * 60 * 60 * 24)));
      }
      
      logStep("Valid subscription found", { 
        subscriptionId: subscription.id, 
        status: subscription.status,
        isTrialing,
        trialEnd,
        trialDaysRemaining,
        endDate: subscriptionEnd,
        productId,
        tier,
        interval
      });
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasValidSub,
      tier,
      interval,
      product_id: productId,
      subscription_end: subscriptionEnd,
      is_trialing: isTrialing,
      trial_end: trialEnd,
      trial_days_remaining: trialDaysRemaining
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
