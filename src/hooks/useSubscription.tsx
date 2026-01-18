import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SubscriptionData {
  subscribed: boolean;
  tier: "pro" | "premium" | null;
  productId: string | null;
  subscriptionEnd: string | null;
}

export const SUBSCRIPTION_TIERS = {
  pro: {
    name: "Pro",
    price_id: "price_1Sr2e51Vyb1rmc7TrmRauDEo",
    product_id: "prod_Tog02cwkocBGA0",
    price: 19.99,
    currency: "CAD",
  },
  premium: {
    name: "Premium",
    price_id: "price_1Sr2eI1Vyb1rmc7TOD7OzXWa",
    product_id: "prod_Tog0mYcKDEXUfl",
    price: 49.99,
    currency: "CAD",
  },
} as const;

export const useSubscription = () => {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData>({
    subscribed: false,
    tier: null,
    productId: null,
    subscriptionEnd: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription({
        subscribed: false,
        tier: null,
        productId: null,
        subscriptionEnd: null,
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

      setSubscription({
        subscribed: data.subscribed,
        tier: data.tier,
        productId: data.product_id,
        subscriptionEnd: data.subscription_end,
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

  return {
    subscription,
    loading,
    error,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
};
