import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { Check, Zap, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, SUBSCRIPTION_TIERS } from "@/hooks/useSubscription";
import { toast } from "sonner";

const BuildUnionPricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading, createCheckout, openCustomerPortal, checkSubscription } = useSubscription();

  // Handle checkout result
  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    if (checkoutStatus === "success") {
      toast.success("Subscription successful! Thank you for your purchase.");
      checkSubscription();
    } else if (checkoutStatus === "cancelled") {
      toast.info("Payment cancelled.");
    }
  }, [searchParams, checkSubscription]);

  const handleSubscribe = async (tier: "pro" | "premium") => {
    if (!user) {
      navigate("/buildunion/login");
      return;
    }

    try {
      await createCheckout(SUBSCRIPTION_TIERS[tier].price_id);
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("An error occurred while initiating payment");
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("An error occurred while managing subscription");
    }
  };

  const isCurrentPlan = (tier: "pro" | "premium") => {
    return subscription.tier === tier;
  };

  const plans = [
    {
      id: "free" as const,
      name: "Free",
      price: "0",
      description: "Get started for free, explore the platform",
      icon: <Zap className="w-6 h-6" />,
      features: [
        "1 active project",
        "Basic document upload",
        "Community support",
        "BuildUnion news",
      ],
      buttonText: "Current Plan",
      disabled: true,
      highlight: false,
    },
    {
      id: "pro" as const,
      name: "Pro",
      price: "19.99",
      description: "Professional tools for construction experts",
      icon: <Zap className="w-6 h-6 text-blue-500" />,
      features: [
        "10 active projects",
        "AI Assistant (Messa)",
        "Document analysis",
        "Cost estimation",
        "Email support",
        "Contract templates",
      ],
      buttonText: isCurrentPlan("pro") ? "Current Plan" : "Subscribe to Pro",
      disabled: isCurrentPlan("pro"),
      highlight: true,
    },
    {
      id: "premium" as const,
      name: "Premium",
      price: "49.99",
      description: "Full access for larger teams",
      icon: <Crown className="w-6 h-6 text-amber-500" />,
      features: [
        "Unlimited projects",
        "All Pro features",
        "Priority AI responses",
        "Team collaboration",
        "Dedicated support",
        "Custom integrations",
        "API access",
        "Analytics dashboard",
      ],
      buttonText: isCurrentPlan("premium") ? "Current Plan" : "Subscribe to Premium",
      disabled: isCurrentPlan("premium"),
      highlight: false,
    },
  ];

  return (
    <main className="bg-slate-50 min-h-screen">
      <BuildUnionHeader />

      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4 bg-amber-500/20 text-amber-400 border-amber-500/30">
            Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Choose the Right Plan for You
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Build the future with BuildUnion. Every plan includes essential features to get you started.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 -mt-8">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  plan.highlight 
                    ? "border-2 border-amber-500 shadow-lg shadow-amber-500/20 scale-105" 
                    : "border border-slate-200"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center py-1 text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <CardHeader className={plan.highlight ? "pt-10" : ""}>
                  <div className="flex items-center gap-3 mb-2">
                    {plan.icon}
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                    {plan.id !== "free" && <span className="text-slate-500">/mo</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-slate-600">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.id === "free" ? (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      disabled={!subscription.subscribed}
                    >
                      {subscription.subscribed ? "Switch to Free" : "Current Plan"}
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${
                        plan.highlight 
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" 
                          : ""
                      }`}
                      disabled={plan.disabled || subLoading || authLoading}
                      onClick={() => handleSubscribe(plan.id as "pro" | "premium")}
                    >
                      {subLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {plan.buttonText}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Manage Subscription */}
          {subscription.subscribed && (
            <div className="text-center mt-12">
              <p className="text-slate-600 mb-4">
                Current subscription: <strong className="text-slate-900 capitalize">{subscription.tier}</strong>
                {subscription.subscriptionEnd && (
                  <span className="text-slate-500">
                    {" "}(valid until: {new Date(subscription.subscriptionEnd).toLocaleDateString("en-US")})
                  </span>
                )}
              </p>
              <Button variant="outline" onClick={handleManageSubscription}>
                Manage Subscription
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">When will I be billed?</h3>
              <p className="text-slate-600">The first monthly fee is charged immediately upon purchase, then on the same date each month.</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Can I cancel anytime?</h3>
              <p className="text-slate-600">Yes, you can cancel your subscription at any time using the "Manage Subscription" button. After cancellation, you can still use the service until the end of the billing period.</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Can I switch plans?</h3>
              <p className="text-slate-600">Absolutely! You can upgrade or downgrade to a different plan at any time through the "Manage Subscription" menu.</p>
            </div>
          </div>
        </div>
      </section>

      <BuildUnionFooter />
    </main>
  );
};

export default BuildUnionPricing;
