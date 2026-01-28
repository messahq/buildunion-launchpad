import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");
    
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    let event: Stripe.Event;

    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Signature verified", { eventType: event.type });
      } catch (err: any) {
        logStep("ERROR: Signature verification failed", { error: err.message });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // For testing without webhook secret - parse the event directly
      logStep("WARNING: No webhook secret configured, parsing event directly");
      event = JSON.parse(body);
    }

    logStep("Processing event", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { 
          customerId: session.customer,
          customerEmail: session.customer_email,
          mode: session.mode
        });

        // Get customer email from session
        const customerEmail = session.customer_email || session.customer_details?.email;
        
        if (customerEmail && session.mode === "subscription") {
          logStep("Subscription checkout completed", { email: customerEmail });
          
          // Log notification that subscription was created
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("user_id")
            .eq("user_id", (await supabaseClient.auth.admin.listUsers()).data.users.find(u => u.email === customerEmail)?.id || "")
            .maybeSingle();

          if (profile?.user_id) {
            await supabaseClient.from("notification_logs").insert({
              user_id: profile.user_id,
              title: "Subscription Activated",
              body: "Your subscription is now active. Enjoy premium features!",
              status: "sent",
              data: { event: "checkout.session.completed", sessionId: session.id }
            });
            logStep("Notification logged for subscription activation");
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription event", { 
          status: subscription.status,
          customerId: subscription.customer,
          priceId: subscription.items.data[0]?.price.id
        });
        
        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if ("email" in customer && customer.email) {
          logStep("Customer found", { email: customer.email });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription cancelled", { 
          subscriptionId: subscription.id,
          customerId: subscription.customer
        });

        // Get customer email and notify
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if ("email" in customer && customer.email) {
          const { data: users } = await supabaseClient.auth.admin.listUsers();
          const user = users.users.find(u => u.email === customer.email);
          
          if (user) {
            await supabaseClient.from("notification_logs").insert({
              user_id: user.id,
              title: "Subscription Cancelled",
              body: "Your subscription has been cancelled. You can resubscribe anytime.",
              status: "sent",
              data: { event: "customer.subscription.deleted", subscriptionId: subscription.id }
            });
            logStep("Cancellation notification logged");
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { 
          invoiceId: invoice.id,
          amount: invoice.amount_paid,
          customerId: invoice.customer
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { 
          invoiceId: invoice.id,
          customerId: invoice.customer
        });

        // Get customer and notify about failed payment
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        if ("email" in customer && customer.email) {
          const { data: users } = await supabaseClient.auth.admin.listUsers();
          const user = users.users.find(u => u.email === customer.email);
          
          if (user) {
            await supabaseClient.from("notification_logs").insert({
              user_id: user.id,
              title: "Payment Failed",
              body: "Your subscription payment failed. Please update your payment method.",
              status: "sent",
              data: { event: "invoice.payment_failed", invoiceId: invoice.id }
            });
            logStep("Payment failure notification logged");
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    logStep("ERROR in webhook handler", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
