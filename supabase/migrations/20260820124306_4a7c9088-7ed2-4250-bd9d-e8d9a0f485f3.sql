CREATE OR REPLACE FUNCTION public.admin_create_pricing_item(
  _item jsonb
)
RETURNS public.pricing_items
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _created public.pricing_items;
  _region text := coalesce(nullif(_item->>'region', ''), 'both');
  _price_min numeric := nullif(_item->>'price_min', '')::numeric;
  _price_max numeric := nullif(_item->>'price_max', '')::numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF _region NOT IN ('irbid', 'amman', 'both') THEN
    RAISE EXCEPTION 'Invalid region';
  END IF;
  IF _price_min IS NOT NULL AND _price_min < 0 THEN
    RAISE EXCEPTION 'Minimum price cannot be negative';
  END IF;
  IF _price_max IS NOT NULL AND _price_max < 0 THEN
    RAISE EXCEPTION 'Maximum price cannot be negative';
  END IF;
  IF _price_min IS NOT NULL AND _price_max IS NOT NULL AND _price_max < _price_min THEN
    RAISE EXCEPTION 'Maximum price must be greater than or equal to minimum price';
  END IF;

  INSERT INTO public.pricing_items (
    item_key, label, name_ar, name_en, desc_ar, desc_en, tag_ar, tag_en,
    price_label_ar, price_label_en, price_text, unit_text, note_text,
    section, sort_order, is_hidden, region, price_min, price_max, currency,
    unit_ar, unit_en, note_ar, note_en, is_featured
  ) VALUES (
    coalesce(nullif(_item->>'item_key', ''), 'item_' || replace(gen_random_uuid()::text, '-', '')),
    coalesce(_item->>'name_ar', ''),
    coalesce(_item->>'name_ar', ''), coalesce(_item->>'name_en', ''),
    coalesce(_item->>'desc_ar', ''), coalesce(_item->>'desc_en', ''),
    coalesce(_item->>'tag_ar', ''), coalesce(_item->>'tag_en', ''),
    coalesce(_item->>'price_label_ar', ''), coalesce(_item->>'price_label_en', ''),
    coalesce(_item->>'price_text', ''), coalesce(_item->>'unit_ar', ''), coalesce(_item->>'note_ar', ''),
    coalesce(nullif(_item->>'section', ''), 'reels'), coalesce((_item->>'sort_order')::integer, 0),
    coalesce((_item->>'is_hidden')::boolean, false), _region, _price_min, _price_max,
    coalesce(nullif(_item->>'currency', ''), 'JOD'),
    coalesce(_item->>'unit_ar', ''), coalesce(_item->>'unit_en', ''),
    coalesce(_item->>'note_ar', ''), coalesce(_item->>'note_en', ''),
    coalesce((_item->>'is_featured')::boolean, false)
  )
  RETURNING * INTO _created;

  INSERT INTO public.pricing_audit_log (pricing_item_id, changed_by, action, new_values)
  VALUES (_created.id, auth.uid(), 'create', to_jsonb(_created));

  RETURN _created;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_pricing_item(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_pricing_item(jsonb) TO authenticated;