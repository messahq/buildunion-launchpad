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
      toast.success("Előfizetés sikeres! Köszönjük a vásárlást.");
      checkSubscription();
    } else if (checkoutStatus === "cancelled") {
      toast.info("A fizetés megszakítva.");
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
      toast.error("Hiba történt a fizetés indításakor");
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Hiba történt az előfizetés kezelésekor");
    }
  };

  const isCurrentPlan = (tier: "pro" | "premium") => {
    return subscription.tier === tier;
  };

  const plans = [
    {
      id: "free" as const,
      name: "Ingyenes",
      price: "0",
      description: "Kezdd el ingyen, fedezd fel a platformot",
      icon: <Zap className="w-6 h-6" />,
      features: [
        "1 aktív projekt",
        "Alapvető dokumentum feltöltés",
        "Közösségi támogatás",
        "BuildUnion hírek",
      ],
      buttonText: "Jelenlegi csomag",
      disabled: true,
      highlight: false,
    },
    {
      id: "pro" as const,
      name: "Pro",
      price: "19.99",
      description: "Professzionális eszközök építőipari szakembereknek",
      icon: <Zap className="w-6 h-6 text-blue-500" />,
      features: [
        "10 aktív projekt",
        "AI asszisztens (Messa)",
        "Dokumentum elemzés",
        "Költségbecslés",
        "Email támogatás",
        "Szerződés sablonok",
      ],
      buttonText: isCurrentPlan("pro") ? "Jelenlegi csomag" : "Pro előfizetés",
      disabled: isCurrentPlan("pro"),
      highlight: true,
    },
    {
      id: "premium" as const,
      name: "Premium",
      price: "49.99",
      description: "Teljes hozzáférés nagyobb csapatoknak",
      icon: <Crown className="w-6 h-6 text-amber-500" />,
      features: [
        "Korlátlan projekt",
        "Minden Pro funkció",
        "Prioritásos AI válaszok",
        "Csapat együttműködés",
        "Dedikált támogatás",
        "Egyedi integrációk",
        "API hozzáférés",
        "Analitika dashboard",
      ],
      buttonText: isCurrentPlan("premium") ? "Jelenlegi csomag" : "Premium előfizetés",
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
            Árazás
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Válaszd ki a számodra megfelelő csomagot
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Építsd fel a jövőt a BuildUnion segítségével. Minden csomag tartalmazza az alapvető funkciókat.
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
                    Legnépszerűbb
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
                    {plan.id !== "free" && <span className="text-slate-500">/hó</span>}
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
                      {subscription.subscribed ? "Váltás ingyenesre" : "Jelenlegi csomag"}
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
                Jelenlegi előfizetésed: <strong className="text-slate-900 capitalize">{subscription.tier}</strong>
                {subscription.subscriptionEnd && (
                  <span className="text-slate-500">
                    {" "}(érvényes: {new Date(subscription.subscriptionEnd).toLocaleDateString("hu-HU")})
                  </span>
                )}
              </p>
              <Button variant="outline" onClick={handleManageSubscription}>
                Előfizetés kezelése
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Gyakran Ismételt Kérdések</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Mikor történik a számlázás?</h3>
              <p className="text-slate-600">Az előfizetés megvásárlásakor azonnal megtörténik az első havi díj levonása, majd minden hónapban ugyanazon a napon.</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Bármikor lemondhatom?</h3>
              <p className="text-slate-600">Igen, az előfizetésedet bármikor lemondhatod az "Előfizetés kezelése" gombbal. A lemondás után a hónap végéig még használhatod a szolgáltatást.</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Válthatok csomagot?</h3>
              <p className="text-slate-600">Természetesen! Az "Előfizetés kezelése" menüben bármikor upgrade-elhetsz vagy downgrade-elhetsz másik csomagra.</p>
            </div>
          </div>
        </div>
      </section>

      <BuildUnionFooter />
    </main>
  );
};

export default BuildUnionPricing;
