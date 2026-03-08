
-- ═══ Affiliate Products Table ═══
-- Stores the product catalog for Grok Insights recommendations
CREATE TABLE public.affiliate_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  reason text,
  price_range text,
  savings_amount numeric DEFAULT 0,
  savings_label text,
  store_name text NOT NULL,
  affiliate_url text NOT NULL,
  obc_reference text,
  trade text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  icon_name text DEFAULT 'package',
  icon_gradient text DEFAULT 'from-slate-500 to-slate-600',
  icon_glow text DEFAULT '',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ═══ Affiliate Clicks Table ═══
-- Tracks every affiliate link click for analytics & revenue attribution
CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.affiliate_products(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  clicked_at timestamptz DEFAULT now(),
  source text DEFAULT 'grok-insights',
  ip_hash text,
  user_agent text
);

-- ═══ Affiliate Revenue Table ═══
-- For future commission tracking when affiliate programs are live
CREATE TABLE public.affiliate_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id uuid REFERENCES public.affiliate_clicks(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.affiliate_products(id) ON DELETE SET NULL,
  order_reference text,
  commission_amount numeric DEFAULT 0,
  currency text DEFAULT 'CAD',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'rejected')),
  attributed_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ═══ RLS Policies ═══
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_revenue ENABLE ROW LEVEL SECURITY;

-- Products: anyone authenticated can read active products
CREATE POLICY "Anyone can read active affiliate products"
  ON public.affiliate_products FOR SELECT TO authenticated
  USING (is_active = true);

-- Products: only admins can manage
CREATE POLICY "Admins can manage affiliate products"
  ON public.affiliate_products FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Clicks: users can insert their own clicks
CREATE POLICY "Users can insert own clicks"
  ON public.affiliate_clicks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Clicks: users can read own clicks
CREATE POLICY "Users can read own clicks"
  ON public.affiliate_clicks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Clicks: admins can read all clicks
CREATE POLICY "Admins can read all clicks"
  ON public.affiliate_clicks FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Revenue: admins only
CREATE POLICY "Admins can manage revenue"
  ON public.affiliate_revenue FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ═══ Indexes ═══
CREATE INDEX idx_affiliate_products_trade ON public.affiliate_products(trade) WHERE is_active = true;
CREATE INDEX idx_affiliate_clicks_user ON public.affiliate_clicks(user_id);
CREATE INDEX idx_affiliate_clicks_product ON public.affiliate_clicks(product_id);
CREATE INDEX idx_affiliate_clicks_date ON public.affiliate_clicks(clicked_at);
CREATE INDEX idx_affiliate_revenue_status ON public.affiliate_revenue(status);

-- ═══ Updated_at trigger ═══
CREATE TRIGGER update_affiliate_products_updated_at
  BEFORE UPDATE ON public.affiliate_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
