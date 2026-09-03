GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_pricing_item(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_pricing_item(jsonb) TO authenticated;