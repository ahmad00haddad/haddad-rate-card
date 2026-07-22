
CREATE TABLE public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view','region_select','service_select')),
  event_value TEXT,
  path TEXT,
  session_id TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_analytics_events_type_created ON public.analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_events_created ON public.analytics_events(created_at DESC);

GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.analytics_events_id_seq TO anon, authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
GRANT ALL ON SEQUENCE public.analytics_events_id_seq TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics"
  ON public.analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type IN ('page_view','region_select','service_select')
    AND (event_value IS NULL OR length(event_value) <= 60)
    AND (path IS NULL OR length(path) <= 200)
    AND (session_id IS NULL OR length(session_id) <= 60)
    AND (referrer IS NULL OR length(referrer) <= 300)
  );

CREATE POLICY "Admins can view analytics"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
