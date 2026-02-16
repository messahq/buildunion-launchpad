import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Check, Zap, Crown, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  const [isAnnual, setIsAnnual] = useState(false);

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
      const priceId = isAnnual 
        ? SUBSCRIPTION_TIERS[tier].yearly.price_id 
        : SUBSCRIPTION_TIERS[tier].monthly.price_id;
      await createCheckout(priceId);
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

  const getPrice = (tier: "pro" | "premium") => {
    if (isAnnual) {
      return SUBSCRIPTION_TIERS[tier].yearly.monthlyEquivalent.toFixed(2);
    }
    return SUBSCRIPTION_TIERS[tier].monthly.price.toFixed(2);
  };

  const getFullPrice = (tier: "pro" | "premium") => {
    if (isAnnual) {
      return SUBSCRIPTION_TIERS[tier].yearly.price.toFixed(2);
    }
    return SUBSCRIPTION_TIERS[tier].monthly.price.toFixed(2);
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
        "Quick Log (3 reports/month)",
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
      price: getPrice("pro"),
      fullPrice: getFullPrice("pro"),
      originalMonthly: SUBSCRIPTION_TIERS.pro.monthly.price.toFixed(2),
      description: "Professional tools for construction experts",
      icon: <Zap className="w-6 h-6 text-blue-500" />,
      features: [
        "10 active projects",
        "Unlimited Quick Log reports",
        "Team Mode (Documents, Tasks, Map)",
        "AI Assistant (Messa)",
        "Document analysis & AI Synthesis",
        "Cost estimation & contracts",
        "Email support",
      ],
      buttonText: isCurrentPlan("pro") ? "Current Plan" : "Subscribe to Pro",
      disabled: isCurrentPlan("pro"),
      highlight: true,
    },
    {
      id: "premium" as const,
      name: "Premium",
      price: getPrice("premium"),
      fullPrice: getFullPrice("premium"),
      originalMonthly: SUBSCRIPTION_TIERS.premium.monthly.price.toFixed(2),
      description: "Full access for larger teams",
      icon: <Crown className="w-6 h-6 text-amber-500" />,
      features: [
        "Unlimited projects",
        "All Pro features included",
        "Direct Messaging",
        "Priority AI responses",
        "Conflict Visualization",
        "Project Reports",
        "Dedicated support",
        "Custom integrations",
      ],
      buttonText: isCurrentPlan("premium") ? "Current Plan" : "Subscribe to Premium",
      disabled: isCurrentPlan("premium"),
      highlight: false,
    },
  ];

  return (
    <main className="bg-background min-h-screen transition-colors">
      <BuildUnionHeader />

      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 pt-20">
        <Button
          variant="ghost"
          onClick={() => navigate("/buildunion/workspace")}
          className="mb-8 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workspace
        </Button>

        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-display font-light tracking-tight mb-3">
            <span className="text-foreground">Build</span>
            <span className="text-amber-500">Union</span>
          </h2>
          <h1 className="text-3xl md:text-4xl font-display font-semibold mb-3">
            Choose the Right Plan for You
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Build the future with BuildUnion. Every plan includes essential features to get you started.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <Label htmlFor="billing-toggle" className={`text-sm ${!isAnnual ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label htmlFor="billing-toggle" className={`text-sm ${isAnnual ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
              Annual
            </Label>
            {isAnnual && (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 ml-2">
                Save 2 months!
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <section className="py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-card ${
                  plan.highlight 
                    ? "border-2 border-amber-500 shadow-lg shadow-amber-500/20 scale-105" 
                    : "border border-border"
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
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">C${plan.price}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </div>
                    {plan.id !== "free" && isAnnual && (
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-muted-foreground line-through">
                          C${plan.originalMonthly}/mo
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          C${plan.fullPrice} billed annually
                        </p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-muted-foreground">
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
              <p className="text-muted-foreground mb-4">
                Current subscription: <strong className="text-foreground capitalize">{subscription.tier}</strong>
                {subscription.billingInterval && (
                  <span className="text-muted-foreground"> ({subscription.billingInterval})</span>
                )}
                {subscription.subscriptionEnd && (
                  <span className="text-muted-foreground">
                    {" "}· valid until: {new Date(subscription.subscriptionEnd).toLocaleDateString("en-US")}
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
      <section className="py-12 max-w-3xl mx-auto px-6">
          <h2 className="text-xl font-display font-semibold mb-1">Frequently Asked Questions</h2>
          <p className="text-sm text-muted-foreground mb-6">Quick answers about billing.</p>
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-1">When will I be billed?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">The first fee is charged immediately upon purchase. For monthly plans, you're billed each month. For annual plans, you're billed once per year.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-1">Can I cancel anytime?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Yes, you can cancel your subscription at any time using the "Manage Subscription" button. After cancellation, you can still use the service until the end of the billing period.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-1">Can I switch between monthly and annual?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Absolutely! You can switch billing periods at any time through the "Manage Subscription" menu. Switching to annual saves you 2 months!</p>
            </div>
          </div>
      </section>

      <BuildUnionFooter />
    </main>
  );
};

export default BuildUnionPricing;
