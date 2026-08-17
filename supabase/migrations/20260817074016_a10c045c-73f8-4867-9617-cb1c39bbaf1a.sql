CREATE TABLE public.pricing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key text NOT NULL UNIQUE,
  label text NOT NULL,
  price_text text NOT NULL DEFAULT '',
  unit_text text NOT NULL DEFAULT '',
  note_text text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pricing_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_items TO authenticated;
GRANT ALL ON public.pricing_items TO service_role;

ALTER TABLE public.pricing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pricing publicly viewable" ON public.pricing_items FOR SELECT USING (true);
CREATE POLICY "Admins can insert pricing" ON public.pricing_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update pricing" ON public.pricing_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete pricing" ON public.pricing_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_pricing_items_updated_at BEFORE UPDATE ON public.pricing_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();