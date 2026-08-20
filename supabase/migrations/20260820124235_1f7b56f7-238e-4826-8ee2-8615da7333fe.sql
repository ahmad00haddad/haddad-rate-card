ALTER TABLE public.pricing_items
  ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS price_min numeric,
  ADD COLUMN IF NOT EXISTS price_max numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'JOD',
  ADD COLUMN IF NOT EXISTS unit_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS unit_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS note_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS note_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.pricing_items
  DROP CONSTRAINT IF EXISTS pricing_items_region_check,
  ADD CONSTRAINT pricing_items_region_check CHECK (region IN ('irbid', 'amman', 'both')),
  DROP CONSTRAINT IF EXISTS pricing_items_price_range_check,
  ADD CONSTRAINT pricing_items_price_range_check CHECK (
    (price_min IS NULL OR price_min >= 0)
    AND (price_max IS NULL OR price_max >= 0)
    AND (price_min IS NULL OR price_max IS NULL OR price_max >= price_min)
  ),
  DROP CONSTRAINT IF EXISTS pricing_items_currency_check,
  ADD CONSTRAINT pricing_items_currency_check CHECK (currency IN ('JOD', 'USD'));

UPDATE public.pricing_items
SET
  region = CASE
    WHEN lower(coalesce(name_ar, '') || ' ' || coalesce(name_en, '') || ' ' || coalesce(label, '') || ' ' || coalesce(price_label_ar, '')) ~ '(عمان|عمّان|amman)' THEN 'amman'
    WHEN lower(coalesce(name_ar, '') || ' ' || coalesce(name_en, '') || ' ' || coalesce(label, '') || ' ' || coalesce(price_label_ar, '')) ~ '(اربد|إربد|irbid)' THEN 'irbid'
    ELSE 'both'
  END,
  price_min = CASE
    WHEN price_text ~ '[0-9]' THEN ((regexp_match(price_text, '([0-9]+(?:\.[0-9]+)?)'))[1])::numeric
    ELSE NULL
  END,
  price_max = CASE
    WHEN price_text ~ '[0-9]+[^0-9]+[0-9]+' THEN ((regexp_match(price_text, '[0-9]+[^0-9]+([0-9]+(?:\.[0-9]+)?)'))[1])::numeric
    ELSE NULL
  END,
  unit_ar = unit_text,
  unit_en = unit_text,
  note_ar = note_text,
  note_en = note_text,
  is_featured = (coalesce(tag_ar, '') <> '' OR coalesce(tag_en, '') <> '');

CREATE INDEX IF NOT EXISTS pricing_items_public_order_idx
  ON public.pricing_items (section, region, sort_order)
  WHERE is_hidden = false AND deleted_at IS NULL;

CREATE TABLE public.pricing_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_item_id uuid NOT NULL REFERENCES public.pricing_items(id) ON DELETE RESTRICT,
  changed_by uuid NOT NULL,
  action text NOT NULL DEFAULT 'update' CHECK (action IN ('create', 'update', 'hide', 'restore')),
  old_values jsonb,
  new_values jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pricing_audit_log TO authenticated;
GRANT ALL ON public.pricing_audit_log TO service_role;
ALTER TABLE public.pricing_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view pricing audit log"
  ON public.pricing_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX pricing_audit_log_item_created_idx
  ON public.pricing_audit_log (pricing_item_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_update_pricing_item(
  _item_id uuid,
  _patch jsonb
)
RETURNS public.pricing_items
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _old public.pricing_items;
  _next public.pricing_items;
  _saved public.pricing_items;
  _allowed_patch jsonb;
  _action text := 'update';
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _old
  FROM public.pricing_items
  WHERE id = _item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pricing item not found' USING ERRCODE = 'P0002';
  END IF;

  _allowed_patch := _patch - ARRAY['id', 'item_key', 'created_at', 'updated_at'];
  SELECT * INTO _next
  FROM jsonb_populate_record(_old, _allowed_patch);

  IF _next.region NOT IN ('irbid', 'amman', 'both') THEN
    RAISE EXCEPTION 'Invalid region';
  END IF;
  IF _next.price_min IS NOT NULL AND _next.price_min < 0 THEN
    RAISE EXCEPTION 'Minimum price cannot be negative';
  END IF;
  IF _next.price_max IS NOT NULL AND _next.price_max < 0 THEN
    RAISE EXCEPTION 'Maximum price cannot be negative';
  END IF;
  IF _next.price_min IS NOT NULL AND _next.price_max IS NOT NULL AND _next.price_max < _next.price_min THEN
    RAISE EXCEPTION 'Maximum price must be greater than or equal to minimum price';
  END IF;

  IF _old.deleted_at IS NULL AND _next.deleted_at IS NOT NULL THEN
    _action := 'hide';
  ELSIF _old.deleted_at IS NOT NULL AND _next.deleted_at IS NULL THEN
    _action := 'restore';
  END IF;

  UPDATE public.pricing_items
  SET
    label = _next.label,
    price_text = _next.price_text,
    unit_text = _next.unit_text,
    note_text = _next.note_text,
    sort_order = _next.sort_order,
    name_ar = _next.name_ar,
    name_en = _next.name_en,
    desc_ar = _next.desc_ar,
    desc_en = _next.desc_en,
    tag_ar = _next.tag_ar,
    tag_en = _next.tag_en,
    price_label_ar = _next.price_label_ar,
    price_label_en = _next.price_label_en,
    section = _next.section,
    is_hidden = _next.is_hidden,
    region = _next.region,
    price_min = _next.price_min,
    price_max = _next.price_max,
    currency = _next.currency,
    unit_ar = _next.unit_ar,
    unit_en = _next.unit_en,
    note_ar = _next.note_ar,
    note_en = _next.note_en,
    is_featured = _next.is_featured,
    deleted_at = _next.deleted_at
  WHERE id = _item_id
  RETURNING * INTO _saved;

  INSERT INTO public.pricing_audit_log (pricing_item_id, changed_by, action, old_values, new_values)
  VALUES (_item_id, auth.uid(), _action, to_jsonb(_old), to_jsonb(_saved));

  RETURN _saved;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_pricing_item(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_pricing_item(uuid, jsonb) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pricing_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pricing_items;
  END IF;
END
$$;