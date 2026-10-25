-- Migration 20261025113036: restrict_direct_place_order_rpc_to_wrappers
-- Public clients must use the validated location/branch wrappers, never the raw order writer.
REVOKE ALL ON FUNCTION public.place_order(uuid, uuid, text, text, public.delivery_type, text, text, public.payment_method, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.place_order(uuid, uuid, text, text, public.delivery_type, text, text, public.payment_method, jsonb, text, text, timestamp with time zone) FROM PUBLIC, anon, authenticated;