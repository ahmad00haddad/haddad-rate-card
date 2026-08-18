ALTER TABLE public.pricing_items
  ADD COLUMN IF NOT EXISTS name_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS name_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS desc_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS desc_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tag_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tag_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS price_label_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS price_label_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS pricing_items_item_key_uidx ON public.pricing_items (item_key);