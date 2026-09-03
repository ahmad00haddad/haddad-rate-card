ALTER FUNCTION public.admin_update_pricing_item(uuid, jsonb) SECURITY DEFINER;
ALTER FUNCTION public.admin_create_pricing_item(jsonb) SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.admin_update_pricing_item(uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_pricing_item(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_pricing_item(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_pricing_item(jsonb) TO authenticated;