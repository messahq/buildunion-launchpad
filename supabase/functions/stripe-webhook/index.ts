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

const RESEND_GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

async function sendFailedPaymentEmail(customerEmail: string, customerName?: string) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!lovableApiKey || !resendApiKey) {
    logStep("WARNING: Cannot send failed payment email - missing LOVABLE_API_KEY or RESEND_API_KEY");
    return false;
  }

  const displayName = customerName || "Valued Customer";
  
  try {
    const response = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": resendApiKey,
      },
      body: JSON.stringify({
        from: "BuildUnion <admin@buildunion.ca>",
        to: [customerEmail],
        subject: "⚠️ Payment Failed – Please Update Your Payment Method",
        html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background-color:#F97316;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">BuildUnion</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;">Payment Failed</h2>
          <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.6;">
            Hi ${displayName},
          </p>
          <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.6;">
            We were unable to process your latest subscription payment. This could be due to an expired card, insufficient funds, or a temporary issue with your bank.
          </p>
          <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
            To avoid any interruption to your BuildUnion Pro features, please update your payment method as soon as possible.
          </p>
          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td style="background-color:#F97316;border-radius:8px;padding:14px 32px;text-align:center;">
              <a href="https://buildunionca.lovable.app/buildunion/pricing" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                Update Payment Method
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#71717a;font-size:13px;line-height:1.5;">
            If you believe this is an error, please contact us at <a href="mailto:admin@buildunion.ca" style="color:#F97316;">admin@buildunion.ca</a>.
          </p>
          <p style="margin:0;color:#71717a;font-size:13px;line-height:1.5;">
            Stripe will automatically retry the payment. If it continues to fail, your subscription may be paused.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;background-color:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;">
            © ${new Date().getFullYear()} BuildUnion · Toronto, Ontario, Canada
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    });

    if (response.ok) {
      logStep("Failed payment email sent successfully", { email: customerEmail });
      return true;
    } else {
      const errorData = await response.text();
      logStep("Failed to send payment email", { status: response.status, error: errorData });
      return false;
    }
  } catch (err: any) {
    logStep("ERROR sending failed payment email", { error: err.message });
    return false;
  }
}

async function sendSubscriptionCancelledEmail(customerEmail: string, customerName?: string) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!lovableApiKey || !resendApiKey) {
    logStep("WARNING: Cannot send cancellation email - missing API keys");
    return false;
  }

  const displayName = customerName || "Valued Customer";

  try {
    const response = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": resendApiKey,
      },
      body: JSON.stringify({
        from: "BuildUnion <admin@buildunion.ca>",
        to: [customerEmail],
        subject: "Your BuildUnion Subscription Has Been Cancelled",
        html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background-color:#F97316;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">BuildUnion</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;">Subscription Cancelled</h2>
          <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.6;">
            Hi ${displayName},
          </p>
          <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.6;">
            Your BuildUnion subscription has been cancelled. Your existing projects and data will remain accessible, but premium features will no longer be available after your current billing period ends.
          </p>
          <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
            You can resubscribe anytime to regain access to all premium features.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td style="background-color:#F97316;border-radius:8px;padding:14px 32px;text-align:center;">
              <a href="https://buildunionca.lovable.app/buildunion/pricing" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                Resubscribe
              </a>
            </td></tr>
          </table>
          <p style="margin:0;color:#71717a;font-size:13px;line-height:1.5;">
            Questions? Contact us at <a href="mailto:admin@buildunion.ca" style="color:#F97316;">admin@buildunion.ca</a>.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;background-color:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;">
            © ${new Date().getFullYear()} BuildUnion · Toronto, Ontario, Canada
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    });

    if (response.ok) {
      logStep("Cancellation email sent successfully", { email: customerEmail });
      return true;
    } else {
      const errorData = await response.text();
      logStep("Failed to send cancellation email", { status: response.status, error: errorData });
      return false;
    }
  } catch (err: any) {
    logStep("ERROR sending cancellation email", { error: err.message });
    return false;
  }
}

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

        const customerEmail = session.customer_email || session.customer_details?.email;
        
        if (customerEmail && session.mode === "subscription") {
          logStep("Subscription checkout completed", { email: customerEmail });
          
          const { data: users } = await supabaseClient.auth.admin.listUsers();
          const user = users.users.find(u => u.email === customerEmail);

          if (user) {
            await supabaseClient.from("notification_logs").insert({
              user_id: user.id,
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

          // Send cancellation email via Resend
          await sendSubscriptionCancelledEmail(customer.email, customer.name || undefined);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { 
          invoiceId: invoice.id,
          amount: invoice.amount_paid,
          customerId: invoice.customer,
          tax: invoice.tax
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { 
          invoiceId: invoice.id,
          customerId: invoice.customer
        });

        const customer = await stripe.customers.retrieve(invoice.customer as string);
        if ("email" in customer && customer.email) {
          const { data: users } = await supabaseClient.auth.admin.listUsers();
          const user = users.users.find(u => u.email === customer.email);
          
          if (user) {
            // In-app notification
            await supabaseClient.from("notification_logs").insert({
              user_id: user.id,
              title: "Payment Failed",
              body: "Your subscription payment failed. Please update your payment method to avoid service interruption.",
              status: "sent",
              link: "/buildunion/pricing",
              data: { event: "invoice.payment_failed", invoiceId: invoice.id }
            });
            logStep("Payment failure notification logged");
          }

          // Send failed payment email via Resend
          await sendFailedPaymentEmail(customer.email, customer.name || undefined);
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
