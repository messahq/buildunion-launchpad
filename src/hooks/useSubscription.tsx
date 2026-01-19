import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SubscriptionTier = "free" | "pro" | "premium" | "enterprise";

export interface SubscriptionData {
  subscribed: boolean;
  tier: SubscriptionTier;
  productId: string | null;
  subscriptionEnd: string | null;
  billingInterval: "monthly" | "yearly" | null;
}

// Team member limits per tier
export const TEAM_LIMITS: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 10,
  premium: 50,
  enterprise: Infinity, // Unlimited
};

export const SUBSCRIPTION_TIERS = {
  pro: {
    name: "Pro",
    teamLimit: 10,
    monthly: {
      price_id: "price_1Sr2e51Vyb1rmc7TrmRauDEo",
      product_id: "prod_Tog02cwkocBGA0",
      price: 19.99,
    },
    yearly: {
      price_id: "price_1Sr2lb1Vyb1rmc7Tpd0pq7Yr",
      product_id: "prod_Tog7TlfoWskDXG",
      price: 199.99,
      monthlyEquivalent: 16.67,
    },
    currency: "CAD",
  },
  premium: {
    name: "Premium",
    teamLimit: 50,
    monthly: {
      price_id: "price_1Sr2eI1Vyb1rmc7TOD7OzXWa",
      product_id: "prod_Tog0mYcKDEXUfl",
      price: 49.99,
    },
    yearly: {
      price_id: "price_1Sr2lr1Vyb1rmc7TJuydqxZ0",
      product_id: "prod_Tog8IdlcfqOduT",
      price: 499.99,
      monthlyEquivalent: 41.67,
    },
    currency: "CAD",
  },
} as const;

// All product IDs for tier detection
export const PRODUCT_TO_TIER: Record<string, { tier: "pro" | "premium"; interval: "monthly" | "yearly" }> = {
  "prod_Tog02cwkocBGA0": { tier: "pro", interval: "monthly" },
  "prod_Tog7TlfoWskDXG": { tier: "pro", interval: "yearly" },
  "prod_Tog0mYcKDEXUfl": { tier: "premium", interval: "monthly" },
  "prod_Tog8IdlcfqOduT": { tier: "premium", interval: "yearly" },
};

// Helper to get team limit for a tier
export const getTeamLimit = (tier: SubscriptionTier): number => {
  return TEAM_LIMITS[tier];
};

// Helper to get the next tier for upgrade
export const getNextTier = (currentTier: SubscriptionTier): SubscriptionTier | null => {
  const upgradeMap: Partial<Record<SubscriptionTier, SubscriptionTier>> = {
    free: "pro",
    pro: "premium",
    premium: "enterprise",
  };
  return upgradeMap[currentTier] || null;
};

export const useSubscription = () => {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData>({
    subscribed: false,
    tier: "free",
    productId: null,
    subscriptionEnd: null,
    billingInterval: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for dev tier override (development only)
  const getDevOverride = (): SubscriptionTier | null => {
    if (typeof window === 'undefined') return null;
    const override = localStorage.getItem("dev_tier_override");
    if (override && ["free", "pro", "premium", "enterprise"].includes(override)) {
      return override as SubscriptionTier;
    }
    return null;
  };

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription({
        subscribed: false,
        tier: "free",
        productId: null,
        subscriptionEnd: null,
        billingInterval: null,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) throw fnError;

      const productInfo = data.product_id ? PRODUCT_TO_TIER[data.product_id] : null;

      setSubscription({
        subscribed: data.subscribed,
        tier: productInfo?.tier || "free",
        productId: data.product_id,
        subscriptionEnd: data.subscription_end,
        billingInterval: productInfo?.interval || null,
      });
    } catch (err) {
      console.error("Error checking subscription:", err);
      setError(err instanceof Error ? err.message : "Failed to check subscription");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  const createCheckout = async (priceId: string) => {
    if (!session?.access_token) {
      throw new Error("User must be logged in");
    }

    const { data, error: fnError } = await supabase.functions.invoke("create-checkout", {
      body: { priceId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (fnError) throw fnError;
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  const openCustomerPortal = async () => {
    if (!session?.access_token) {
      throw new Error("User must be logged in");
    }

    const { data, error: fnError } = await supabase.functions.invoke("customer-portal", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (fnError) throw fnError;
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  // Check subscription on mount and when user changes
  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user, checkSubscription]);

  // Auto-refresh every minute
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 60000);

    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  // Apply dev override if present
  const devOverride = getDevOverride();
  const effectiveSubscription: SubscriptionData = devOverride
    ? {
        ...subscription,
        subscribed: devOverride !== "free",
        tier: devOverride,
      }
    : subscription;

  return {
    subscription: effectiveSubscription,
    loading,
    error,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    isDevOverride: !!devOverride,
  };
};
