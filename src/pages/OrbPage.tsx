import { Zap, Crown, Sparkles, Brain, Shield, Rocket, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DockHeader from "@/components/DockHeader";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, SUBSCRIPTION_TIERS } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const OrbPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, createCheckout, loading } = useSubscription();

  const handleUpgrade = async (tier: "pro" | "premium") => {
    if (!user) {
      navigate("/dock/login");
      return;
    }

    try {
      // Default to monthly pricing
      await createCheckout(SUBSCRIPTION_TIERS[tier].monthly.price_id);
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("An error occurred while initiating payment");
    }
  };

  const orbFeatures = [
    {
      icon: <Brain className="w-6 h-6 text-cyan-400" />,
      title: "AI-Powered Insights",
      description: "Get intelligent recommendations and analysis powered by advanced AI",
      tier: "pro" as const,
    },
    {
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      title: "Custom Workflows",
      description: "Create automated workflows tailored to your specific needs",
      tier: "pro" as const,
    },
    {
      icon: <Shield className="w-6 h-6 text-green-400" />,
      title: "Priority Support",
      description: "Get faster responses and dedicated assistance when you need it",
      tier: "premium" as const,
    },
    {
      icon: <Rocket className="w-6 h-6 text-purple-400" />,
      title: "Advanced Integrations",
      description: "Connect with more tools and services for seamless workflows",
      tier: "premium" as const,
    },
  ];

  const isFeatureUnlocked = (requiredTier: "pro" | "premium") => {
    if (!subscription.subscribed) return false;
    if (requiredTier === "pro") return subscription.tier === "pro" || subscription.tier === "premium";
    return subscription.tier === "premium";
  };

  return (
    <main className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 min-h-screen">
      <DockHeader title="Orb Module" accentColor="bg-cyan-500 hover:bg-cyan-600" />
      
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Animated background orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96">
          <div 
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(6, 182, 212, 0.4), rgba(251, 146, 60, 0.2) 60%, transparent)',
              filter: 'blur(40px)',
            }}
          />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            Orb Module
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Unlock the Full Power of Orb
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Experience advanced AI capabilities, custom workflows, and premium features designed to supercharge your productivity.
          </p>

          {/* Current Plan Status */}
          {subscription.subscribed ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              {subscription.tier === "premium" ? (
                <Crown className="w-5 h-5 text-amber-400" />
              ) : (
                <Zap className="w-5 h-5 text-blue-400" />
              )}
              <span className="text-white font-medium capitalize">{subscription.tier} Plan Active</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
              <Lock className="w-5 h-5 text-slate-400" />
              <span className="text-slate-300">Free Plan - Upgrade to unlock features</span>
            </div>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {orbFeatures.map((feature, idx) => {
              const unlocked = isFeatureUnlocked(feature.tier);
              return (
                <Card 
                  key={idx}
                  className={`relative overflow-hidden transition-all duration-300 ${
                    unlocked 
                      ? "bg-slate-800/50 border-slate-700 hover:border-cyan-500/50" 
                      : "bg-slate-800/30 border-slate-700/50"
                  }`}
                >
                  {!unlocked && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                      <div className="text-center p-4">
                        <Lock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                          {feature.tier === "pro" ? "Pro" : "Premium"}
                        </Badge>
                      </div>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="mb-3">{feature.icon}</div>
                    <CardTitle className="text-lg text-white">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-slate-400">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Upgrade CTA Section */}
      {!subscription.subscribed && (
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pro Card */}
                <Card className="relative overflow-hidden bg-gradient-to-br from-blue-900/40 to-slate-800/40 border-blue-500/30 hover:border-blue-400/50 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-6 h-6 text-blue-400" />
                      <CardTitle className="text-2xl text-white">Pro</CardTitle>
                    </div>
                    <CardDescription className="text-slate-300">
                      Perfect for professionals
                    </CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-white">C$19.99</span>
                      <span className="text-slate-400">/mo</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6 text-sm text-slate-300">
                      <li className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        AI-Powered Insights
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        Custom Workflows
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        10 Active Projects
                      </li>
                    </ul>
                    <Button 
                      className="w-full bg-blue-500 hover:bg-blue-600"
                      onClick={() => handleUpgrade("pro")}
                      disabled={loading}
                    >
                      Upgrade to Pro
                    </Button>
                  </CardContent>
                </Card>

                {/* Premium Card */}
                <Card className="relative overflow-hidden bg-gradient-to-br from-amber-900/40 to-slate-800/40 border-amber-500/30 hover:border-amber-400/50 transition-all duration-300">
                  <Badge className="absolute top-4 right-4 bg-amber-500 text-white">
                    Best Value
                  </Badge>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-6 h-6 text-amber-400" />
                      <CardTitle className="text-2xl text-white">Premium</CardTitle>
                    </div>
                    <CardDescription className="text-slate-300">
                      For teams and power users
                    </CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-white">C$49.99</span>
                      <span className="text-slate-400">/mo</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6 text-sm text-slate-300">
                      <li className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Everything in Pro
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Priority Support
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Advanced Integrations
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Unlimited Projects
                      </li>
                    </ul>
                    <Button 
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      onClick={() => handleUpgrade("premium")}
                      disabled={loading}
                    >
                      Upgrade to Premium
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <p className="text-center text-slate-500 text-sm mt-6">
                All plans include a 30-day money-back guarantee. Cancel anytime.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* For subscribed users - show what's included */}
      {subscription.subscribed && (
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">You're All Set!</h2>
            <p className="text-slate-400 mb-6">
              Your {subscription.tier} subscription gives you access to all the features above.
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate("/buildunion/pricing")}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Manage Subscription
            </Button>
          </div>
        </section>
      )}
    </main>
  );
};

export default OrbPage;
