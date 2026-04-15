import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Check, Zap, Crown, ArrowLeft, Shield, AlertTriangle, TrendingUp } from "lucide-react";
import { HardHatSpinner } from "@/components/ui/loading-states";
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
      description: "14-day Pro trial, then basic access",
      icon: <Zap className="w-6 h-6" />,
      features: [
        "14-day Pro trial included",
        "1 active project (after trial)",
        "Basic document upload",
        "AI: Gemini Flash Lite (basic)",
        "Community support",
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
      description: "Full AI power for construction pros",
      icon: <Zap className="w-6 h-6 text-blue-500" />,
      features: [
        "10 active projects",
        "Team Mode (Docs, Tasks, Map)",
        "AI: 5-Engine M.E.S.S.A. Suite",
        "└ Gemini Vision · GPT-5 Audit",
        "└ Claude OBC · Lovable DNA · Grok Insights",
        "DNA Deep Audit (9-pillar)",
        "OBC Compliance (§ citations)",
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
      description: "Unlimited power for teams",
      icon: <Crown className="w-6 h-6 text-amber-500" />,
      features: [
        "Unlimited projects",
        "All Pro features included",
        "Priority AI responses (GPT-5)",
        "Direct Messaging",
        "Conflict Visualization",
        "Custom reports & analytics",
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
                    {plan.id !== "free" && (
                      <p className="text-xs text-muted-foreground mt-1">+ 13% HST (Ontario)</p>
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
                        <HardHatSpinner size="sm" className="mr-2" />
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

      {/* ═══ PENALTY PREVENTION ROI SECTION ═══ */}
      <section className="py-12 max-w-4xl mx-auto px-6">
        <div className="rounded-2xl overflow-hidden border border-amber-500/30 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-red-950/20 shadow-lg">
          <div className="px-6 md:px-8 py-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/15 border border-amber-500/30 flex items-center justify-center">
                <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-display font-bold text-foreground">The Math Doesn't Lie</h2>
                <p className="text-sm text-muted-foreground">Why BuildUnion Pro pays for itself on Day 1</p>
              </div>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* What you pay */}
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 p-5 text-center">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-bold mb-2">BuildUnion Pro</p>
                <p className="text-4xl font-black font-mono text-emerald-700 dark:text-emerald-300">$19<span className="text-2xl">.99</span></p>
                <p className="text-sm text-emerald-600/70 dark:text-emerald-400/60 mt-1">/month · $240/year</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-emerald-700 dark:text-emerald-300">9-Pillar DNA Protection</span>
                </div>
              </div>

              {/* What you risk */}
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/20 p-5 text-center">
                <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider font-bold mb-2">Without Protection</p>
                <p className="text-4xl font-black font-mono text-red-700 dark:text-red-300">$5K<span className="text-2xl">–$50K</span></p>
                <p className="text-sm text-red-600/70 dark:text-red-400/60 mt-1">per OBC offence</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-red-700 dark:text-red-300">+ daily continuing penalties</span>
                </div>
              </div>
            </div>

            {/* ROI breakdown */}
            <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-amber-200 dark:border-amber-500/15 p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-300/60 uppercase tracking-wider font-bold">Return on Protection</p>
                  <p className="text-sm text-foreground mt-1">
                    Every <span className="font-bold">$1</span> spent shields up to <span className="font-bold text-amber-600 dark:text-amber-300 font-mono">$208</span> in risk
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black font-mono text-amber-600 dark:text-amber-300">208×</p>
                  <p className="text-xs text-muted-foreground">ROI</p>
                </div>
              </div>

              {/* Visual bar */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold shrink-0">$240</span>
                <div className="flex-1 h-3 rounded-full bg-muted/50 overflow-hidden relative">
                  <div className="absolute inset-0 h-full rounded-full bg-gradient-to-r from-red-400 to-red-500 dark:from-red-500/60 dark:to-red-600/60" style={{ width: '100%' }} />
                  <div className="absolute inset-0 h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 dark:from-emerald-500/60 dark:to-emerald-600/60" style={{ width: '0.5%' }} />
                </div>
                <span className="text-xs text-red-600 dark:text-red-400 font-mono font-bold shrink-0">$50,000</span>
              </div>
            </div>

            {/* 9 checkpoints protected */}
            <div className="grid grid-cols-3 md:grid-cols-3 gap-2 mb-6">
              {[
                { icon: '🏗️', label: 'Project Identity', penalty: '$1,000' },
                { icon: '📐', label: 'Area & GFA', penalty: '$3,500' },
                { icon: '🔬', label: 'Trade & Materials', penalty: '$2,500' },
                { icon: '👥', label: 'Team Roles', penalty: '$1,500' },
                { icon: '📅', label: 'Timeline', penalty: '$2,000' },
                { icon: '👁️', label: 'Documents', penalty: '$2,000' },
                { icon: '🌦️', label: 'Site Conditions', penalty: '$1,500' },
                { icon: '💰', label: 'Budget Sync', penalty: '$5,000' },
                { icon: '⚖️', label: 'OBC Compliance', penalty: '$8,500' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-white/50 dark:bg-white/[0.03] border border-border/50 p-2 text-center">
                  <span className="text-lg">{item.icon}</span>
                  <p className="text-[10px] font-bold text-foreground mt-1 leading-tight">{item.label}</p>
                  <p className="text-[10px] text-red-500 dark:text-red-400 font-mono font-bold">{item.penalty}</p>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-amber-200 dark:border-amber-500/15">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">$27,500</span> total risk protected across 9 DNA checkpoints
                </p>
              </div>
              <Button
                onClick={() => {
                  if (!user) { navigate('/buildunion/login'); return; }
                  handleSubscribe('pro');
                }}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold gap-2 shrink-0"
              >
                <Shield className="h-4 w-4" />
                Protect My Project — $19.99/mo
              </Button>
            </div>
          </div>
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
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-1">Is tax included in the price?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Prices shown are before tax. Ontario Harmonized Sales Tax (HST) of 13% is automatically applied at checkout. Your receipt will show the full breakdown.</p>
            </div>
          </div>
      </section>

      <BuildUnionFooter />
    </main>
  );
};

export default BuildUnionPricing;
