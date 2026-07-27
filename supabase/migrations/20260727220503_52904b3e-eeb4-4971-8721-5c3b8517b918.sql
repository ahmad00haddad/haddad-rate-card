-- analytics_events: explicit admin-only UPDATE/DELETE (defense in depth)
CREATE POLICY "Admins can update analytics"
  ON public.analytics_events FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete analytics"
  ON public.analytics_events FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- quote_requests: allow public form submissions with input length limits
CREATE POLICY "Anyone can submit quote requests"
  ON public.quote_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(name) BETWEEN 2 AND 120
    AND length(phone) BETWEEN 6 AND 30
    AND (email IS NULL OR length(email) <= 200)
    AND (region IS NULL OR length(region) <= 40)
    AND (service IS NULL OR length(service) <= 160)
    AND (message IS NULL OR length(message) <= 2000)
    AND status = 'new'
  );

GRANT INSERT ON public.quote_requests TO anon;